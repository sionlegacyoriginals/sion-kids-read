/**
 * Transactional email via Replit's Resend connector.
 * Sends order confirmation emails when a print order is paid.
 */

import { ReplitConnectors } from "@replit/connectors-sdk";

const FROM = "Sion Legacy Originals <orders@sionlegacyoriginals.com>";

interface EmailAttachment {
  filename: string;
  content: string; // base64-encoded
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: EmailAttachment[],
): Promise<void> {
  // Prefer a directly-set RESEND_API_KEY; fall back to the Replit connector
  const directKey = process.env.RESEND_API_KEY;

  const payload: Record<string, unknown> = { from: FROM, to, subject, html };
  if (attachments?.length) payload.attachments = attachments;

  let response: Response;
  if (directKey) {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${directKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } else {
    try {
      const connectors = new ReplitConnectors();
      response = await connectors.proxy("resend", "/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      console.warn(`Email skipped (no Resend key configured): ${err.message}`);
      return;
    }
  }

  if (!response.ok) {
    const text = await response.text();
    // Log but don't throw — email failure should never block order fulfillment
    console.error(`Resend error ${response.status} sending to ${to}: ${text}`);
    return;
  }

  const data = await response.json();
  console.log(`Email sent to ${to} — id: ${data.id}`);
}

export async function sendOwnerAlert(params: {
  subject: string;
  body: string;
}): Promise<void> {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) {
    console.warn("OWNER_EMAIL not set — skipping owner alert");
    return;
  }
  // Guard against placeholder values that aren't real email addresses
  if (!ownerEmail.includes("@")) {
    console.error(`OWNER_EMAIL ("${ownerEmail}") is not a valid email address — owner alert skipped. Update the OWNER_EMAIL secret to a real address.`);
    return;
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fdf9f6;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf9f6;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#dc2626;padding:24px 40px;text-align:center;">
          <p style="margin:0;color:#fecaca;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Sion Legacy Originals — Admin Alert</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:normal;">⚠️ ${params.subject}</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <div style="color:#374151;font-size:15px;line-height:1.7;white-space:pre-wrap;">${params.body}</div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            Manage orders at <a href="https://sionlegacyoriginals.com/account" style="color:#7c3aed;">sionlegacyoriginals.com/account</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await sendEmail(ownerEmail, `[Sion Legacy] ${params.subject}`, html);
}

export async function sendOwnerPrintPackage(params: {
  orderId: number;
  customerName: string;
  customerEmail: string;
  storyTitle: string;
  amountCents: number;
  shippingAddress: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state_code: string;
    postcode: string;
    country_code: string;
    phone_number?: string;
  };
  interiorPdfBuffer: Buffer;
  coverPdfBuffer: Buffer;
}): Promise<void> {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail?.includes("@")) {
    console.warn("OWNER_EMAIL not set or invalid — skipping owner print package");
    return;
  }

  const { orderId, customerName, customerEmail, storyTitle, amountCents, shippingAddress } = params;
  const addr = shippingAddress;
  const addressLines = [
    addr.name,
    addr.street1,
    addr.street2,
    `${addr.city}, ${addr.state_code} ${addr.postcode}`,
    addr.country_code === "US" ? "United States" : addr.country_code,
    addr.phone_number ? `📞 ${addr.phone_number}` : null,
  ].filter(Boolean).join("<br>");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fdf9f6;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf9f6;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#7c3aed;padding:28px 40px;text-align:center;">
          <p style="margin:0;color:#e9d5ff;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Sion Legacy Originals — New Order</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:normal;">📦 Order #${orderId} — Action Needed</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
            A customer just paid <strong>$${(amountCents / 100).toFixed(2)}</strong> for a printed storybook.
            The interior and cover PDFs are attached to this email. Here's what to do:
          </p>

          <!-- Steps -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border-radius:12px;margin-bottom:28px;">
            <tr><td style="padding:24px 28px;">
              <p style="margin:0 0 12px;color:#7c3aed;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">How to print &amp; ship online</p>
              <ol style="margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:2.0;">
                <li>Open <strong>interior.pdf</strong> from this email — this is the file you upload for printing</li>
                <li>Go to one of these online print services:<br>
                  <span style="font-size:13px;color:#6b7280;">
                    • <a href="https://www.staples.com/services/printing" style="color:#7c3aed;">staples.com</a> → Print &amp; Marketing → Booklets<br>
                    • <a href="https://www.fedex.com/en-us/office.html" style="color:#7c3aed;">fedex.com/office</a> → Online Printing → Booklets<br>
                    • <a href="https://mixam.com/booklets" style="color:#7c3aed;">mixam.com</a> → Booklets (best quality, ships in 2–3 days)
                  </span>
                </li>
                <li>Upload the interior PDF — select <strong>6″ × 9″</strong>, full colour, saddle-stitch (stapled) or perfect-bound</li>
                <li>Enter the customer's shipping address below as the delivery address</li>
                <li>Place the order — they mail it directly to the customer</li>
              </ol>
              <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">💡 Tip: Mixam gives the most book-like result. Staples is fastest if you need same-day. FedEx Office works well for 1-off orders.</p>
            </td></tr>
          </table>

          <!-- Order details -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 12px;color:#6b7280;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Order Details</p>
              <table width="100%" cellpadding="0" cellspacing="4">
                <tr>
                  <td style="color:#6b7280;font-size:14px;width:35%;padding-bottom:8px;">Story</td>
                  <td style="color:#111827;font-size:14px;font-weight:bold;padding-bottom:8px;">${storyTitle}</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:14px;padding-bottom:8px;">Customer</td>
                  <td style="color:#111827;font-size:14px;padding-bottom:8px;">${customerName} (${customerEmail})</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:14px;vertical-align:top;padding-bottom:8px;">Ship to</td>
                  <td style="color:#111827;font-size:14px;line-height:1.6;padding-bottom:8px;">${addressLines}</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:14px;">Amount paid</td>
                  <td style="color:#059669;font-size:14px;font-weight:bold;">$${(amountCents / 100).toFixed(2)}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <p style="margin:0;color:#9ca3af;font-size:12px;">
            Both PDFs are attached. Lulu spec: 6×9 in, full colour, perfect-bound softcover, 60# white paper (pod_package_id: 0600X0900FCSTDPB060UW444MXX).
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const attachments: EmailAttachment[] = [
    { filename: `order-${orderId}-interior.pdf`, content: params.interiorPdfBuffer.toString("base64") },
    { filename: `order-${orderId}-cover.pdf`,    content: params.coverPdfBuffer.toString("base64") },
  ];

  await sendEmail(ownerEmail, `[Order #${orderId}] New print order — "${storyTitle}" → ${addr.name}`, html, attachments);
}

