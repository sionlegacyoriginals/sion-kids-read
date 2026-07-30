/**
 * Add 6-month ($44.44) and yearly ($77.77) recurring prices to "StoryBloom Membership".
 * Run once: pnpm --filter @workspace/api-server tsx src/scripts/add-multi-period-prices.ts
 */
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-06-30.basil" as any });

async function ensurePrice(productId: string, amount: number, intervalCount: number) {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const existing = prices.data.find(
    p => p.unit_amount === amount && p.recurring?.interval === "month" && p.recurring?.interval_count === intervalCount
  );
  if (existing) {
    console.log(`✓ Price already exists: $${(amount / 100).toFixed(2)} every ${intervalCount}mo → ${existing.id}`);
    return existing;
  }
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: amount,
    currency: "usd",
    recurring: { interval: "month", interval_count: intervalCount },
  });
  console.log(`✓ Created: $${(amount / 100).toFixed(2)} every ${intervalCount}mo → ${price.id}`);
  return price;
}

(async () => {
  const products = await stripe.products.search({ query: "name:'StoryBloom Membership' AND active:'true'" });
  const product = products.data[0];
  if (!product) throw new Error("StoryBloom Membership product not found");
  console.log("Product:", product.id, product.name);

  await ensurePrice(product.id, 888,  1);   // $8.88/mo
  await ensurePrice(product.id, 4444, 6);   // $44.44 every 6 months
  await ensurePrice(product.id, 7777, 12);  // $77.77 every 12 months
  console.log("\nDone.");
})();
