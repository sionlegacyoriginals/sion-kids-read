/**
 * DELETE /api/users/me
 * Lets an authenticated user permanently delete their own account and all data.
 */
import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { eraseUserData } from "./admin";

const router: IRouter = Router();

router.delete("/users/me", requireAuth, async (req: any, res) => {
  const userId  = req.userId as string;
  const clerkKey = process.env.CLERK_SECRET_KEY;

  try {
    // 1. Erase all app data first
    await eraseUserData(userId);

    // 2. Delete from Clerk (skip for reviewer pseudo-accounts)
    if (clerkKey && !req.isReviewer) {
      const r = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${clerkKey}` },
      });
      if (!r.ok && r.status !== 404) {
        const body = await r.json().catch(() => ({}));
        return res.status(r.status).json({ error: "Clerk deletion failed", detail: body });
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
