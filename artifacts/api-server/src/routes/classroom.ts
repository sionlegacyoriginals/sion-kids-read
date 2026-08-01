import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, requireStudentAuth, signStudentToken } from "../lib/auth";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────
const CHARSET = "BCDFGHJKLMNPQRSTVWXYZ23456789"; // no ambiguous 0/O, 1/I/l
function genCode(len = 5): string {
  return Array.from(
    { length: len },
    () => CHARSET[Math.floor(Math.random() * CHARSET.length)],
  ).join("");
}

const AVATARS = [
  "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯",
  "🦁","🐸","🐵","🐔","🐧","🦆","🦉","🦋","🐢","🦄",
];

function genPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ── Teacher: Check classroom access ──────────────────────────────────────────
router.get("/classroom/access-status", requireAuth, async (req: any, res) => {
  try {
    // Access requires classroom_enabled AND the school code still being active
    const result = await db.execute(sql`
      SELECT u.classroom_enabled, u.school_code_id, s.is_active AS code_active
      FROM users u
      LEFT JOIN school_access_codes s ON s.id = u.school_code_id
      WHERE u.id = ${req.userId}
    `);
    const row = result.rows[0];
    const enabled = row?.classroom_enabled === true && (row?.school_code_id == null || row?.code_active === true);
    res.json({ enabled });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Teacher: Unlock classroom with a school access code ───────────────────────
router.post("/classroom/unlock", requireAuth, async (req: any, res) => {
  try {
    const { code } = req.body;
    if (!code?.trim()) return res.status(400).json({ error: "Code is required." });

    const found = await db.execute(sql`
      SELECT id, school_name, is_active FROM school_access_codes
      WHERE UPPER(code) = UPPER(${code.trim()})
    `);
    if (!found.rows.length) {
      return res.status(403).json({ error: "That code isn't right. Check with your school administrator." });
    }
    const schoolCode = found.rows[0] as any;
    if (!schoolCode.is_active) {
      return res.status(403).json({ error: "That access code has been deactivated. Contact Sion Legacy Originals." });
    }

    await db.execute(sql`
      UPDATE users SET classroom_enabled = TRUE, school_code_id = ${schoolCode.id}
      WHERE id = ${req.userId}
    `);
    res.json({ enabled: true, schoolName: schoolCode.school_name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: List school access codes ──────────────────────────────────────────
router.get("/admin/school-codes", async (req: any, res) => {
  const master = (process.env.MASTER_TEST_CODE ?? "").trim();
  if (!master || req.query.master !== master) return res.status(403).json({ error: "Forbidden" });
  try {
    const result = await db.execute(sql`
      SELECT s.*, COUNT(u.id)::int AS teacher_count
      FROM school_access_codes s
      LEFT JOIN users u ON u.school_code_id = s.id AND u.classroom_enabled = TRUE
      GROUP BY s.id ORDER BY s.created_at DESC
    `);
    res.json({ codes: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Create a school access code ───────────────────────────────────────
router.post("/admin/school-codes", async (req: any, res) => {
  const master = (process.env.MASTER_TEST_CODE ?? "").trim();
  if (!master || req.query.master !== master) return res.status(403).json({ error: "Forbidden" });
  try {
    const { schoolName, customCode } = req.body;
    if (!schoolName?.trim()) return res.status(400).json({ error: "School name is required." });

    // Use provided code or generate one
    let code = customCode?.trim().toUpperCase();
    if (!code) {
      const chars = "BCDFGHJKLMNPQRSTVWXYZ23456789";
      code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    }

    const existing = await db.execute(sql`SELECT id FROM school_access_codes WHERE UPPER(code) = ${code}`);
    if (existing.rows.length) return res.status(409).json({ error: "That code already exists." });

    const result = await db.execute(sql`
      INSERT INTO school_access_codes (code, school_name) VALUES (${code}, ${schoolName.trim()})
      RETURNING *
    `);
    res.json({ schoolCode: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Revoke / reactivate a school access code ──────────────────────────
router.patch("/admin/school-codes/:id", async (req: any, res) => {
  const master = (process.env.MASTER_TEST_CODE ?? "").trim();
  if (!master || req.query.master !== master) return res.status(403).json({ error: "Forbidden" });
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") return res.status(400).json({ error: "isActive (boolean) required." });

    const result = await db.execute(sql`
      UPDATE school_access_codes SET is_active = ${isActive} WHERE id = ${Number(id)}
      RETURNING *
    `);
    if (!result.rows.length) return res.status(404).json({ error: "Code not found." });
    res.json({ schoolCode: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Teacher: Create a class ───────────────────────────────────────────────────
router.post("/classroom/classes", requireAuth, async (req: any, res) => {
  try {
    const { className } = req.body;
    if (!className?.trim()) return res.status(400).json({ error: "Class name is required" });

    // Check classroom access
    const access = await db.execute(sql`SELECT classroom_enabled FROM users WHERE id = ${req.userId}`);
    if (!access.rows[0]?.classroom_enabled) {
      return res.status(403).json({ error: "Classroom access not enabled. Enter your teacher access code first." });
    }

    // Generate a unique 5-char class code
    let classCode = "";
    for (let i = 0; i < 20; i++) {
      const candidate = genCode();
      const existing = await db.execute(sql`SELECT id FROM classes WHERE class_code = ${candidate}`);
      if (!existing.rows.length) { classCode = candidate; break; }
    }
    if (!classCode) return res.status(500).json({ error: "Could not generate unique class code" });

    const result = await db.execute(sql`
      INSERT INTO classes (teacher_id, class_name, class_code)
      VALUES (${req.userId}, ${className.trim()}, ${classCode})
      RETURNING *
    `);
    res.json({ class: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Teacher: Save weekly announcement ────────────────────────────────────────
router.put("/classroom/classes/:classId/announcement", requireAuth, async (req: any, res) => {
  try {
    const { classId } = req.params;
    const { message, valueOfWeek, sightWords, dueDate } = req.body;

    // Verify teacher owns this class
    const check = await db.execute(sql`SELECT id FROM classes WHERE id = ${Number(classId)} AND teacher_id = ${req.userId}`);
    if (!check.rows.length) return res.status(403).json({ error: "Not your class." });

    await db.execute(sql`
      UPDATE classes SET
        announcement_message     = ${message ?? null},
        value_of_week            = ${valueOfWeek ?? null},
        sight_words              = ${sightWords ?? null},
        assignment_due_date      = ${dueDate ?? null},
        announcement_updated_at  = NOW()
      WHERE id = ${Number(classId)}
    `);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Student: Get class announcement ──────────────────────────────────────────
router.get("/classroom/announcement", requireStudentAuth, async (req: any, res) => {
  try {
    const result = await db.execute(sql`
      SELECT announcement_message, value_of_week, sight_words, assignment_due_date, announcement_updated_at
      FROM classes WHERE id = ${(req as any).studentPayload.classId}
    `);
    const row = result.rows[0] ?? {};
    res.json({
      message: row.announcement_message ?? null,
      valueOfWeek: row.value_of_week ?? null,
      sightWords: row.sight_words ?? null,
      dueDate: row.assignment_due_date ?? null,
      updatedAt: row.announcement_updated_at ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Teacher: List classes ─────────────────────────────────────────────────────
router.get("/classroom/classes", requireAuth, async (req: any, res) => {
  try {
    const result = await db.execute(sql`
      SELECT c.*, COUNT(u.id)::int AS student_count
      FROM classes c
      LEFT JOIN users u ON u.class_id = c.id AND u.is_student = TRUE
      WHERE c.teacher_id = ${req.userId}
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json({ classes: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Teacher: Get class + students ─────────────────────────────────────────────
router.get("/classroom/classes/:classId", requireAuth, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.classId, 10);
    const cls = await db.execute(sql`
      SELECT * FROM classes WHERE id = ${classId} AND teacher_id = ${req.userId}
    `);
    if (!cls.rows.length) return res.status(404).json({ error: "Class not found" });

    const students = await db.execute(sql`
      SELECT id, first_name, avatar, pin, points, created_at
      FROM users
      WHERE class_id = ${classId} AND is_student = TRUE
      ORDER BY first_name ASC
    `);
    res.json({ class: cls.rows[0], students: students.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Teacher: Add student ──────────────────────────────────────────────────────
router.post("/classroom/classes/:classId/students", requireAuth, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.classId, 10);
    const { firstName } = req.body;
    if (!firstName?.trim()) return res.status(400).json({ error: "First name is required" });

    const cls = await db.execute(sql`
      SELECT * FROM classes WHERE id = ${classId} AND teacher_id = ${req.userId}
    `);
    if (!cls.rows.length) return res.status(404).json({ error: "Class not found" });

    const classCode = cls.rows[0].class_code as string;

    // Assign avatar by cycling through list
    const countResult = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM users WHERE class_id = ${classId} AND is_student = TRUE
    `);
    const count = (countResult.rows[0]?.cnt as number) ?? 0;
    const avatar = AVATARS[count % AVATARS.length];

    const studentId = `student_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const pin = genPin();
    const nameSafe = firstName.trim().toLowerCase().replace(/\s+/g, "_");
    const email = `${classCode}_${nameSafe}_${studentId.slice(-4)}@students.sionlegacyoriginals.com`;

    await db.execute(sql`
      INSERT INTO users (id, email, is_student, class_id, first_name, avatar, pin, created_at, updated_at)
      VALUES (${studentId}, ${email}, TRUE, ${classId}, ${firstName.trim()}, ${avatar}, ${pin}, NOW(), NOW())
    `);

    const row = await db.execute(sql`
      SELECT id, first_name, avatar, pin, created_at FROM users WHERE id = ${studentId}
    `);
    res.json({ student: row.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Teacher: Remove student ───────────────────────────────────────────────────
router.delete("/classroom/classes/:classId/students/:studentId", requireAuth, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.classId, 10);
    const { studentId } = req.params;

    const cls = await db.execute(sql`
      SELECT id FROM classes WHERE id = ${classId} AND teacher_id = ${req.userId}
    `);
    if (!cls.rows.length) return res.status(403).json({ error: "Forbidden" });

    await db.execute(sql`
      DELETE FROM users WHERE id = ${studentId} AND class_id = ${classId} AND is_student = TRUE
    `);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Teacher: Reset student PIN ────────────────────────────────────────────────
router.post("/classroom/classes/:classId/students/:studentId/reset-pin", requireAuth, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.classId, 10);
    const { studentId } = req.params;

    const cls = await db.execute(sql`
      SELECT id FROM classes WHERE id = ${classId} AND teacher_id = ${req.userId}
    `);
    if (!cls.rows.length) return res.status(403).json({ error: "Forbidden" });

    const newPin = genPin();
    await db.execute(sql`
      UPDATE users SET pin = ${newPin}, updated_at = NOW()
      WHERE id = ${studentId} AND class_id = ${classId} AND is_student = TRUE
    `);
    res.json({ ok: true, pin: newPin });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Public: Look up class by code ─────────────────────────────────────────────
router.get("/classroom/lookup/:classCode", async (req, res) => {
  try {
    const code = (req.params.classCode ?? "").toUpperCase().trim();
    const cls = await db.execute(sql`
      SELECT id, class_name, class_code FROM classes WHERE class_code = ${code}
    `);
    if (!cls.rows.length) return res.status(404).json({ error: "Class not found" });

    const students = await db.execute(sql`
      SELECT id, first_name, avatar
      FROM users
      WHERE class_id = ${cls.rows[0].id as number} AND is_student = TRUE
      ORDER BY first_name ASC
    `);
    res.json({ class: cls.rows[0], students: students.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Public: Student login ─────────────────────────────────────────────────────
router.post("/classroom/login", async (req, res) => {
  try {
    const { studentId, pin } = req.body;
    if (!studentId || !pin) return res.status(400).json({ error: "Student ID and PIN required" });

    const result = await db.execute(sql`
      SELECT u.id, u.first_name, u.avatar, u.pin, u.class_id,
             c.teacher_id, c.class_code, c.class_name
      FROM users u
      JOIN classes c ON c.id = u.class_id
      WHERE u.id = ${studentId} AND u.is_student = TRUE
    `);

    if (!result.rows.length) return res.status(401).json({ error: "Student not found" });

    const row = result.rows[0] as any;
    if (row.pin !== pin) return res.status(401).json({ error: "Incorrect PIN" });

    const token = signStudentToken({
      studentId: row.id,
      classId: row.class_id,
      teacherId: row.teacher_id,
      firstName: row.first_name,
      avatar: row.avatar,
    });

    res.json({
      token,
      student: {
        id: row.id,
        firstName: row.first_name,
        avatar: row.avatar,
        classId: row.class_id,
        className: row.class_name,
        teacherId: row.teacher_id,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Student: My info ──────────────────────────────────────────────────────────
router.get("/classroom/me", requireStudentAuth, async (req: any, res) => {
  try {
    const p = req.studentPayload;
    const cls = await db.execute(sql`
      SELECT class_name, class_code FROM classes WHERE id = ${p.classId}
    `);
    res.json({
      id: p.studentId,
      firstName: p.firstName,
      avatar: p.avatar,
      classId: p.classId,
      className: cls.rows[0]?.class_name ?? "",
      teacherId: p.teacherId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Student: Fetch teacher's stories ─────────────────────────────────────────
router.get("/classroom/stories", requireStudentAuth, async (req: any, res) => {
  try {
    const { teacherId } = req.studentPayload;
    const result = await db.execute(sql`
      SELECT id, title, child_name, cover_image_url, created_at
      FROM stories
      WHERE user_id = ${teacherId} AND deleted_at IS NULL
      ORDER BY created_at DESC
    `);
    res.json({ stories: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Student: Read a single story ──────────────────────────────────────────────
router.get("/classroom/stories/:id", requireStudentAuth, async (req: any, res) => {
  try {
    const { teacherId } = req.studentPayload;
    const storyId = parseInt(req.params.id, 10);
    const result = await db.execute(sql`
      SELECT id, title, child_name, content, cover_image_url, illustration_urls
      FROM stories
      WHERE id = ${storyId} AND user_id = ${teacherId} AND deleted_at IS NULL
    `);
    if (!result.rows.length) return res.status(404).json({ error: "Story not found" });
    res.json({ story: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
