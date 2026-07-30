/**
 * Updates the "Gift Card – One Story" Stripe product price from $5.55 → $1.00
 * and updates the payment link to use the new price.
 *
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/update-one-story-gift-price.ts
 */
import { getUncachableStripeClient } from "../lib/stripeClient";

async function main() {
  const stripe = await getUncachableStripeClient();

  // Find the product by name
  const products = await stripe.products.search({ query: 'name:"Gift Card – One Story"' });
  const product = products.data[0];
  if (!product) throw new Error("Product 'Gift Card – One Story' not found");
  console.log(`Found product: ${product.id} — ${product.name}`);

  // Create new $1.00 price
  const newPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 100, // $1.00
    currency: "usd",
  });
  console.log(`Created new price: ${newPrice.id} ($1.00)`);

  // Set it as the default price on the product
  await stripe.products.update(product.id, { default_price: newPrice.id });
  console.log(`Set as default price on product`);

  // Find the payment link that uses this product and update it
  const links = await stripe.paymentLinks.list({ active: true, limit: 100 });
  for (const link of links.data) {
    const full = await stripe.paymentLinks.retrieve(link.id, {
      expand: ["line_items.data.price.product"],
    });
    const lineItems = (full as any).line_items?.data ?? [];
    const productName: string = (lineItems[0]?.price as any)?.product?.name ?? "";
    if (productName !== "Gift Card – One Story") continue;

    // Payment links can't have their line items updated — must create a new one
    const newLink = await stripe.paymentLinks.create({
      line_items: [{ price: newPrice.id, quantity: 1 }],
      after_completion: {
        type: "redirect",
        redirect: {
          url: "https://sionlegacyoriginals.com/gift-card/success?session_id={CHECKOUT_SESSION_ID}",
        },
      },
    });

    // Archive the old link
    await stripe.paymentLinks.update(link.id, { active: false });

    console.log(`\nOld payment link archived: ${link.url}`);
    console.log(`New payment link created:  ${newLink.url}`);
    console.log(`\n⚠️  Update landing.tsx with the new URL: ${newLink.url}`);
    break;
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
