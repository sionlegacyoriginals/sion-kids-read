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
import { ObjectStorageService } from "./objectStorage";
import { generateStoryPdfs } from "./pdfService";

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

  // 3. Upload PDFs to object storage
  const objectStorage = new ObjectStorageService();

  async function uploadPdf(buffer: Buffer): Promise<string> {
    const presignedUrl = await objectStorage.getObjectEntityUploadURL();
    const objectPath = objectStorage.normalizeObjectEntityPath(presignedUrl);
    const resp = await fetch(presignedUrl, {
      method: "PUT",
      // @ts-ignore Node Buffer accepted as BodyInit
      body: buffer,
      headers: { "Content-Type": "application/pdf" },
    });
    if (!resp.ok) throw new Error(`PDF upload failed: ${resp.status}`);
    return `https://${domain}/api/storage${objectPath}`;
  }

  const [interiorUrl, coverUrl] = await Promise.all([
    uploadPdf(interiorPdfBuffer),
    uploadPdf(coverPdfBuffer),
  ]);

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

  console.log(`Order ${orderId} submitted to Lulu as job ${luluJob.id}`);
}
