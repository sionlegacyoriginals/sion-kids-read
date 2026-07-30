import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// ── GET /gift-cards/session/:sessionId ── public, called by success page ───────
// Returns the gift code for a completed Stripe checkout session.
router.get("/gift-cards/session/:sessionId", async (req, res): Promise<void> => {
  const { sessionId } = req.params;
  if (!sessionId) { res.status(400).json({ error: "sessionId required" }); return; }

  const result = await db.execute(
    sql`SELECT code, tier, redeemed_at FROM gift_card_codes WHERE stripe_session_id = ${sessionId} LIMIT 1`,
  );
  const row = result.rows[0];
  if (!row) { res.status(404).json({ error: "No gift card found for this session" }); return; }

  res.json({
    code:       row.code,
    tier:       row.tier,
    redeemed:   !!row.redeemed_at,
  });
});

// ── POST /gift-cards/redeem ── auth required ────────────────────────────────────
router.post("/gift-cards/redeem", requireAuth, async (req: any, res): Promise<void> => {
  const { code } = req.body;
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "code is required" });
    return;
  }

  const normalized = code.trim().toUpperCase();

  const result = await db.execute(
    sql`SELECT code, tier, redeemed_at FROM gift_card_codes WHERE code = ${normalized} LIMIT 1`,
  );
  const row = result.rows[0];

  if (!row)            { res.status(404).json({ error: "Gift card code not found." }); return; }
  if (row.redeemed_at) { res.status(409).json({ error: "This code has already been redeemed." }); return; }

  const tier = row.tier as string;

  // Apply the credit / access
  if (tier === "one_story") {
    await db.execute(sql`
      UPDATE users SET story_credits = story_credits + 1, updated_at = NOW()
      WHERE id = ${req.userId}
    `);
  } else if (tier === "hardcover_book") {
    await db.execute(sql`
      UPDATE users SET print_credits = print_credits + 1, updated_at = NOW()
      WHERE id = ${req.userId}
    `);
  } else {
    const days = tier === "one_month" ? 30 : tier === "six_months" ? 180 : 365;
    // Extend from today OR from current expiry, whichever is later
    await db.execute(sql`
      UPDATE users
      SET gift_access_expires_at = GREATEST(NOW(), COALESCE(gift_access_expires_at, NOW())) + (${days} || ' days')::interval,
          updated_at = NOW()
      WHERE id = ${req.userId}
    `);
  }

  // Mark the code as redeemed
  await db.execute(sql`
    UPDATE gift_card_codes
    SET redeemed_at = NOW(), redeemed_by_user_id = ${req.userId}
    WHERE code = ${normalized}
  `);

  const tierLabels: Record<string, string> = {
    one_story:      "1 story credit",
    one_month:      "30 days of unlimited stories",
    six_months:     "180 days of unlimited stories",
    twelve_months:  "365 days of unlimited stories",
    hardcover_book: "1 printed hardcover book credit",
  };

  res.json({ success: true, tier, reward: tierLabels[tier] ?? tier });
});

export default router;
