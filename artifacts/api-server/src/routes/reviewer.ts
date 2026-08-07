import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import jwt from "jsonwebtoken";

const router: IRouter = Router();

// Fixed reviewer user ID — always the same so DB row is stable.
export const REVIEWER_USER_ID = "reviewer_google_play";

/**
 * POST /api/reviewer/auth
 * Validates reviewer credentials (set via REVIEWER_EMAIL / REVIEWER_PASSWORD env vars)
 * and returns a long-lived JWT that gives full app access without Clerk or email OTP.
 */
router.post("/reviewer/auth", async (req: any, res): Promise<void> => {
  try {
    const { email, password } = req.body ?? {};

    const validEmail    = process.env.REVIEWER_EMAIL    ?? "reviewer@sionkidsread.com";
    const validPassword = process.env.REVIEWER_PASSWORD ?? "TestPassword123!";

    if (
      typeof email    !== "string" || email.trim()    !== validEmail ||
      typeof password !== "string" || password.trim() !== validPassword
    ) {
      res.status(401).json({ error: "Invalid reviewer credentials." });
      return;
    }

    // Upsert reviewer user row with full access so /api/users/me works normally.
    await db.execute(sql`
      INSERT INTO users (id, email, has_access_code, created_at, updated_at)
      VALUES (
        ${REVIEWER_USER_ID},
        ${validEmail},
        TRUE,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
        SET has_access_code = TRUE,
            email           = ${validEmail},
            updated_at      = NOW()
    `);

    const token = jwt.sign(
      { type: "reviewer", userId: REVIEWER_USER_ID },
      process.env.SESSION_SECRET!,
      { expiresIn: "90d" },
    );

    res.json({ token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
