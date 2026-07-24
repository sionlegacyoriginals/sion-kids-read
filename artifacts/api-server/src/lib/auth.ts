import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

/**
 * Express middleware: requires a valid Clerk session.
 * Attaches `req.userId` (Clerk user ID) on success.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims?.userId as string | undefined) ?? auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).userId = userId;
  next();
}

/**
 * JIT-provision a user row in our users table on their first authenticated request.
 * Safe to call on every request — ON CONFLICT DO NOTHING is idempotent.
 */
export async function ensureUser(userId: string, email?: string | null): Promise<void> {
  await db.execute(sql`
    INSERT INTO users (id, email, created_at, updated_at)
    VALUES (${userId}, ${email ?? null}, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);
}

/**
 * Returns true when the given Stripe customer has an active subscription.
 */
export async function hasActiveSubscription(stripeCustomerId: string | null): Promise<boolean> {
  if (!stripeCustomerId) return false;
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) AS count
      FROM stripe.subscriptions
      WHERE customer = ${stripeCustomerId}
        AND status   = 'active'
    `);
    return parseInt((result.rows[0]?.count as string) ?? "0", 10) > 0;
  } catch {
    // stripe schema not yet created (e.g. before first Stripe init)
    return false;
  }
}
