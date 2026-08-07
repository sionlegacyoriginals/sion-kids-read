/**
 * Temporary admin utility routes — protected by MASTER_TEST_CODE.
 * Safe to keep deployed; all endpoints require the master code in the request body.
 */
import { Router, type IRouter } from "express";

const router: IRouter = Router();

/**
 * POST /api/admin/create-test-user
 * Creates a pre-verified Clerk user (no email verification needed).
 * Body: { masterCode, email, password, firstName?, lastName? }
 */
router.post("/admin/create-test-user", async (req, res) => {
  const masterCode = (process.env.MASTER_TEST_CODE ?? "").trim();
  const provided   = (req.body?.masterCode ?? "").trim();

  if (!masterCode || provided !== masterCode) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { email, password, firstName = "Test", lastName = "Reviewer" } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const clerkKey = process.env.CLERK_SECRET_KEY;
  if (!clerkKey) {
    return res.status(500).json({ error: "CLERK_SECRET_KEY not configured" });
  }

  const response = await fetch("https://api.clerk.com/v1/users", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${clerkKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: [email],
      password,
      email_address_verified: true,   // skip verification email entirely
      first_name: firstName,
      last_name: lastName,
      skip_password_checks: false,
    }),
  });

  const data = await response.json() as any;

  if (!response.ok) {
    return res.status(response.status).json({ error: data });
  }

  res.json({
    success: true,
    userId: data.id,
    email: data.email_addresses?.[0]?.email_address,
    message: "Test user created — email verification bypassed.",
  });
});

/**
 * POST /api/admin/clerk-settings
 * Reads or patches Clerk instance settings.
 * Body: { masterCode, patch? }
 */
router.post("/admin/clerk-settings", async (req, res) => {
  const masterCode = (process.env.MASTER_TEST_CODE ?? "").trim();
  const provided   = (req.body?.masterCode ?? "").trim();
  if (!masterCode || provided !== masterCode) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const clerkKey = process.env.CLERK_SECRET_KEY;
  if (!clerkKey) return res.status(500).json({ error: "CLERK_SECRET_KEY not configured" });

  const { patch } = req.body;

  if (patch) {
    const r = await fetch("https://api.clerk.com/v1/instance", {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${clerkKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const text = await r.text();
    try { return res.status(r.status).json(JSON.parse(text)); }
    catch { return res.status(r.status).json({ raw: text, status: r.status }); }
  }

  // GET current settings
  const r = await fetch("https://api.clerk.com/v1/instance", {
    headers: { "Authorization": `Bearer ${clerkKey}` },
  });
  const text = await r.text();
  try { res.status(r.status).json(JSON.parse(text)); }
  catch { res.status(r.status).json({ raw: text, status: r.status }); }
});

/**
 * DELETE /api/admin/users/:userId
 * Permanently deletes a user's Clerk account and all associated app data.
 * Protected by ?master=<MASTER_TEST_CODE>.
 */
router.delete("/admin/users/:userId", async (req, res) => {
  const masterCode = (process.env.MASTER_TEST_CODE ?? "").trim();
  const provided   = (String(req.query.master ?? "")).trim();
  if (!masterCode || provided !== masterCode) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const clerkKey = process.env.CLERK_SECRET_KEY;

  try {
    // 1. Erase app data
    await eraseUserData(userId);

    // 2. Delete from Clerk (best-effort — may already be gone)
    if (clerkKey) {
      const r = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${clerkKey}` },
      });
      if (!r.ok && r.status !== 404) {
        const body = await r.json().catch(() => ({}));
        return res.status(r.status).json({ error: "Clerk deletion failed", detail: body });
      }
    }

    res.json({ success: true, userId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

/** Wipe all rows that belong to this user from the app database. */
async function eraseUserData(userId: string) {
  // Students / children created by this user (teacher rows)
  await db.execute(sql`
    DELETE FROM users
    WHERE class_id IN (SELECT id FROM classes WHERE teacher_id = ${userId})
      AND is_student = TRUE
  `);
  // Classes owned by this user
  await db.execute(sql`DELETE FROM classes WHERE teacher_id = ${userId}`);
  // Parent links
  await db.execute(sql`DELETE FROM parent_links WHERE parent_user_id = ${userId}`);
  // Story reads & exercises
  await db.execute(sql`DELETE FROM story_reads WHERE user_id = ${userId}`);
  // Stories
  await db.execute(sql`DELETE FROM stories WHERE user_id = ${userId}`);
  // Reference photos
  await db.execute(sql`DELETE FROM reference_photos WHERE user_id = ${userId}`);
  // Print orders (anonymise — keep for record-keeping)
  await db.execute(sql`
    UPDATE print_orders SET customer_email = NULL, customer_name = NULL
    WHERE user_id = ${userId}
  `);
  // User row itself
  await db.execute(sql`DELETE FROM users WHERE id = ${userId}`);
}

export { eraseUserData };
export default router;
