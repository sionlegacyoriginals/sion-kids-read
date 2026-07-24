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

// POST /api/access-code/redeem
router.post("/access-code/redeem", requireAuth, async (req: any, res): Promise<void> => {
  const { code } = req.body ?? {};

  if (typeof code !== "string" || !code.trim()) {
    res.status(400).json({ error: "Access code is required" });
    return;
  }

  const normalized = code.trim().toUpperCase();
  const valid = getValidCodes();

  if (!valid.has(normalized)) {
    res.status(400).json({ error: "Invalid access code" });
    return;
  }

  // Provision user row if not yet created
  await ensureUser(req.userId);

  // Mark user as having a valid access code
  await db.execute(
    sql`UPDATE users SET has_access_code = TRUE, updated_at = NOW() WHERE id = ${req.userId}`,
  );

  res.json({ success: true });
});

export default router;