export async function sendPrintOrderConfirmation(params: {
  customerEmail: string;
  customerName: string;
  storyTitle: string;
  childName: string;
  shippingAddress: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state_code: string;
    postcode: string;
    country_code: string;
  };
  orderId: number;
}): Promise<void> {
  const { customerEmail, customerName, storyTitle, childName, shippingAddress, orderId } = params;

  const addressLines = [
    shippingAddress.name,
    shippingAddress.street1,
    shippingAddress.street2,
    `${shippingAddress.city}, ${shippingAddress.state_code} ${shippingAddress.postcode}`,
    shippingAddress.country_code === "US" ? "United States" : shippingAddress.country_code,
  ].filter(Boolean).join("<br>");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fdf9f6;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf9f6;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:#7c3aed;padding:32px 40px;text-align:center;">
          <p style="margin:0;color:#e9d5ff;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Sion Legacy Originals</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:26px;font-weight:normal;">Your book is on its way! 🎉</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.6;">
            Hi ${customerName.split(" ")[0]},
          </p>
          <p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.6;">
            We've received your order for <strong>"${storyTitle}"</strong> — a personalised storybook made just for <strong>${childName}</strong>. It's heading to the printer now and will ship within 3–5 business days.
          </p>

          <!-- Order box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border-radius:12px;margin-bottom:28px;">
            <tr><td style="padding:24px 28px;">
              <p style="margin:0 0 12px;color:#7c3aed;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Order #${orderId}</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#6b7280;font-size:14px;padding-bottom:8px;width:40%;">Story</td>
                  <td style="color:#111827;font-size:14px;padding-bottom:8px;font-weight:bold;">${storyTitle}</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:14px;padding-bottom:8px;">Made for</td>
                  <td style="color:#111827;font-size:14px;padding-bottom:8px;">${childName}</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:14px;vertical-align:top;">Shipping to</td>
                  <td style="color:#111827;font-size:14px;line-height:1.6;">${addressLines}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;color:#374151;font-size:15px;line-height:1.6;">
            Once your book is on its way, we'll be in touch with shipping details.
          </p>
          <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.6;">
            Thank you for preserving this story. 💜
          </p>
          <p style="margin:0;color:#374151;font-size:15px;">— The Sion Legacy Originals team</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            Questions? Reply to this email or visit <a href="https://sionlegacyoriginals.com" style="color:#7c3aed;">sionlegacyoriginals.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await sendEmail(customerEmail, `Your storybook "${storyTitle}" is being printed! 📖`, html);
}
