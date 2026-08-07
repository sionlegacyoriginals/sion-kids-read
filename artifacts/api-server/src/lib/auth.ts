import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

/**
 * Express middleware: requires a valid Clerk session OR a reviewer JWT.
 * Attaches `req.userId` (Clerk user ID or reviewer ID) on success.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Check for reviewer JWT in Authorization header first.
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, process.env.SESSION_SECRET!) as any;
      if (payload.type === "reviewer" && payload.userId) {
        (req as any).userId = payload.userId;
        (req as any).isReviewer = true;
        next();
        return;
      }
    } catch {
      // Not a valid reviewer token — fall through to Clerk.
    }
  }

  // Standard Clerk session auth.
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
  /** Set to true for Family Hub children — triggers per-request parent entitlement check. */
  isFamilyHub?: boolean;
}

export function signStudentToken(payload: Omit<StudentTokenPayload, "type">): string {
  return jwt.sign(
    { ...payload, type: "student" },
    process.env.SESSION_SECRET!,
    { expiresIn: "7d" },
  );
}

export async function requireStudentAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const payload = jwt.verify(token, process.env.SESSION_SECRET!) as StudentTokenPayload;
    if (payload.type !== "student") { res.status(401).json({ error: "Unauthorized" }); return; }

    // For Family Hub children, verify on every request that:
    //   1. The student row still exists and is assigned to the JWT's class
    //   2. That class is still a Family Hub owned by the JWT's teacher
    //   3. The parent still has an active entitlement
    // This ensures PIN resets, child removal, and lapsed subscriptions all take
    // effect immediately — not just at JWT expiry.
    if (payload.isFamilyHub) {
      const check = await db.execute(sql`
        SELECT u.id, u.session_valid_after
        FROM users u
        JOIN classes c ON c.id = u.class_id
        WHERE u.id        = ${payload.studentId}
          AND u.class_id  = ${payload.classId}
          AND u.is_student = TRUE
          AND c.is_family_hub = TRUE
          AND c.teacher_id    = ${payload.teacherId}
      `);
      if (!check.rows.length) {
        res.status(403).json({ error: "Student session is no longer valid." });
        return;
      }

      // Reject tokens issued before a PIN reset (session_valid_after tracks the last reset).
      const sessionValidAfter = (check.rows[0] as any).session_valid_after as string | null;
      if (sessionValidAfter) {
        const iat: number = (payload as any).iat ?? 0;
        const validAfterMs = new Date(sessionValidAfter).getTime();
        if (iat * 1000 < validAfterMs) {
          res.status(403).json({ error: "Session has been invalidated. Please log in again." });
          return;
        }
      }

      const hasAccess = await checkFamilyHubAccess(payload.teacherId);
      if (!hasAccess) {
        res.status(403).json({ error: "Family Hub subscription has expired." });
        return;
      }
    }

    (req as any).studentPayload = payload;
    (req as any).userId = payload.studentId;
    (req as any).isStudent = true;
    next();
  } catch (err: any) {
    // jwt.verify throws on invalid/expired token; other errors are unexpected
    if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
      res.status(401).json({ error: "Invalid or expired token" });
    } else {
      res.status(500).json({ error: "Authentication error" });
    }
  }
}

/**
 * Returns true when the given user has an active subscription, access code, or valid gift access.
 * Used to gate Family Hub creation and management.
 */
export async function checkFamilyHubAccess(userId: string): Promise<boolean> {
  const row = await db.execute(sql`
    SELECT stripe_customer_id, has_access_code, gift_access_expires_at
    FROM users WHERE id = ${userId}
  `);
  const u = row.rows[0] as any;
  if (!u) return false;
  if (u.has_access_code) return true;
  const subscribed = await hasActiveSubscription(u.stripe_customer_id ?? null);
  if (subscribed) return true;
  const giftExpiry = u.gift_access_expires_at ? new Date(u.gift_access_expires_at) : null;
  if (giftExpiry && giftExpiry > new Date()) return true;
  return false;
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
