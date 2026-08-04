import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, requireStudentAuth, checkFamilyHubAccess, ensureUser } from "../lib/auth";

const router = Router();

const FAMILY_AVATARS = [
  "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯",
  "🦁","🐸","🐵","🐔","🐧","🦆","🦉","🦋","🐢","🦄",
];

function genPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ── GET /family-hub/verify-child ──────────────────────────────────────────────
// Called by /family-hub/home on mount. Verifies the student JWT belongs to a
// Family Hub class and that the owning parent still has an active entitlement.
router.get("/family-hub/verify-child", requireStudentAuth, async (req: any, res): Promise<void> => {
  try {
    const { studentId, classId, teacherId } = req.studentPayload;

    // Confirm the student still exists, is assigned to the JWT's class, and that
    // class is a Family Hub owned by the JWT teacher — catches deleted children.
    const check = await db.execute(sql`
      SELECT u.id
      FROM users u
      JOIN classes c ON c.id = u.class_id
      WHERE u.id         = ${studentId}
        AND u.class_id   = ${classId}
        AND u.is_student = TRUE
        AND c.is_family_hub  = TRUE
        AND c.teacher_id     = ${teacherId}
    `);
    if (!check.rows.length) {
      res.status(403).json({ error: "Student session is no longer valid." });
      return;
    }

    // Confirm the parent still has an active entitlement
    const hasAccess = await checkFamilyHubAccess(teacherId);
    if (!hasAccess) {
      res.status(403).json({ error: "Family Hub subscription has expired." });
      return;
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /family-hub/roster/:classCode  (PUBLIC — no auth required) ────────────
// Returns only the hub name and children's display info (id, name, avatar).
// No PINs, no parent data. Used by children logging in from their own device.
router.get("/family-hub/roster/:classCode", async (req: any, res): Promise<void> => {
  try {
    const { classCode } = req.params;
    if (!classCode?.trim()) {
      res.status(400).json({ error: "classCode is required." });
      return;
    }

    const hubRes = await db.execute(sql`
      SELECT id, class_name FROM classes
      WHERE class_code = ${classCode.trim().toUpperCase()} AND is_family_hub = TRUE
      LIMIT 1
    `);
    if (!hubRes.rows.length) {
      res.status(404).json({ error: "Family Hub not found." });
      return;
    }

    const hub = hubRes.rows[0] as any;
    const childrenRes = await db.execute(sql`
      SELECT id, first_name, avatar, photo_url FROM users
      WHERE class_id = ${hub.id} AND is_student = TRUE
      ORDER BY first_name ASC
    `);

    res.json({ hubName: hub.class_name, children: childrenRes.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /family-hub ────────────────────────────────────────────────────────────
router.get("/family-hub", requireAuth, async (req: any, res): Promise<void> => {
  try {
    // Provision user row if this is their first visit (e.g. brand-new Clerk account)
    await ensureUser(req.userId);
    const hasAccess = await checkFamilyHubAccess(req.userId);
    if (!hasAccess) {
      res.json({ hasAccess: false, hub: null });
      return;
    }

    const hubRes = await db.execute(sql`
      SELECT id, class_code, class_name, announcement_message, value_of_week, sight_words,
             point_value_per_sight_word, points_for_published, created_at
      FROM classes
      WHERE teacher_id = ${req.userId} AND is_family_hub = TRUE
      LIMIT 1
    `);

    if (!hubRes.rows.length) {
      res.json({ hasAccess: true, hub: null });
      return;
    }

    const hub = hubRes.rows[0] as any;
    const childrenRes = await db.execute(sql`
      SELECT id, first_name, avatar, photo_url, pin, points, created_at
      FROM users
      WHERE class_id = ${hub.id} AND is_student = TRUE
      ORDER BY first_name ASC
    `);

    res.json({ hasAccess: true, hub: { ...hub, children: childrenRes.rows } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /family-hub ───────────────────────────────────────────────────────────
router.post("/family-hub", requireAuth, async (req: any, res): Promise<void> => {
  try {
    // Provision user row before entitlement check so new Clerk subscribers are found
    await ensureUser(req.userId);
    const hasAccess = await checkFamilyHubAccess(req.userId);
    if (!hasAccess) {
      res.status(403).json({ error: "An active subscription is required to create a Family Hub." });
      return;
    }

    const existing = await db.execute(sql`
      SELECT id FROM classes WHERE teacher_id = ${req.userId} AND is_family_hub = TRUE LIMIT 1
    `);
    if (existing.rows.length) {
      res.status(409).json({ error: "You already have a Family Hub." });
      return;
    }

    const { hubName } = req.body;
    const name = (hubName?.trim() as string | undefined) || "Our Family Hub";
    const classCode = `FAM_${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;

    const result = await db.execute(sql`
      INSERT INTO classes (teacher_id, class_name, class_code, is_family_hub)
      VALUES (${req.userId}, ${name}, ${classCode}, TRUE)
      RETURNING id, class_code, class_name, announcement_message, value_of_week, sight_words,
                point_value_per_sight_word, points_for_published, created_at
    `);
    await db.execute(sql`
      UPDATE users SET family_hub_enabled = TRUE, updated_at = NOW() WHERE id = ${req.userId}
    `);

    res.status(201).json({ hub: { ...result.rows[0], children: [] } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /family-hub/settings ──────────────────────────────────────────────────
router.put("/family-hub/settings", requireAuth, async (req: any, res): Promise<void> => {
  try {
    // Require active subscription for every management mutation
    const hasAccess = await checkFamilyHubAccess(req.userId);
    if (!hasAccess) {
      res.status(403).json({ error: "An active subscription is required to manage your Family Hub." });
      return;
    }

    const hubRes = await db.execute(sql`
      SELECT id FROM classes WHERE teacher_id = ${req.userId} AND is_family_hub = TRUE LIMIT 1
    `);
    if (!hubRes.rows.length) {
      res.status(404).json({ error: "Family Hub not found." });
      return;
    }
    const hubId = (hubRes.rows[0] as any).id;
    const { hubName, message, valueOfWeek, sightWords } = req.body;

    await db.execute(sql`
      UPDATE classes SET
        class_name              = COALESCE(${(hubName?.trim() as string | undefined) ?? null}, class_name),
        announcement_message    = ${(message as string | undefined) ?? null},
        value_of_week           = ${(valueOfWeek as string | undefined) ?? null},
        sight_words             = ${(sightWords as string | undefined) ?? null},
        announcement_updated_at = NOW()
      WHERE id = ${hubId}
    `);

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /family-hub/children ─────────────────────────────────────────────────
router.post("/family-hub/children", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const hasAccess = await checkFamilyHubAccess(req.userId);
    if (!hasAccess) {
      res.status(403).json({ error: "An active subscription is required to manage your Family Hub." });
      return;
    }

    const hubRes = await db.execute(sql`
      SELECT id FROM classes WHERE teacher_id = ${req.userId} AND is_family_hub = TRUE LIMIT 1
    `);
    if (!hubRes.rows.length) {
      res.status(404).json({ error: "Family Hub not found." });
      return;
    }
    const hubId = (hubRes.rows[0] as any).id as number;

    const { firstName, avatar } = req.body;
    if (!firstName?.trim()) {
      res.status(400).json({ error: "Child's first name is required." });
      return;
    }

    const countRes = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM users WHERE class_id = ${hubId} AND is_student = TRUE
    `);
    const count = (countRes.rows[0] as any)?.cnt ?? 0;
    if (count >= 6) {
      res.status(400).json({ error: "Family Hubs can have up to 6 children." });
      return;
    }

    const chosenAvatar = (avatar as string | undefined) ?? FAMILY_AVATARS[count % FAMILY_AVATARS.length];
    const studentId = `family_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const pin = genPin();
    const email = `family_${studentId.slice(-6)}@family.sionlegacyoriginals.com`;

    await db.execute(sql`
      INSERT INTO users (id, email, is_student, class_id, first_name, avatar, pin, created_at, updated_at)
      VALUES (${studentId}, ${email}, TRUE, ${hubId}, ${(firstName as string).trim()},
              ${chosenAvatar}, ${pin}, NOW(), NOW())
    `);

    const row = await db.execute(sql`
      SELECT id, first_name, avatar, pin, points, created_at FROM users WHERE id = ${studentId}
    `);

    res.status(201).json({ child: row.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /family-hub/children/:childId/pin ────────────────────────────────────
router.put("/family-hub/children/:childId/pin", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const hasAccess = await checkFamilyHubAccess(req.userId);
    if (!hasAccess) {
      res.status(403).json({ error: "An active subscription is required to manage your Family Hub." });
      return;
    }

    const { childId } = req.params;
    const check = await db.execute(sql`
      SELECT u.id FROM users u
      JOIN classes c ON c.id = u.class_id
      WHERE u.id = ${childId}
        AND c.teacher_id = ${req.userId}
        AND c.is_family_hub = TRUE
        AND u.is_student = TRUE
    `);
    if (!check.rows.length) {
      res.status(403).json({ error: "Child not found." });
      return;
    }

    const newPin = genPin();
    // session_valid_after: invalidates any JWT issued before this moment,
    // ensuring the child must log in again with the new PIN.
    await db.execute(sql`
      UPDATE users SET pin = ${newPin}, updated_at = NOW(), session_valid_after = NOW()
      WHERE id = ${childId}
    `);

    res.json({ ok: true, pin: newPin });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /family-hub/children/:childId/photo ──────────────────────────────────
// Parent uploads a real photo of their child. Stored in reference_photos table;
// path saved to users.photo_url. Only the owning parent can call this.
router.put("/family-hub/children/:childId/photo", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const hasAccess = await checkFamilyHubAccess(req.userId);
    if (!hasAccess) {
      res.status(403).json({ error: "An active subscription is required to manage your Family Hub." });
      return;
    }

    const { childId } = req.params;
    // Verify this child belongs to the authenticated parent's hub
    const check = await db.execute(sql`
      SELECT u.id FROM users u
      JOIN classes c ON c.id = u.class_id
      WHERE u.id = ${childId}
        AND c.teacher_id = ${req.userId}
        AND c.is_family_hub = TRUE
        AND u.is_student = TRUE
    `);
    if (!check.rows.length) {
      res.status(403).json({ error: "Child not found." });
      return;
    }

    const { data } = req.body;
    if (!data || typeof data !== "string") {
      res.status(400).json({ error: "Missing data field (base64 data URL)." });
      return;
    }

    // Store in reference_photos and link to child
    const photoId = randomUUID();
    await db.execute(sql`INSERT INTO reference_photos (id, data_url) VALUES (${photoId}, ${data})`);
    const photoUrl = `/ref-photos/${photoId}`;
    await db.execute(sql`UPDATE users SET photo_url = ${photoUrl}, updated_at = NOW() WHERE id = ${childId}`);

    res.json({ ok: true, photoUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /family-hub/children/:childId ─────────────────────────────────────
router.delete("/family-hub/children/:childId", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const hasAccess = await checkFamilyHubAccess(req.userId);
    if (!hasAccess) {
      res.status(403).json({ error: "An active subscription is required to manage your Family Hub." });
      return;
    }

    const { childId } = req.params;
    const check = await db.execute(sql`
      SELECT u.id FROM users u
      JOIN classes c ON c.id = u.class_id
      WHERE u.id = ${childId}
        AND c.teacher_id = ${req.userId}
        AND c.is_family_hub = TRUE
        AND u.is_student = TRUE
    `);
    if (!check.rows.length) {
      res.status(403).json({ error: "Child not found." });
      return;
    }

    await db.execute(sql`DELETE FROM users WHERE id = ${childId}`);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
