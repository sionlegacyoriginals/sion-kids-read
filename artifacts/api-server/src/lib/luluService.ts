/**
 * Lulu Direct API integration for print-on-demand fulfillment.
 *
 * To enable, set the following environment secrets:
 *   LULU_CLIENT_KEY    — API key from https://www.lulu.com/account/api-config
 *   LULU_CLIENT_SECRET — API secret from the same page
 *
 * The pod_package_id below targets a 6"×9" full-color perfect-bound softcover
 * with standard white paper. Browse all options at:
 *   https://developers.lulu.com/pod-packages
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { storeTempPdf, deleteTempPdf } from "./tempPdfStore";
import { generateStoryPdfs } from "./pdfService";
import { sendOwnerAlert } from "./mailerService";

const LULU_API_BASE = "https://api.lulu.com";
const LULU_TOKEN_URL = `${LULU_API_BASE}/auth/realms/glasstree/protocol/openid-connect/token`;

// 6"×9" full-color perfect-bound softcover, standard 60# white paper
export const DEFAULT_POD_PACKAGE_ID = "0600X0900FCSTDPB060UW444MXX";

async function getLuluAccessToken(): Promise<string> {
  const clientKey = process.env.LULU_CLIENT_KEY;
  const clientSecret = process.env.LULU_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    throw new Error("LULU_CLIENT_KEY and LULU_CLIENT_SECRET must be set in environment secrets");
  }

  const resp = await fetch(LULU_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientKey,
      client_secret: clientSecret,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Lulu authentication failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  return data.access_token as string;
}

export interface LuluShippingAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state_code: string;
  postcode: string;
  country_code: string;
  phone_number?: string;
}

export async function createLuluPrintJob(params: {
  externalId: string;
  contactEmail: string;
  title: string;
  coverPdfUrl: string;
  interiorPdfUrl: string;
  podPackageId: string;
  quantity: number;
  shippingAddress: LuluShippingAddress;
  shippingLevel?: string;
}): Promise<{ id: string; status: { name: string } }> {
  const token = await getLuluAccessToken();

  const resp = await fetch(`${LULU_API_BASE}/print-jobs/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contact_email: params.contactEmail,
      external_id: params.externalId,
      line_items: [
        {
          title: params.title,
          cover: { source_url: params.coverPdfUrl },
          interior: { source_url: params.interiorPdfUrl },
          pod_package_id: params.podPackageId,
          quantity: params.quantity,
        },
      ],
      shipping_address: params.shippingAddress,
      shipping_level: params.shippingLevel ?? "MAIL",
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Lulu print job creation failed: ${resp.status} ${text}`);
  }

  return resp.json();
}

export async function getLuluJobStatus(
  jobId: string,
): Promise<{ id: string; status: { name: string } }> {
  const token = await getLuluAccessToken();
  const resp = await fetch(`${LULU_API_BASE}/print-jobs/${jobId}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`Failed to get Lulu job status: ${resp.status}`);
  return resp.json();
}

/**
 * Full fulfillment pipeline for a paid print order:
 *  1. Fetch order + story data
 *  2. Generate interior + cover PDFs with pdfkit
 *  3. Upload PDFs to object storage (public URL)
 *  4. Submit print job to Lulu
 *  5. Update order status in DB
 */
export async function triggerLuluOrder(orderId: number): Promise<void> {
  try {
    await _triggerLuluOrder(orderId);
  } catch (err: any) {
    // Alert the owner immediately on any submission failure
    sendOwnerAlert({
      subject: `Print order #${orderId} failed to submit`,
      body: `Order #${orderId} could not be sent to Lulu.\n\nError: ${err.message}\n\nPlease check the order and retrigger it from the account page or admin endpoint.`,
    }).catch(() => {}); // fire-and-forget, don't mask original error
    throw err;
  }
}

