/**
 * Renames the Stripe product "Gift Card – Hardcover Book" → "Gift Card – Printed Book"
 *
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/rename-printed-book-product.ts
 */
import { getUncachableStripeClient } from "../lib/stripeClient";

async function main() {
  const stripe = await getUncachableStripeClient();
  const results = await stripe.products.search({ query: 'name:"Gift Card – Hardcover Book"' });
  const product = results.data[0];
  if (!product) { console.log("Product not found — may already be renamed."); return; }
  await stripe.products.update(product.id, { name: "Gift Card – Printed Book" });
  console.log(`✓ Renamed to "Gift Card – Printed Book" (${product.id})`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
