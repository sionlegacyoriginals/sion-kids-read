/**
 * Transactional email via Replit's Resend connector.
 * Sends order confirmation emails when a print order is paid.
 */

import { ReplitConnectors } from "@replit/connectors-sdk";

const FROM = "Sion Legacy Originals <orders@sionlegacyoriginals.com>";

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const connectors = new ReplitConnectors();
  const response = await connectors.proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend error ${response.status}: ${text}`);
  }

  const data = await response.json();
  console.log(`Email sent to ${to} — id: ${data.id}`);
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
            Once your book ships, Lulu Direct will send you a separate email with tracking information.
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
