/**
 * Updates the "Single Story" Stripe product price from $5.55 → $1.00
 *
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/update-single-story-price.ts
 */
import { getUncachableStripeClient } from "../lib/stripeClient";

async function main() {
  const stripe = await getUncachableStripeClient();

  const products = await stripe.products.search({ query: 'name:"Single Story" AND active:"true"' });
  const product = products.data[0];
  if (!product) throw new Error("Product 'Single Story' not found");
  console.log(`Found product: ${product.id} — ${product.name}`);

  // Archive existing active prices
  const existing = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
  for (const p of existing.data) {
    await stripe.prices.update(p.id, { active: false });
    console.log(`Archived old price: ${p.id} ($${(p.unit_amount! / 100).toFixed(2)})`);
  }

  // Create new $1.00 price
  const newPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 100,
    currency: "usd",
  });
  await stripe.products.update(product.id, { default_price: newPrice.id });
  console.log(`Created new price: ${newPrice.id} ($1.00) — set as default`);
  console.log("\nDone. Single Story is now $1.00 in Stripe.");
}

main().catch((err) => { console.error("Failed:", err.message); process.exit(1); });
