/**
 * Update Stripe Payment Links for gift cards to redirect buyers to the
 * success page after checkout, where they can see and copy their code.
 *
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/update-gift-card-links.ts
 */
import { getUncachableStripeClient } from "../lib/stripeClient";

const SUCCESS_URL =
  "https://sionlegacyoriginals.com/gift-card/success?session_id={CHECKOUT_SESSION_ID}";

const GIFT_CARD_NAMES = [
  "Gift Card – One Story",
  "Gift Card – One Month",
  "Gift Card – Six Months",
  "Gift Card – Twelve Months",
];

async function main() {
  const stripe = await getUncachableStripeClient();
  console.log("Updating gift card payment links to redirect to success page…\n");

  // Collect all active payment links (paginate if needed)
  const links = await stripe.paymentLinks.list({ active: true, limit: 100 });

  for (const link of links.data) {
    // Expand line items to check product name
    const full = await stripe.paymentLinks.retrieve(link.id, {
      expand: ["line_items.data.price.product"],
    });
    const lineItems = (full as any).line_items?.data ?? [];
    const productName: string = (lineItems[0]?.price as any)?.product?.name ?? "";

    if (!GIFT_CARD_NAMES.includes(productName)) continue;

    await stripe.paymentLinks.update(link.id, {
      after_completion: {
        type: "redirect",
        redirect: { url: SUCCESS_URL },
      },
    });
    console.log(`✓ Updated: ${productName}  →  ${link.url}`);
  }

  console.log("\nDone. Buyers will now be redirected to the success page after purchase.");
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
