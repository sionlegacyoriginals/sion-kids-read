import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getUncachableStripeClient } from "../lib/stripeClient";
import { requireAuth, ensureUser, hasActiveSubscription } from "../lib/auth";

const router = Router();

const baseUrl = () =>
  `https://${(process.env.REPLIT_DOMAINS ?? "localhost").split(",")[0]}`;
const basePath = () => (process.env.BASE_PATH ?? "").replace(/\/$/, "");

// ── GET /api/users/me ────────────────────────────────────────────────────────
router.get("/users/me", requireAuth, async (req: any, res) => {
  try {
    await ensureUser(req.userId);

    const [userRow, countRow] = await Promise.all([
      db.execute(sql`SELECT * FROM users WHERE id = ${req.userId}`),
      db.execute(
        sql`SELECT COUNT(*) AS count FROM stories WHERE user_id = ${req.userId}`,
      ),
    ]);

    const user = userRow.rows[0];
    const storyCount = parseInt((countRow.rows[0]?.count as string) ?? "0", 10);
    const subscribed = await hasActiveSubscription(
      (user?.stripe_customer_id as string) ?? null,
    );

    res.json({
      userId: req.userId,
      email: user?.email ?? null,
      storyCount,
      hasSubscription: subscribed,
      hasAccessCode: user?.has_access_code ?? false,
      storyCredits: parseInt((user?.story_credits as string) ?? "0", 10),
      stripeCustomerId: user?.stripe_customer_id ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/checkout/subscription ─────────────────────────────────────────
router.post("/checkout/subscription", requireAuth, async (req: any, res) => {
  try {
    const { email } = req.body;
    await ensureUser(req.userId, email);

    const stripe = await getUncachableStripeClient();

    // Get/create Stripe customer
    const userRow = await db.execute(
      sql`SELECT stripe_customer_id, email FROM users WHERE id = ${req.userId}`,
    );
    let customerId = userRow.rows[0]?.stripe_customer_id as string | null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email ?? (userRow.rows[0]?.email as string | undefined),
        metadata: { clerkUserId: req.userId },
      });
      customerId = customer.id;
      await db.execute(
        sql`UPDATE users SET stripe_customer_id = ${customerId}, updated_at = NOW() WHERE id = ${req.userId}`,
      );
    }

    // Look up membership price from synced stripe schema
    const priceRow = await db.execute(sql`
      SELECT pr.id AS price_id
      FROM stripe.products p
      JOIN stripe.prices pr ON pr.product = p.id
      WHERE p.name = 'StoryBloom Membership'
        AND p.active  = true
        AND pr.active = true
      LIMIT 1
    `);

    if (!priceRow.rows[0]) {
      return res
        .status(500)
        .json({ error: "Membership product not found. Run the seed script." });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceRow.rows[0].price_id as string, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl()}${basePath()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl()}${basePath()}/subscribe`,
      metadata: { clerkUserId: req.userId },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/checkout/print ─────────────────────────────────────────────────
router.post("/checkout/print", requireAuth, async (req: any, res) => {
  try {
    const { storyId, shippingAddress, customerName, customerEmail } = req.body;

    if (!storyId || !shippingAddress || !customerName || !customerEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await ensureUser(req.userId, customerEmail);

    // Verify story belongs to this user
    const storyRow = await db.execute(
      sql`SELECT id, title FROM stories WHERE id = ${storyId} AND user_id = ${req.userId}`,
    );
    if (!storyRow.rows[0]) {
      return res.status(404).json({ error: "Story not found" });
    }

    const stripe = await getUncachableStripeClient();

    // Get/create Stripe customer
    const userRow = await db.execute(
      sql`SELECT stripe_customer_id FROM users WHERE id = ${req.userId}`,
    );
    let customerId = userRow.rows[0]?.stripe_customer_id as string | null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
        metadata: { clerkUserId: req.userId },
      });
      customerId = customer.id;
      await db.execute(
        sql`UPDATE users SET stripe_customer_id = ${customerId}, updated_at = NOW() WHERE id = ${req.userId}`,
      );
    }

    // Look up print price
    const priceRow = await db.execute(sql`
      SELECT pr.id AS price_id, pr.unit_amount
      FROM stripe.products p
      JOIN stripe.prices pr ON pr.product = p.id
      WHERE p.name  = 'Printed Storybook'
        AND p.active  = true
        AND pr.active = true
      LIMIT 1
    `);

    if (!priceRow.rows[0]) {
      return res
        .status(500)
        .json({ error: "Print product not found. Run the seed script." });
    }

    // Create pending order
    const orderRow = await db.execute(sql`
      INSERT INTO print_orders
        (user_id, story_id, customer_email, customer_name, shipping_address, amount_cents, status, created_at, updated_at)
      VALUES
        (${req.userId}, ${storyId}, ${customerEmail}, ${customerName},
         ${JSON.stringify(shippingAddress)}, ${priceRow.rows[0].unit_amount},
         'pending_payment', NOW(), NOW())
      RETURNING id
    `);

    const orderId = orderRow.rows[0].id as number;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceRow.rows[0].price_id as string, quantity: 1 }],
      mode: "payment",
      success_url: `${baseUrl()}${basePath()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl()}${basePath()}/stories/${storyId}`,
      metadata: {
        clerkUserId: req.userId,
        orderId: String(orderId),
        storyId: String(storyId),
      },
    });

    await db.execute(
      sql`UPDATE print_orders SET stripe_session_id = ${session.id} WHERE id = ${orderId}`,
    );

    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/checkout/orders ─────────────────────────────────────────────────
router.get("/checkout/orders", requireAuth, async (req: any, res) => {
  try {
    const result = await db.execute(sql`
      SELECT po.*, s.title AS story_title, s.cover_image_url
      FROM   print_orders po
      LEFT JOIN stories s ON s.id = po.story_id
      WHERE  po.user_id = ${req.userId}
      ORDER  BY po.created_at DESC
    `);
    res.json({ orders: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/checkout/portal ────────────────────────────────────────────────
router.post("/checkout/portal", requireAuth, async (req: any, res) => {
  try {
    const userRow = await db.execute(
      sql`SELECT stripe_customer_id FROM users WHERE id = ${req.userId}`,
    );
    const customerId = userRow.rows[0]?.stripe_customer_id as string | null;
    if (!customerId) {
      return res.status(400).json({ error: "No billing account found" });
    }

    const stripe = await getUncachableStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl()}${basePath()}/account`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
