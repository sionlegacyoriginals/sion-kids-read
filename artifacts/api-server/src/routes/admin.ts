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

export default router;
