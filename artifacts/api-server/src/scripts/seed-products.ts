/**
 * Seed Stripe products for StoryBloom.
 * Run once (idempotent):
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/seed-products.ts
 */
import { getUncachableStripeClient } from "../lib/stripeClient";

async function seed() {
  const stripe = await getUncachableStripeClient();
  console.log("Seeding Stripe products...");

  // ── 1. StoryBloom Membership ($3.33/month) ──────────────────────────────
  const existingMembership = await stripe.products.search({
    query: "name:'StoryBloom Membership' AND active:'true'",
  });

  if (existingMembership.data.length > 0) {
    console.log("✓ StoryBloom Membership already exists:", existingMembership.data[0].id);
  } else {
    const membership = await stripe.products.create({
      name: "StoryBloom Membership",
      description: "Unlimited personalised AI children's stories, plus AI illustrations.",
    });
    const price = await stripe.prices.create({
      product: membership.id,
      unit_amount: 333, // $3.33
      currency: "usd",
      recurring: { interval: "month" },
    });
    console.log(`✓ Created StoryBloom Membership: ${membership.id}  price: ${price.id}  ($3.33/month)`);
  }

  // ── 2. Printed Storybook ($25 one-time) ────────────────────────────────
  const existingPrint = await stripe.products.search({
    query: "name:'Printed Storybook' AND active:'true'",
  });

  if (existingPrint.data.length > 0) {
    console.log("✓ Printed Storybook already exists:", existingPrint.data[0].id);
  } else {
    const book = await stripe.products.create({
      name: "Printed Storybook",
      description:
        "Your personalised story printed and shipped as a beautiful 6\"×9\" softcover book.",
    });
    const price = await stripe.prices.create({
      product: book.id,
      unit_amount: 2500, // $25.00
      currency: "usd",
    });
    console.log(`✓ Created Printed Storybook: ${book.id}  price: ${price.id}  ($25.00)`);
  }

  console.log("\nDone. Webhooks will sync these products to the local database automatically.");
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
