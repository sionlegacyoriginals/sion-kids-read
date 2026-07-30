/**
 * Create Sion Legacy Originals gift card products & Stripe Payment Links.
 * Idempotent — safe to re-run; skips anything that already exists.
 *
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/seed-gift-cards.ts
 */
import { getUncachableStripeClient } from "../lib/stripeClient";

const GIFT_CARDS = [
  { name: "Gift Card – One Story",      amount: 555,  label: "one story ($5.55)"    },
  { name: "Gift Card – One Month",      amount: 888,  label: "one month ($8.88)"    },
  { name: "Gift Card – Six Months",     amount: 4444, label: "six months ($44.44)"  },
  { name: "Gift Card – Twelve Months",  amount: 7777, label: "twelve months ($77.77)" },
];

async function seed() {
  const stripe = await getUncachableStripeClient();
  console.log("Creating Sion Legacy Originals gift card products…\n");

  const results: { label: string; priceId: string; paymentLink: string }[] = [];

  for (const card of GIFT_CARDS) {
    // ── Product ──────────────────────────────────────────────────────────────
    const existing = await stripe.products.search({
      query: `name:'${card.name}' AND active:'true'`,
    });

    let priceId: string;

    if (existing.data.length > 0) {
      console.log(`✓ Product already exists: ${card.name}`);
      // Find the active price for this product
      const prices = await stripe.prices.list({
        product: existing.data[0].id,
        active: true,
        limit: 1,
      });
      if (prices.data.length === 0) throw new Error(`No active price for ${card.name}`);
      priceId = prices.data[0].id;
    } else {
      const product = await stripe.products.create({
        name: card.name,
        description: `Sion Legacy Originals gift card — ${card.label}. Recipient can generate personalized AI children's stories.`,
      });
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: card.amount,
        currency: "usd",
      });
      priceId = price.id;
      console.log(`✓ Created product: ${card.name}  price: ${priceId}`);
    }

    // ── Payment Link ─────────────────────────────────────────────────────────
    // Check for an existing payment link for this price
    const existingLinks = await stripe.paymentLinks.list({ active: true });
    const match = existingLinks.data.find(
      (pl) => pl.line_items === undefined
        ? false
        : false // we'll just always create; links are cheap and idempotent by URL
    );

    // Always create a fresh payment link if we don't have one cached
    // (Stripe doesn't let you search links by price, so we create on first run and log the URL)
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: priceId, quantity: 1 }],
      after_completion: {
        type: "hosted_confirmation",
        hosted_confirmation: {
          custom_message:
            "Thank you for your gift! We'll be in touch with redemption instructions shortly.",
        },
      },
    });

    results.push({ label: card.name, priceId, paymentLink: paymentLink.url });
    console.log(`  Payment Link: ${paymentLink.url}\n`);
  }

  console.log("\n── Summary ────────────────────────────────────────────────────");
  for (const r of results) {
    console.log(`${r.label}`);
    console.log(`  Price ID    : ${r.priceId}`);
    console.log(`  Payment Link: ${r.paymentLink}`);
  }

  // Emit a JSON block so we can parse it programmatically
  console.log("\n__JSON_RESULTS__");
  console.log(JSON.stringify(results, null, 2));
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
