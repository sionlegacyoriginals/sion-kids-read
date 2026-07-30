/**
 * 1. Updates "Printed Storybook" price from $25 → $33.33
 * 2. Creates "Gift Card – Hardcover Book" product + $33.33 price + Payment Link
 *
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/setup-hardcover-gift-card.ts
 */
import { getUncachableStripeClient } from "../lib/stripeClient";

const SUCCESS_URL =
  "https://sionlegacyoriginals.com/gift-card/success?session_id={CHECKOUT_SESSION_ID}";

async function main() {
  const stripe = await getUncachableStripeClient();

  // ── 1. Update Printed Storybook price $25 → $33.33 ────────────────────────
  const books = await stripe.products.search({ query: 'name:"Printed Storybook" AND active:"true"' });
  const bookProduct = books.data[0];
  if (bookProduct) {
    const oldPrices = await stripe.prices.list({ product: bookProduct.id, active: true, limit: 10 });
    for (const p of oldPrices.data) {
      await stripe.prices.update(p.id, { active: false });
      console.log(`Archived old Printed Storybook price: $${(p.unit_amount! / 100).toFixed(2)}`);
    }
    const newBookPrice = await stripe.prices.create({
      product: bookProduct.id,
      unit_amount: 3333,
      currency: "usd",
    });
    await stripe.products.update(bookProduct.id, { default_price: newBookPrice.id });
    console.log(`✓ Printed Storybook updated to $33.33 (${newBookPrice.id})`);
  } else {
    console.log("⚠ Printed Storybook product not found — skipping price update");
  }

  // ── 2. Create Gift Card – Hardcover Book product ───────────────────────────
  const existing = await stripe.products.search({ query: 'name:"Gift Card – Hardcover Book"' });
  let gcProduct = existing.data[0];
  if (!gcProduct) {
    gcProduct = await stripe.products.create({
      name: "Gift Card – Hardcover Book",
      description: "Give the gift of a printed & shipped personalized storybook.",
    });
    console.log(`✓ Created product: ${gcProduct.id}`);
  } else {
    console.log(`Product already exists: ${gcProduct.id}`);
  }

  // ── 3. Create $33.33 price ─────────────────────────────────────────────────
  const gcPrice = await stripe.prices.create({
    product: gcProduct.id,
    unit_amount: 3333,
    currency: "usd",
  });
  await stripe.products.update(gcProduct.id, { default_price: gcPrice.id });
  console.log(`✓ Created gift card price: ${gcPrice.id} ($33.33)`);

  // ── 4. Create Payment Link ─────────────────────────────────────────────────
  const link = await stripe.paymentLinks.create({
    line_items: [{ price: gcPrice.id, quantity: 1 }],
    after_completion: {
      type: "redirect",
      redirect: { url: SUCCESS_URL },
    },
  });
  console.log(`\n✓ Payment Link: ${link.url}`);
  console.log(`\n⚠  Add this URL to gift-cards.tsx and landing.tsx:\n   ${link.url}`);
}

main().catch((err) => { console.error("Failed:", err.message); process.exit(1); });
