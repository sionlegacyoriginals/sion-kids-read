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

export async function sendParentStoryPublished(params: {
  parentEmail: string;
  parentName: string;
  studentName: string;
  studentAvatar: string;
  storyTitle: string;
  storyContent: string;
  pointsAwarded: number;
  classPortalUrl: string;
}): Promise<void> {
  const { parentEmail, parentName, studentName, studentAvatar, storyTitle, storyContent, pointsAwarded, classPortalUrl } = params;
  const preview = storyContent.slice(0, 300) + (storyContent.length > 300 ? "…" : "");
  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fdf9f6;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf9f6;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#7c3aed;padding:28px 40px;text-align:center;">
          <p style="margin:0;color:#e9d5ff;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Sion Legacy Originals — Classroom</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:normal;">${studentAvatar} ${studentName} wrote a story!</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">Hi ${parentName.split(" ")[0]},</p>
          <p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.6;">
            Great news — <strong>${studentName}</strong>'s story has been approved by their teacher and is now published to the class library!
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border-radius:12px;margin-bottom:24px;">
            <tr><td style="padding:24px 28px;">
              <p style="margin:0 0 8px;color:#7c3aed;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">📖 ${storyTitle}</p>
              <p style="margin:0;color:#374151;font-size:14px;line-height:1.8;">${preview}</p>
            </td></tr>
          </table>
          ${pointsAwarded > 0 ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;margin-bottom:24px;"><tr><td style="padding:16px 20px;"><p style="margin:0;color:#92400e;font-size:15px;">⭐ <strong>${studentName} earned ${pointsAwarded} point${pointsAwarded !== 1 ? "s" : ""}</strong> for this story!</p></td></tr></table>` : ""}
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 24px;">
            <a href="${classPortalUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;border-radius:50px;padding:14px 36px;">Read the full story →</a>
          </td></tr></table>
          <p style="margin:0;color:#374151;font-size:15px;">— The Sion Legacy Originals team</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">View your parent dashboard at <a href="${classPortalUrl}" style="color:#7c3aed;">sionlegacyoriginals.com/parent</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  await sendEmail(parentEmail, `📖 ${studentName} just published a story!`, html);
}

export async function sendParentAnnouncement(params: {
  parentEmail: string;
  parentName: string;
  studentName: string;
  className: string;
  message?: string;
  valueOfWeek?: string;
  sightWords?: string[];
  dueDate?: string;
  classPortalUrl: string;
}): Promise<void> {
  const { parentEmail, parentName, studentName, className, message, valueOfWeek, sightWords, dueDate, classPortalUrl } = params;
  const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : null;
  const sightWordPills = (sightWords ?? []).map(w => `<span style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:12px;font-weight:bold;border-radius:6px;padding:3px 10px;margin:2px 3px;">${w}</span>`).join("");
  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fdf9f6;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf9f6;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#f5a224;padding:28px 40px;text-align:center;">
          <p style="margin:0;color:#fffbeb;font-size:12px;letter-spacing:1px;text-transform:uppercase;">📣 ${className} — Weekly Update</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:normal;">This Week's Classroom News</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.6;">Hi ${parentName.split(" ")[0]}, here's what's happening in <strong>${studentName}</strong>'s class this week:</p>
          ${message ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;margin-bottom:20px;"><tr><td style="padding:18px 22px;"><p style="margin:0;color:#374151;font-size:15px;line-height:1.7;">${message}</p></td></tr></table>` : ""}
          ${valueOfWeek ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;margin-bottom:20px;"><tr><td style="padding:16px 22px;"><p style="margin:0;color:#92400e;font-size:14px;"><strong>✨ Value of the Week:</strong> ${valueOfWeek}</p></td></tr></table>` : ""}
          ${sightWords?.length ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border-radius:10px;margin-bottom:20px;"><tr><td style="padding:16px 22px;"><p style="margin:0 0 10px;color:#7c3aed;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">🔤 Sight Words</p><div>${sightWordPills}</div></td></tr></table>` : ""}
          ${dueDateStr ? `<p style="margin:0 0 24px;color:#6b7280;font-size:14px;">📅 <strong>Due:</strong> ${dueDateStr}</p>` : ""}
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 24px;">
            <a href="${classPortalUrl}" style="display:inline-block;background:#f5a224;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;border-radius:50px;padding:14px 36px;">View Parent Dashboard →</a>
          </td></tr></table>
          <p style="margin:0;color:#374151;font-size:15px;">— The Sion Legacy Originals team</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">Manage your parent account at <a href="${classPortalUrl}" style="color:#7c3aed;">sionlegacyoriginals.com/parent</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  await sendEmail(parentEmail, `📣 Weekly update for ${studentName}'s class`, html);
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
  combinedPdfBuffer?: Buffer;
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

  const plainAddr = [
    addr.name,
    addr.street1,
    addr.street2,
    `${addr.city}, ${addr.state_code} ${addr.postcode}`,
    addr.country_code === "US" ? "United States" : addr.country_code,
    addr.phone_number ?? "",
  ].filter(Boolean).join("\n");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fdf9f6;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf9f6;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:#7c3aed;padding:28px 40px;text-align:center;">
          <p style="margin:0;color:#e9d5ff;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Sion Legacy Originals — New Order</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:26px;font-weight:normal;">📦 Order #${orderId} — Print &amp; Ship</h1>
          <p style="margin:8px 0 0;color:#e9d5ff;font-size:14px;">${storyTitle}</p>
        </td></tr>

        <tr><td style="padding:32px 40px;">

          <!-- Payment summary -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:10px;margin-bottom:24px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0;color:#059669;font-size:15px;">
                ✅ <strong>$${(amountCents / 100).toFixed(2)} received</strong> from ${customerName}
                <span style="color:#6b7280;font-size:13px;">(${customerEmail})</span>
              </p>
            </td></tr>
          </table>

          <!-- Lulu steps -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border-radius:12px;margin-bottom:24px;">
            <tr><td style="padding:24px 28px;">
              <p style="margin:0 0 14px;color:#7c3aed;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">
                How to print on Lulu.com
              </p>
              <ol style="margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:2.2;">
                <li>Go to <a href="https://www.lulu.com/create/books" style="color:#7c3aed;font-weight:bold;">lulu.com/create/books</a> and start a new print book</li>
                <li>Size: <strong>6″ × 9″</strong> &nbsp;·&nbsp; Binding: <strong>Perfect Bound</strong> &nbsp;·&nbsp; Color: <strong>Full Colour</strong> &nbsp;·&nbsp; Paper: <strong>60# white</strong></li>
                <li>Upload <strong>order-${orderId}-interior.pdf</strong> as the interior</li>
                <li>Upload <strong>order-${orderId}-cover.pdf</strong> as the cover</li>
                <li>Quantity: <strong>1</strong></li>
                <li>Ship to the address below — enter it as the shipping address at checkout</li>
              </ol>
              <p style="margin:14px 0 0;font-size:12px;color:#9ca3af;">
                Lulu pod spec for reference: <code>0600X0900FCSTDPB060UW444MXX</code>
              </p>
            </td></tr>
          </table>

          <!-- Ship-to address — large and easy to copy -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #7c3aed;border-radius:12px;margin-bottom:24px;">
            <tr><td style="background:#7c3aed;padding:10px 20px;">
              <p style="margin:0;color:#ffffff;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">📬 Ship To — copy this into Lulu checkout</p>
            </td></tr>
            <tr><td style="padding:20px 24px;">
              <pre style="margin:0;font-family:'Georgia',serif;font-size:16px;line-height:1.8;color:#111827;white-space:pre-wrap;">${plainAddr}</pre>
            </td></tr>
          </table>

          <!-- Attachments reminder -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;">
            <tr><td style="padding:18px 22px;">
              <p style="margin:0 0 10px;color:#6b7280;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Attached PDFs</p>
              <p style="margin:0;color:#374151;font-size:14px;line-height:1.8;">
                📄 <strong>order-${orderId}-interior.pdf</strong> — upload to Lulu as the interior<br>
                🖼 <strong>order-${orderId}-cover.pdf</strong> — upload to Lulu as the cover${params.combinedPdfBuffer ? `<br>📋 <strong>order-${orderId}-print-shop.pdf</strong> — single combined file (Staples / FedEx Office backup)` : ""}
              </p>
            </td></tr>
          </table>

        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const attachments: EmailAttachment[] = [];
  // Combined single-file PDF (for Staples / FedEx Office / Mixam upload) — attach first so it's prominent
  if (params.combinedPdfBuffer) {
    attachments.push({ filename: `order-${orderId}-print-shop.pdf`, content: params.combinedPdfBuffer.toString("base64") });
  }
  // Separate interior + cover (for Lulu / advanced use)
  attachments.push({ filename: `order-${orderId}-interior.pdf`, content: params.interiorPdfBuffer.toString("base64") });
  attachments.push({ filename: `order-${orderId}-cover.pdf`,    content: params.coverPdfBuffer.toString("base64") });

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
