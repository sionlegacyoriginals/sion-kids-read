import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, ensureUser } from "../lib/auth";

const router: IRouter = Router();

function getValidCodes(): Set<string> {
  const raw = process.env.ACCESS_CODES ?? "";
  return new Set(
    raw
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean),
  );
}

const TIER_LABELS: Record<string, string> = {
  one_story:      "1 story credit",
  one_month:      "30 days of unlimited stories",
  six_months:     "180 days of unlimited stories",
  twelve_months:  "365 days of unlimited stories",
  hardcover_book: "1 printed softcover book",
};

// POST /api/access-code/redeem
router.post("/access-code/redeem", requireAuth, async (req: any, res): Promise<void> => {
  const { code } = req.body ?? {};

  if (typeof code !== "string" || !code.trim()) {
    res.status(400).json({ error: "Access code is required" });
    return;
  }

  const normalized = code.trim().toUpperCase();

  // ── Gift card codes (SLO-XXXXXXXX) ─────────────────────────────────────────
  if (normalized.startsWith("SLO-")) {
    const result = await db.execute(
      sql`SELECT code, tier, redeemed_at FROM gift_card_codes WHERE code = ${normalized} LIMIT 1`,
    );
    const row = result.rows[0];
    if (!row)            { res.status(400).json({ error: "Gift card code not found." }); return; }
    if (row.redeemed_at) { res.status(400).json({ error: "This gift card has already been redeemed." }); return; }

    await ensureUser(req.userId);

    const tier = row.tier as string;
    if (tier === "one_story") {
      await db.execute(sql`
        UPDATE users SET story_credits = story_credits + 1, updated_at = NOW() WHERE id = ${req.userId}
      `);
    } else if (tier === "hardcover_book") {
      await db.execute(sql`
        UPDATE users SET print_credits = print_credits + 1, updated_at = NOW() WHERE id = ${req.userId}
      `);
    } else {
      const days = tier === "one_month" ? 30 : tier === "six_months" ? 180 : 365;
      await db.execute(sql`
        UPDATE users
        SET gift_access_expires_at = GREATEST(NOW(), COALESCE(gift_access_expires_at, NOW())) + (${days} || ' days')::interval,
            updated_at = NOW()
        WHERE id = ${req.userId}
      `);
    }

    await db.execute(sql`
      UPDATE gift_card_codes SET redeemed_at = NOW(), redeemed_by_user_id = ${req.userId}
      WHERE code = ${normalized}
    `);

    return res.json({ success: true, reward: TIER_LABELS[tier] ?? tier });
  }

  // ── Admin / master access codes ─────────────────────────────────────────────
  const masterCode = (process.env.MASTER_TEST_CODE ?? "").trim().toUpperCase();
  const isMaster = masterCode.length > 0 && normalized === masterCode;

  if (!isMaster) {
    const valid = getValidCodes();
    if (!valid.has(normalized)) {
      res.status(400).json({ error: "Invalid access code" });
      return;
    }
  }

  await ensureUser(req.userId);

  await db.execute(
    sql`UPDATE users SET has_access_code = TRUE, updated_at = NOW() WHERE id = ${req.userId}`,
  );

  res.json({ success: true });
});

export default router;