async function _triggerLuluOrder(orderId: number): Promise<void> {
  // 1. Fetch order + story
  const result = await db.execute(sql`
    SELECT po.*, s.title, s.content, s.cover_image_url, s.child_name, s.child_age
    FROM print_orders po
    JOIN stories s ON s.id = po.story_id
    WHERE po.id = ${orderId}
  `);

  const order = result.rows[0];
  if (!order) throw new Error(`Order ${orderId} not found`);
  if (order.status !== "paid") throw new Error(`Order ${orderId} is not paid`);

  // Resolve public cover image URL for PDF generation
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  // ref-photos are served at /api/ref-photos/:id, NOT /api/storage/ref-photos/:id
  const rawCoverPath = order.cover_image_url as string | null;
  const coverImageUrl = rawCoverPath
    ? rawCoverPath.startsWith("/ref-photos/")
      ? `https://${domain}/api${rawCoverPath}`
      : `https://${domain}/api/storage${rawCoverPath}`
    : null;

  // 2. Generate PDFs
  const { interiorPdfBuffer, coverPdfBuffer } = await generateStoryPdfs({
    title: order.title as string,
    content: order.content as string,
    childName: order.child_name as string,
    childAge: order.child_age as number,
    coverImageUrl,
  });

  // 3. Host PDFs temporarily from this server so Lulu can fetch them
  const interiorId = storeTempPdf(interiorPdfBuffer);
  const coverPdfId  = storeTempPdf(coverPdfBuffer);
  const interiorUrl = `https://${domain}/api/print-files/${interiorId}`;
  const coverUrl    = `https://${domain}/api/print-files/${coverPdfId}`;

  // 4. Submit to Lulu
  const shippingAddress =
    typeof order.shipping_address === "string"
      ? JSON.parse(order.shipping_address as string)
      : order.shipping_address;

  const luluJob = await createLuluPrintJob({
    externalId: `order_${orderId}`,
    contactEmail: order.customer_email as string,  // Lulu uses this for shipping notifications → must be the customer's email
    title: order.title as string,
    coverPdfUrl: coverUrl,
    interiorPdfUrl: interiorUrl,
    podPackageId: DEFAULT_POD_PACKAGE_ID,
    quantity: (order.quantity as number) ?? 1,
    shippingAddress,
  });

  // 5. Update order
  await db.execute(sql`
    UPDATE print_orders
    SET lulu_job_id = ${luluJob.id},
        status      = 'sent_to_lulu',
        updated_at  = NOW()
    WHERE id = ${orderId}
  `);

  // NOTE: do NOT delete tempPdf entries here — Lulu fetches the PDFs
  // asynchronously after the print job is created. The route handler deletes
  // on first fetch; TTL cleanup handles anything Lulu never fetches.
  console.log(`Order ${orderId} submitted to Lulu as job ${luluJob.id}`);
}

/**
 * Background poller — runs every 30 minutes.
 * Checks all orders stuck in 'sent_to_lulu' and alerts the owner if Lulu
 * has rejected any of them, updating the DB status so it shows in the UI.
 */
export function startLuluStatusPoller(): void {
  const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

  async function poll() {
    try {
      const result = await db.execute(sql`
        SELECT po.id, po.lulu_job_id, po.customer_name, po.customer_email,
               s.title AS story_title
        FROM   print_orders po
        JOIN   stories s ON s.id = po.story_id
        WHERE  po.status = 'sent_to_lulu'
          AND  po.lulu_job_id IS NOT NULL
      `);

      if (result.rows.length === 0) return;

      const token = await getLuluAccessToken().catch(() => null);
      if (!token) return;

      for (const order of result.rows) {
        try {
          const resp = await fetch(`${LULU_API_BASE}/print-jobs/${order.lulu_job_id}/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!resp.ok) continue;

          const job = await resp.json();
          const statusName: string = job.status?.name ?? "";

          if (statusName === "REJECTED") {
            const messages = JSON.stringify(job.line_items?.[0]?.status?.messages ?? {}, null, 2);

            // Update DB so it's visible in the UI
            await db.execute(sql`
              UPDATE print_orders
              SET status = 'lulu_rejected', updated_at = NOW()
              WHERE id = ${order.id}
            `);

            // Alert owner
            await sendOwnerAlert({
              subject: `Order #${order.id} was rejected by Lulu — needs attention`,
              body: `Order #${order.id} for "${order.story_title}" (${order.customer_name}) was rejected by Lulu.\n\nLulu Job ID: ${order.lulu_job_id}\n\nReason:\n${messages}\n\nRetrigger this order from the account page or the admin endpoint once the issue is resolved.`,
            });

            console.warn(`Order ${order.id} (Lulu job ${order.lulu_job_id}) REJECTED — owner alerted`);
          } else if (statusName === "IN_PRODUCTION" || statusName === "SHIPPED") {
            // Keep status in sync
            const newStatus = statusName === "SHIPPED" ? "shipped" : "in_production";
            await db.execute(sql`
              UPDATE print_orders SET status = ${newStatus}, updated_at = NOW() WHERE id = ${order.id}
            `);
          }
        } catch {
          // Skip individual order errors — don't break the whole poll loop
        }
      }
    } catch (err: any) {
      console.error("Lulu status poller error:", err.message);
    }
  }

  // Run once at startup after a short delay, then every 30 minutes
  setTimeout(() => {
    poll();
    setInterval(poll, INTERVAL_MS);
  }, 60_000); // wait 1 min after startup before first check

  console.log("Lulu status poller started (30-min interval)");
}
