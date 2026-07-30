/**
 * Update Sion Legacy Originals story prices in Stripe.
 *   Single Story:        $1.00 → $5.55
 *   StoryBloom Membership: $3.33/mo → $8.88/mo
 *
 * Archives the old active price and creates a new one.
 * The checkout route looks up the active price dynamically, so
 * it will pick up the new price automatically.
 *
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/update-prices.ts
 */
import { getUncachableStripeClient } from "../lib/stripeClient";

async function updateProductPrice(
  stripe: Awaited<ReturnType<typeof getUncachableStripeClient>>,
  productName: string,
  newAmount: number,
  recurring?: { interval: "month" | "year" },
) {
  // Find the product
  const products = await stripe.products.search({
    query: `name:'${productName}' AND active:'true'`,
  });
  if (products.data.length === 0) {
    console.log(`⚠  Product not found: ${productName} — skipping`);
    return;
  }
  const product = products.data[0];

  // Find all active prices
  const prices = await stripe.prices.list({ product: product.id, active: true });

  // Archive any active prices that don't match the new amount
  for (const price of prices.data) {
    if (price.unit_amount !== newAmount) {
      await stripe.prices.update(price.id, { active: false });
      console.log(`  Archived old price ${price.id} ($${(price.unit_amount! / 100).toFixed(2)})`);
    } else {
      console.log(`  Price already correct at $${(price.unit_amount! / 100).toFixed(2)} — no change needed`);
      return;
    }
  }

  // Create the new price
  const newPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: newAmount,
    currency: "usd",
    ...(recurring ? { recurring } : {}),
  });
  console.log(`✓ ${productName}: new price ${newPrice.id} ($${(newAmount / 100).toFixed(2)}${recurring ? `/${recurring.interval}` : ""})`);
}

async function main() {
  const stripe = await getUncachableStripeClient();
  console.log("Updating Sion Legacy Originals prices in Stripe…\n");

  await updateProductPrice(stripe, "Single Story", 555);                              // $5.55 one-time
  await updateProductPrice(stripe, "StoryBloom Membership", 888, { interval: "month" }); // $8.88/month

  console.log("\nDone. The checkout route will use the new active prices automatically.");
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
