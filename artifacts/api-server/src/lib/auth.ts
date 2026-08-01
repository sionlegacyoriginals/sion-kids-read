import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

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

// ── Student JWT auth ──────────────────────────────────────────────────────────

export interface StudentTokenPayload {
  type: "student";
  studentId: string;
  classId: number;
  teacherId: string;
  firstName: string;
  avatar: string;
}

export function signStudentToken(payload: Omit<StudentTokenPayload, "type">): string {
  return jwt.sign(
    { ...payload, type: "student" },
    process.env.SESSION_SECRET!,
    { expiresIn: "7d" },
  );
}

export function requireStudentAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const payload = jwt.verify(token, process.env.SESSION_SECRET!) as StudentTokenPayload;
    if (payload.type !== "student") { res.status(401).json({ error: "Unauthorized" }); return; }
    (req as any).studentPayload = payload;
    (req as any).userId = payload.studentId;
    (req as any).isStudent = true;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
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
