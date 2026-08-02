import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

/**
 * GET /api/avatars
 * Returns the full avatar bank — no auth required (avatars are public assets).
 */
router.get("/avatars", async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`
      SELECT id, name, category, emoji, sort_order
      FROM avatar_bank
      ORDER BY sort_order, category, name
    `);

    const avatars = result.rows.map((r: any) => ({
      id: r.id as string,
      name: r.name as string,
      category: r.category as string,
      emoji: r.emoji as string,
      // The ref-photo path the story-generation pipeline reads
      refPhotoPath: `/ref-photos/${r.id}`,
      // The browser-accessible preview URL
      previewUrl: `/api/ref-photos/${r.id}`,
    }));

    res.json({ avatars });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load avatar bank" });
  }
});

export default router;
