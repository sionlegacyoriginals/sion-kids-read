/**
 * Update the "Single Story" Stripe price from $1.00 → $1.11 (111 cents).
 * Also updates the "One Story" gift card Payment Link to use the new price.
 * Run once: pnpm --filter @workspace/api-server tsx src/scripts/update-story-price-111.ts
 */
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-06-30.basil" as any });
const NEW_AMOUNT = 111; // $1.11

async function updatePrice(productName: string, newAmount: number) {
  const products = await stripe.products.search({ query: `name:'${productName}' AND active:'true'` });
  const product = products.data[0];
  if (!product) throw new Error(`Product not found: ${productName}`);

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
  if (prices.data.some(p => p.unit_amount === newAmount)) {
    console.log(`✓ ${productName}: already $${(newAmount / 100).toFixed(2)} — no change`);
    return prices.data.find(p => p.unit_amount === newAmount)!;
  }

  // Create the new price first, then set it as default, then archive the old ones
  const newPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: newAmount,
    currency: "usd",
  });
  console.log(`  Created new price ${newPrice.id} ($${(newAmount / 100).toFixed(2)})`);

  await stripe.products.update(product.id, { default_price: newPrice.id });
  console.log(`  Set as default price on product`);

  for (const p of prices.data) {
    await stripe.prices.update(p.id, { active: false });
    console.log(`  Archived old price ${p.id} ($${(p.unit_amount! / 100).toFixed(2)})`);
  }

  console.log(`✓ ${productName}: price updated to $${(newAmount / 100).toFixed(2)}`);
  return newPrice;
}

async function updateGiftCardLink(newPriceId: string) {
  const links = await stripe.paymentLinks.list({ active: true, limit: 100 });
  for (const link of links.data) {
    const items = await stripe.paymentLinks.listLineItems(link.id);
    const price = items.data[0]?.price;
    if (price && (price as any).unit_amount === 100) {
      // This is the $1 "One Story" gift card link — update it
      const updated = await stripe.paymentLinks.update(link.id, {
        line_items: [{ id: items.data[0].id, price: newPriceId, quantity: 1 }],
      });
      console.log(`✓ Updated gift card Payment Link ${updated.url} to new price`);
      return;
    }
  }
  console.log("  No $1.00 gift card Payment Link found to update (may already be updated)");
}

(async () => {
  try {
    const newPrice = await updatePrice("Single Story", NEW_AMOUNT);
    await updateGiftCardLink(newPrice.id);
    console.log("\nDone. Stripe now charges $1.11 for a single story.");
  } catch (err: any) {
    console.error("Error:", err.message);
    process.exit(1);
  }
})();
