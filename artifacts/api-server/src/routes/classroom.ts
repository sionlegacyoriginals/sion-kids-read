import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, requireStudentAuth, signStudentToken } from "../lib/auth";
import { openai } from "@workspace/integrations-openai-ai-server";
import { sendParentStoryPublished, sendParentAnnouncement } from "../lib/mailerService";

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

// ── Teacher: Save weekly announcement + point config ──────────────────────────
router.put("/classroom/classes/:classId/announcement", requireAuth, async (req: any, res) => {
  try {
    const { classId } = req.params;
    const { message, valueOfWeek, sightWords, dueDate, pointValuePerSightWord, pointsForPublished } = req.body;

    const check = await db.execute(sql`SELECT id FROM classes WHERE id = ${Number(classId)} AND teacher_id = ${req.userId}`);
    if (!check.rows.length) return res.status(403).json({ error: "Not your class." });

    await db.execute(sql`
      UPDATE classes SET
        announcement_message        = ${message ?? null},
        value_of_week               = ${valueOfWeek ?? null},
        sight_words                 = ${sightWords ?? null},
        assignment_due_date         = ${dueDate ?? null},
        announcement_updated_at     = NOW(),
        point_value_per_sight_word  = ${pointValuePerSightWord ?? 1},
        points_for_published        = ${pointsForPublished ?? 5}
      WHERE id = ${Number(classId)}
    `);

    // Archive this announcement to history
    await db.execute(sql`
      INSERT INTO announcement_history
        (class_id, message, value_of_week, sight_words, assignment_due_date,
         point_value_per_sight_word, points_for_published)
      VALUES
        (${Number(classId)}, ${message ?? null}, ${valueOfWeek ?? null},
         ${sightWords ?? null}, ${dueDate ?? null},
         ${pointValuePerSightWord ?? 1}, ${pointsForPublished ?? 5})
    `);
    // Email all linked parents in this class (fire-and-forget)
    const portalUrl = `${process.env.APP_URL ?? "https://sionlegacyoriginals.com"}/parent`;
    const sightWordList = (sightWords ?? "").split(",").map((w: string) => w.trim()).filter(Boolean);
    db.execute(sql`
      SELECT DISTINCT pl.parent_user_id, u.email AS parent_email, u.full_name AS parent_name,
             s.first_name AS student_name, c.class_name
      FROM parent_links pl
      JOIN users u ON u.id = pl.parent_user_id
      JOIN users s ON s.id = pl.student_id
      JOIN classes c ON c.id = pl.class_id
      WHERE pl.class_id = ${Number(classId)}
        AND u.email IS NOT NULL
    `).then(parents => {
      for (const p of parents.rows as any[]) {
        if (p.parent_email) {
          sendParentAnnouncement({
            parentEmail: p.parent_email,
            parentName:  p.parent_name ?? p.parent_email,
            studentName: p.student_name,
            className:   p.class_name,
            message:     message ?? undefined,
            valueOfWeek: valueOfWeek ?? undefined,
            sightWords:  sightWordList.length ? sightWordList : undefined,
            dueDate:     dueDate ?? undefined,
            classPortalUrl: portalUrl,
          }).catch(() => {});
        }
      }
    }).catch(() => {});

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Teacher: Announcement history ────────────────────────────────────────────
router.get("/classroom/classes/:classId/announcement-history", requireAuth, async (req: any, res) => {
  try {
    const { classId } = req.params;
    const check = await db.execute(sql`SELECT id FROM classes WHERE id = ${Number(classId)} AND teacher_id = ${req.userId}`);
    if (!check.rows.length) return res.status(403).json({ error: "Not your class." });

    const result = await db.execute(sql`
      SELECT id, message, value_of_week, sight_words, assignment_due_date,
             point_value_per_sight_word, points_for_published, posted_at
      FROM announcement_history
      WHERE class_id = ${Number(classId)}
      ORDER BY posted_at DESC
      LIMIT 52
    `);
    res.json({ history: result.rows });
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
    const [cls, me] = await Promise.all([
      db.execute(sql`SELECT class_name, class_code FROM classes WHERE id = ${p.classId}`),
      db.execute(sql`SELECT points FROM users WHERE id = ${p.studentId}`),
    ]);
    res.json({
      id: p.studentId,
      firstName: p.firstName,
      avatar: p.avatar,
      classId: p.classId,
      className: cls.rows[0]?.class_name ?? "",
      teacherId: p.teacherId,
      points: (me.rows[0] as any)?.points ?? 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Student: Submit a story for teacher approval ──────────────────────────────
router.post("/classroom/student-stories", requireStudentAuth, async (req: any, res) => {
  try {
    const { prompt, avatarPaths } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: "Please describe what your story is about." });

    const p = req.studentPayload;

    // Get class info (sight words, value, teacher)
    const clsRes = await db.execute(sql`
      SELECT sight_words, value_of_week, teacher_id FROM classes WHERE id = ${p.classId}
    `);
    const cls = clsRes.rows[0] as any;
    const sightWords: string[] = cls?.sight_words
      ? cls.sight_words.split(",").map((w: string) => w.trim()).filter(Boolean)
      : [];
    const valueOfWeek: string = cls?.value_of_week ?? "";

    // Build prompt
    const sightWordLine = sightWords.length
      ? `\nYou MUST use each of these sight words naturally in a sentence: ${sightWords.join(", ")}.`
      : "";
    const valueLine = valueOfWeek
      ? `\nThe story should show or teach the value of "${valueOfWeek}".`
      : "";

    const systemPrompt = `You are a warm, encouraging children's story author writing for elementary school students. Write a short story (3–4 paragraphs) appropriate for young readers. Use simple, clear language. Start with a title on its own line in the format: TITLE: [story title]`;
    const userPrompt = `A student named ${p.firstName} wants to write this story: "${prompt.trim()}"${sightWordLine}${valueLine}\n\nWrite a short, engaging story that fulfills this request.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 600,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const titleMatch = raw.match(/^TITLE:\s*(.+)/m);
    const title = titleMatch?.[1]?.trim() ?? `${p.firstName}'s Story`;
    const content = raw.replace(/^TITLE:\s*.+\n?/m, "").trim();

    // Validated avatar paths — must be /ref-photos/avatar_* to prevent injection
    const validAvatarPaths = Array.isArray(avatarPaths)
      ? (avatarPaths as string[]).filter((p) => typeof p === "string" && p.startsWith("/ref-photos/avatar_"))
      : [];
    const referenceImagePathsJson = validAvatarPaths.length > 0
      ? JSON.stringify(validAvatarPaths)
      : null;

    // Save to stories table, linked to teacher's account, marked pending
    const saved = await db.execute(sql`
      INSERT INTO stories (user_id, child_name, child_age, child_gender, theme, title, content,
        submitted_by_student_id, story_status, reference_image_paths, created_at, updated_at)
      VALUES (
        ${cls.teacher_id}, ${p.firstName}, 8, 'neutral',
        ${valueOfWeek || 'general'}, ${title}, ${content},
        ${p.studentId}, 'pending', ${referenceImagePathsJson}, NOW(), NOW()
      )
      RETURNING id, title, content
    `);

    const storyId = (saved.rows[0] as any).id;

    // If avatars were picked, generate cover art in the background (same as parent flow)
    if (validAvatarPaths.length > 0) {
      const { generateStoryImages } = await import("../lib/storyImages");
      generateStoryImages({
        childName: p.firstName,
        childAge: 8,
        childGender: "neutral",
        theme: valueOfWeek || "general",
        storyTitle: title,
        storyContent: content,
        referenceImagePaths: validAvatarPaths,
      }).then(async ({ coverImagePath, illustrationPaths }) => {
        await db.execute(sql`
          UPDATE stories
          SET cover_image_url   = ${coverImagePath},
              illustration_urls = ${JSON.stringify(illustrationPaths)},
              updated_at        = NOW()
          WHERE id = ${storyId}
        `);
      }).catch(() => { /* background — silent failure is OK */ });
    }

    res.json({ story: saved.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Teacher: List pending student stories ─────────────────────────────────────
router.get("/classroom/pending-stories", requireAuth, async (req: any, res) => {
  try {
    const result = await db.execute(sql`
      SELECT s.id, s.title, s.content, s.created_at,
             u.first_name AS student_name, u.avatar AS student_avatar,
             u.id AS student_id, c.class_name, c.id AS class_id,
             c.sight_words, c.point_value_per_sight_word, c.points_for_published
      FROM stories s
      JOIN users u ON u.id = s.submitted_by_student_id
      JOIN classes c ON c.id = u.class_id
      WHERE s.user_id = ${req.userId}
        AND s.story_status = 'pending'
        AND s.deleted_at IS NULL
      ORDER BY s.created_at ASC
    `);
    res.json({ stories: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Teacher: Approve a student story + award points ───────────────────────────
router.post("/classroom/pending-stories/:storyId/approve", requireAuth, async (req: any, res) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);

    const storyRes = await db.execute(sql`
      SELECT s.id, s.title, s.content, s.submitted_by_student_id,
             u.first_name AS student_name, u.avatar AS student_avatar,
             c.sight_words, c.point_value_per_sight_word, c.points_for_published,
             c.class_name
      FROM stories s
      JOIN users u ON u.id = s.submitted_by_student_id
      JOIN classes c ON c.id = u.class_id
      WHERE s.id = ${storyId} AND s.user_id = ${req.userId} AND s.story_status = 'pending'
    `);
    if (!storyRes.rows.length) return res.status(404).json({ error: "Story not found." });

    const story = storyRes.rows[0] as any;

    const sightWords: string[] = story.sight_words
      ? story.sight_words.split(",").map((w: string) => w.trim().toLowerCase()).filter(Boolean)
      : [];
    const contentLower = (story.content ?? "").toLowerCase();
    const matchedWords = sightWords.filter(w => contentLower.includes(w));
    const pointsEarned =
      (matchedWords.length * (story.point_value_per_sight_word ?? 1)) +
      (story.points_for_published ?? 5);

    await Promise.all([
      db.execute(sql`UPDATE stories SET story_status = 'published', updated_at = NOW() WHERE id = ${storyId}`),
      db.execute(sql`UPDATE users SET points = points + ${pointsEarned} WHERE id = ${story.submitted_by_student_id}`),
    ]);

    // Email linked parents (fire-and-forget)
    const portalUrl = `${process.env.APP_URL ?? "https://sionlegacyoriginals.com"}/parent`;
    db.execute(sql`
      SELECT pl.parent_user_id, u.email AS parent_email, u.full_name AS parent_name
      FROM parent_links pl
      JOIN users u ON u.id = pl.parent_user_id
      WHERE pl.student_id = ${story.submitted_by_student_id}
    `).then(parents => {
      for (const p of parents.rows as any[]) {
        if (p.parent_email) {
          sendParentStoryPublished({
            parentEmail: p.parent_email,
            parentName: p.parent_name ?? "Parent",
            studentName: story.student_name,
            studentAvatar: story.student_avatar ?? "🌟",
            storyTitle: story.title,
            storyContent: story.content,
            pointsAwarded: pointsEarned,
            classPortalUrl: portalUrl,
          }).catch(() => {});
        }
      }
    }).catch(() => {});

    res.json({ ok: true, pointsAwarded: pointsEarned, sightWordsFound: matchedWords });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Teacher: Reject a student story ──────────────────────────────────────────
router.post("/classroom/pending-stories/:storyId/reject", requireAuth, async (req: any, res) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    await db.execute(sql`
      UPDATE stories SET story_status = 'rejected', updated_at = NOW()
      WHERE id = ${storyId} AND user_id = ${req.userId}
    `);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Student: Fetch teacher's stories ─────────────────────────────────────────
router.get("/classroom/stories", requireStudentAuth, async (req: any, res) => {
  try {
    const { teacherId } = req.studentPayload;
    const result = await db.execute(sql`
      SELECT id, title, child_name, cover_image_url, created_at,
             submitted_by_student_id, story_status
      FROM stories
      WHERE user_id = ${teacherId}
        AND deleted_at IS NULL
        AND (story_status = 'teacher' OR story_status = 'published')
      ORDER BY created_at DESC
    `);
    const domain = (req as any).hostname;
    const toAbsUrl = (p: string | null) =>
      p ? (p.startsWith("/ref-photos/") ? `https://${domain}/api${p}` : `https://${domain}/api/storage${p}`) : null;
    const stories = (result.rows as any[]).map(s => ({
      ...s,
      cover_image_url: toAbsUrl(s.cover_image_url),
    }));
    res.json({ stories });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Student: Read a single story ──────────────────────────────────────────────
router.get("/classroom/stories/:id", requireStudentAuth, async (req: any, res) => {
  try {
    const { teacherId, studentId, classId } = req.studentPayload;
    const storyId = parseInt(req.params.id, 10);
    const result = await db.execute(sql`
      SELECT id, title, child_name, content, cover_image_url, illustration_urls,
             submitted_by_student_id
      FROM stories
      WHERE id = ${storyId} AND user_id = ${teacherId} AND deleted_at IS NULL
    `);
    if (!result.rows.length) return res.status(404).json({ error: "Story not found" });

    // Fetch class sight words for exercises
    const clsRes = await db.execute(sql`SELECT sight_words FROM classes WHERE id = ${classId}`);
    const sightWords = (clsRes.rows[0] as any)?.sight_words ?? "";

    // Has this student already read this story?
    const readRes = await db.execute(sql`
      SELECT id FROM story_reads WHERE student_id = ${studentId} AND story_id = ${storyId}
    `);

    // Which exercise types has this student completed?
    const compRes = await db.execute(sql`
      SELECT exercise_type FROM exercise_completions
      WHERE student_id = ${studentId} AND story_id = ${storyId}
    `);

    const domain = (req as any).hostname;
    const toAbsUrl = (p: string | null) =>
      p ? (p.startsWith("/ref-photos/") ? `https://${domain}/api${p}` : `https://${domain}/api/storage${p}`) : null;
    const raw = result.rows[0] as any;
    const story = {
      ...raw,
      cover_image_url: toAbsUrl(raw.cover_image_url),
      illustration_urls: Array.isArray(raw.illustration_urls)
        ? raw.illustration_urls.map(toAbsUrl)
        : (typeof raw.illustration_urls === "string"
          ? (JSON.parse(raw.illustration_urls) as string[]).map(toAbsUrl)
          : []),
    };
    res.json({
      story,
      sightWords,
      alreadyRead: readRes.rows.length > 0,
      completedExerciseTypes: (compRes.rows as any[]).map(r => r.exercise_type),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Student: Mark story as read + award points ─────────────────────────────
router.post("/classroom/stories/:storyId/read", requireStudentAuth, async (req: any, res) => {
  try {
    const { studentId } = req.studentPayload;
    const storyId = parseInt(req.params.storyId, 10);
    const READ_POINTS = 2;

    // Can't earn points for your own story
    const storyRes = await db.execute(sql`
      SELECT submitted_by_student_id FROM stories WHERE id = ${storyId} AND deleted_at IS NULL
    `);
    if (!storyRes.rows.length) return res.status(404).json({ error: "Story not found" });
    const isOwn = (storyRes.rows[0] as any).submitted_by_student_id === studentId;

    // Insert read record (ignore conflict = already read)
    const insertRes = await db.execute(sql`
      INSERT INTO story_reads (student_id, story_id)
      VALUES (${studentId}, ${storyId})
      ON CONFLICT (student_id, story_id) DO NOTHING
      RETURNING id
    `);

    const isNew = insertRes.rows.length > 0;
    let pointsAwarded = 0;

    if (isNew && !isOwn) {
      pointsAwarded = READ_POINTS;
      await db.execute(sql`
        UPDATE users SET points = points + ${READ_POINTS} WHERE id = ${studentId}
      `);
    }

    res.json({ ok: true, pointsAwarded, alreadyRead: !isNew });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Student: Get exercises for a story (generate + cache if not exist) ─────
router.get("/classroom/stories/:storyId/exercises", requireStudentAuth, async (req: any, res) => {
  try {
    const { teacherId, classId, studentId } = req.studentPayload;
    const storyId = parseInt(req.params.storyId, 10);

    // Verify access
    const storyRes = await db.execute(sql`
      SELECT id, title, content FROM stories
      WHERE id = ${storyId} AND user_id = ${teacherId} AND deleted_at IS NULL
    `);
    if (!storyRes.rows.length) return res.status(404).json({ error: "Story not found" });
    const story = storyRes.rows[0] as any;

    // Check cache
    const cached = await db.execute(sql`
      SELECT exercises_json FROM story_exercises WHERE story_id = ${storyId}
    `);
    if (cached.rows.length) {
      const completions = await db.execute(sql`
        SELECT exercise_type FROM exercise_completions
        WHERE student_id = ${studentId} AND story_id = ${storyId}
      `);
      return res.json({
        exercises: JSON.parse((cached.rows[0] as any).exercises_json),
        completedTypes: (completions.rows as any[]).map(r => r.exercise_type),
      });
    }

    // Get class sight words
    const clsRes = await db.execute(sql`SELECT sight_words FROM classes WHERE id = ${classId}`);
    const sightWordsRaw = (clsRes.rows[0] as any)?.sight_words ?? "";
    const sightWords = sightWordsRaw.split(",").map((w: string) => w.trim()).filter(Boolean);

    // Generate exercises with AI
    const sightWordInstruction = sightWords.length
      ? `Sight words to use (find sentences in the story that contain these and blank them out): ${sightWords.slice(0, 3).join(", ")}.`
      : "Pick 3 important words from the story to use as fill-in-the-blank.";

    const prompt = `You are creating reading exercises for an elementary school student who just read this story.

STORY TITLE: ${story.title}
STORY:
${story.content}

${sightWordInstruction}

Create exactly this JSON (no other text):
{
  "sightWordExercises": [
    {
      "sentence": "The ___ went to school.",
      "answer": "dog",
      "options": ["dog", "cat", "bird", "fish"]
    }
  ],
  "comprehensionQuestions": [
    {
      "question": "Who is the main character?",
      "answer": "Buddy",
      "options": ["Buddy", "Calvin", "Emily", "Sara"]
    }
  ]
}

Rules:
- sightWordExercises: exactly 3 items. Use actual sentences from the story with one key word blanked as "___". The answer must match one of the 4 options. Options should be plausible but only one correct.
- comprehensionQuestions: exactly 3 items. Questions about who/what/where/why. One clearly correct answer.
- All answers must be findable in the story.
- Keep language simple for young readers.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let exercises: any;
    try { exercises = JSON.parse(raw); } catch { exercises = { sightWordExercises: [], comprehensionQuestions: [] }; }

    // Cache it
    await db.execute(sql`
      INSERT INTO story_exercises (story_id, exercises_json)
      VALUES (${storyId}, ${JSON.stringify(exercises)})
      ON CONFLICT (story_id) DO NOTHING
    `);

    const completions = await db.execute(sql`
      SELECT exercise_type FROM exercise_completions
      WHERE student_id = ${studentId} AND story_id = ${storyId}
    `);

    res.json({
      exercises,
      completedTypes: (completions.rows as any[]).map(r => r.exercise_type),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Student: Submit exercise answers + award points ────────────────────────
router.post("/classroom/stories/:storyId/exercises/complete", requireStudentAuth, async (req: any, res) => {
  try {
    const { studentId } = req.studentPayload;
    const storyId = parseInt(req.params.storyId, 10);
    const { exerciseType, correctCount } = req.body;
    // exerciseType: "sightwords" | "comprehension"
    // correctCount: number of correct answers the student got

    if (!exerciseType || correctCount == null) {
      return res.status(400).json({ error: "exerciseType and correctCount required" });
    }

    const pointsToAward = Math.max(0, parseInt(correctCount, 10));

    const insertRes = await db.execute(sql`
      INSERT INTO exercise_completions (student_id, story_id, exercise_type, points_awarded)
      VALUES (${studentId}, ${storyId}, ${exerciseType}, ${pointsToAward})
      ON CONFLICT (student_id, story_id, exercise_type) DO NOTHING
      RETURNING id
    `);

    const isNew = insertRes.rows.length > 0;
    if (isNew && pointsToAward > 0) {
      await db.execute(sql`
        UPDATE users SET points = points + ${pointsToAward} WHERE id = ${studentId}
      `);
    }

    res.json({ ok: true, pointsAwarded: isNew ? pointsToAward : 0, alreadyCompleted: !isNew });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Teacher: Read a story in class mode (Clerk auth) ──────────────────────
router.get("/classroom/teacher/stories/:storyId", requireAuth, async (req: any, res) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    const result = await db.execute(sql`
      SELECT id, title, child_name, content, cover_image_url, illustration_urls
      FROM stories
      WHERE id = ${storyId} AND user_id = ${req.userId} AND deleted_at IS NULL
    `);
    if (!result.rows.length) return res.status(404).json({ error: "Story not found" });
    res.json({ story: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Parent: Look up students by class code ────────────────────────────────────
router.get("/classroom/parent/class-students", requireAuth, async (req: any, res) => {
  try {
    const code = (req.query.code as string ?? "").toUpperCase().trim();
    if (!code) return res.status(400).json({ error: "code is required" });

    const cls = await db.execute(sql`
      SELECT id FROM classes WHERE UPPER(class_code) = ${code} AND is_active = TRUE
    `);
    if (!cls.rows.length) return res.status(404).json({ error: "Class not found. Check the code with the teacher." });

    const classId = (cls.rows[0] as any).id;
    const students = await db.execute(sql`
      SELECT id, first_name, avatar FROM users
      WHERE class_id = ${classId} AND is_student = TRUE
      ORDER BY first_name ASC
    `);
    res.json({ classId, students: students.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Parent: Link to a child ───────────────────────────────────────────────────
router.post("/classroom/parent/link", requireAuth, async (req: any, res) => {
  try {
    const { classCode, studentId } = req.body;
    if (!classCode || !studentId) return res.status(400).json({ error: "classCode and studentId required" });

    // Verify the student belongs to the class with that code
    const check = await db.execute(sql`
      SELECT u.id, u.class_id FROM users u
      JOIN classes c ON c.id = u.class_id
      WHERE u.id = ${studentId} AND u.is_student = TRUE
        AND UPPER(c.class_code) = ${classCode.toUpperCase().trim()}
    `);
    if (!check.rows.length) return res.status(404).json({ error: "Student not found in that class." });

    const classId = (check.rows[0] as any).class_id;

    // Store parent's email/name from Clerk token (if available via session)
    await db.execute(sql`
      INSERT INTO parent_links (parent_user_id, student_id, class_id)
      VALUES (${req.userId}, ${studentId}, ${classId})
      ON CONFLICT (parent_user_id, student_id) DO NOTHING
    `);

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Parent: Dashboard (all linked children) ───────────────────────────────────
router.get("/classroom/parent/dashboard", requireAuth, async (req: any, res) => {
  try {
    // All students this parent is linked to
    const links = await db.execute(sql`
      SELECT pl.student_id, pl.class_id,
             s.first_name, s.avatar, s.points,
             c.class_name, c.teacher_id,
             c.announcement_message, c.value_of_week, c.sight_words,
             c.assignment_due_date, c.announcement_updated_at
      FROM parent_links pl
      JOIN users s ON s.id = pl.student_id
      JOIN classes c ON c.id = pl.class_id
      WHERE pl.parent_user_id = ${req.userId}
      ORDER BY s.first_name ASC
    `);

    const children = await Promise.all((links.rows as any[]).map(async (child) => {
      // Child's own stories (all statuses except rejected)
      const myStoriesRes = await db.execute(sql`
        SELECT id, title, content, story_status, created_at
        FROM stories
        WHERE submitted_by_student_id = ${child.student_id}
          AND story_status IN ('pending', 'published')
          AND deleted_at IS NULL
        ORDER BY created_at DESC
      `);

      // All published stories in this class (teacher + student)
      const classStoriesRes = await db.execute(sql`
        SELECT s.id, s.title, s.content, s.cover_image_url,
               s.submitted_by_student_id,
               u.first_name AS student_name, u.avatar AS student_avatar,
               s.child_name
        FROM stories s
        LEFT JOIN users u ON u.id = s.submitted_by_student_id
        WHERE s.user_id = ${child.teacher_id}
          AND (s.story_status = 'teacher' OR s.story_status = 'published')
          AND s.deleted_at IS NULL
        ORDER BY s.created_at DESC
        LIMIT 30
      `);

      return {
        id: child.student_id,
        first_name: child.first_name,
        avatar: child.avatar,
        points: child.points,
        class_name: child.class_name,
        announcement: {
          announcement_message: child.announcement_message,
          value_of_week: child.value_of_week,
          sight_words: child.sight_words,
          assignment_due_date: child.assignment_due_date,
          announcement_updated_at: child.announcement_updated_at,
        },
        my_stories: myStoriesRes.rows,
        class_stories: classStoriesRes.rows,
      };
    }));

    res.json({ children });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
