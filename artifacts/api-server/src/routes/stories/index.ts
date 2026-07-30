import { randomUUID } from "crypto";
import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, storiesTable } from "@workspace/db";
import {
  CreateStoryBody,
  GetStoryParams,
  UpdateStoryParams,
  UpdateStoryBody,
  DeleteStoryParams,
  RegenerateStoryParams,
  GetStoryResponse,
  GetStoryStatsResponse,
  ListStoriesResponse,
  GetRecentStoriesResponse,
  UpdateStoryResponse,
  RegenerateStoryResponse,
  CreateStoryResponse,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import { ObjectStorageService } from "../../lib/objectStorage";
import { requireAuth, ensureUser, hasActiveSubscription } from "../../lib/auth";

const router: IRouter = Router();

function serializeStory(story: Record<string, unknown>) {
  return {
    ...story,
    createdAt:
      story.createdAt instanceof Date ? story.createdAt.toISOString() : story.createdAt,
    updatedAt:
      story.updatedAt instanceof Date ? story.updatedAt.toISOString() : story.updatedAt,
  };
}

function buildStoryPrompt(params: {
  childName: string;
  childAge: number;
  childGender: string;
  milestones?: string | null;
  theme: string;
  customPrompt?: string | null;
  bibleVerse?: string | null;
}): string {
  const pronouns =
    params.childGender === "boy"
      ? { subject: "he", object: "him", possessive: "his" }
      : { subject: "she", object: "her", possessive: "her" };

  const milestonesLine = params.milestones
    ? `Include these personal details naturally in the story: ${params.milestones}.`
    : "";
  const customLine = params.customPrompt
    ? `Custom plot direction: ${params.customPrompt}.`
    : "";
  const bibleLine =
    params.bibleVerse === "auto"
      ? `Weave one fitting Bible verse into the story naturally — choose a verse that powerfully reinforces the theme of ${params.theme}. Quote it exactly (with book, chapter, and verse reference) at the moment in the story where it feels most meaningful.`
      : params.bibleVerse
        ? `Weave this Bible verse into the story naturally: "${params.bibleVerse}". Quote it at the moment where it feels most meaningful.`
        : "";

  return `You are a master children's story author. Write a warm, wholesome, age-appropriate children's story for a ${params.childAge}-year-old child named ${params.childName}.

Theme/value to reinforce: ${params.theme}

${milestonesLine}
${customLine}
${bibleLine}

Requirements:
- The story should be engaging, imaginative, and age-appropriate for a ${params.childAge}-year-old.
- Refer to ${params.childName} using ${pronouns.subject}/${pronouns.object}/${pronouns.possessive} pronouns.
- Follow classic children's story structure: an engaging opening, a gentle challenge that tests the theme of ${params.theme}, and a positive resolution.
- Keep it wholesome, kind, and uplifting. No scary content.
- Length: 4–6 paragraphs (appropriate for a bedtime story).
- Write in a warm, lyrical style with vivid imagery.

First, output ONLY a creative story title on the very first line starting with "TITLE: ".
Then output the full story starting on the next line. Do not include any other preamble.`;
}

// ─── Image generation ────────────────────────────────────────────────────────

async function generateStoryImages(params: {
  childName: string;
  childAge: number;
  childGender: string;
  theme: string;
  storyTitle: string;
  storyContent: string;
  referenceImagePaths: string[];
}): Promise<{ coverImagePath: string; illustrationPaths: string[] }> {
  const objectStorage = new ObjectStorageService();

  const base64Images = (
    await Promise.all(
      params.referenceImagePaths.slice(0, 5).map(async (objectPath) => {
        try {
          // DB-backed reference photos (new path)
          if (objectPath.startsWith("/ref-photos/")) {
            const photoId = objectPath.slice("/ref-photos/".length);
            const result = await db.execute(
              sql`SELECT data_url FROM reference_photos WHERE id = ${photoId}`,
            );
            const dataUrl = result.rows[0]?.data_url as string | undefined;
            return dataUrl ?? null;
          }
          // Legacy GCS path (kept for old stories but will likely 401)
          const file = await objectStorage.getObjectEntityFile(objectPath);
          const response = await objectStorage.downloadObject(file);
          const buffer = Buffer.from(await response.arrayBuffer());
          const contentType = response.headers.get("content-type") || "image/jpeg";
          return `data:${contentType};base64,${buffer.toString("base64")}`;
        } catch {
          return null;
        }
      }),
    )
  ).filter((x): x is string => x !== null);

  const childBase = `a ${params.childAge}-year-old ${params.childGender === "boy" ? "boy" : "girl"}`;
  let childDescription = childBase;

  if (base64Images.length > 0) {
    try {
      const visionResponse = await openai.chat.completions.create({
        model: "gpt-5.6-luna",
        max_completion_tokens: 200,
        messages: [
          {
            role: "user",
            content: [
              ...base64Images.map((url) => ({
                type: "image_url" as const,
                image_url: { url, detail: "low" as const },
              })),
              {
                type: "text" as const,
                text: "Describe this child's physical appearance for a storybook illustration: hair color, hair style, eye color, and skin tone. Two concise sentences, appearance only.",
              },
            ],
          },
        ],
      });
      const desc = visionResponse.choices[0]?.message?.content;
      if (desc) childDescription = `${childBase} — ${desc}`;
    } catch {
      // Fall back to generic description
    }
  }

  const paragraphs = params.storyContent.split("\n").filter(Boolean);
  const scene1 = (paragraphs[1] ?? paragraphs[0] ?? "").slice(0, 250);
  const scene2 = (paragraphs[3] ?? paragraphs[2] ?? paragraphs[0] ?? "").slice(0, 250);

  const bookStyle =
    "warm watercolor children's book illustration, soft pastel palette, gentle line art, cozy and whimsical, suitable for a bedtime story, no text";

  const coverPrompt = `${bookStyle}. Full storybook cover art for "${params.storyTitle}". The main character is ${childDescription}, shown in a magical scene that embodies the theme of ${params.theme}. Inviting, heartwarming, beautiful composition.`;
  const illus1Prompt = `${bookStyle}. Interior story illustration: ${childDescription} in this scene — ${scene1}`;
  const illus2Prompt = `${bookStyle}. Interior story illustration: ${childDescription} in this scene — ${scene2}`;

  const [coverBuffer, illus1Buffer, illus2Buffer] = await Promise.all([
    generateImageBuffer(coverPrompt, "1024x1024"),
    generateImageBuffer(illus1Prompt, "1024x1024"),
    generateImageBuffer(illus2Prompt, "1024x1024"),
  ]);

  async function storeBuffer(buffer: Buffer): Promise<string> {
    const id = randomUUID();
    const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
    await db.execute(sql`INSERT INTO reference_photos (id, data_url) VALUES (${id}, ${dataUrl})`);
    return `/ref-photos/${id}`;
  }

  const [coverImagePath, illus1Path, illus2Path] = await Promise.all([
    storeBuffer(coverBuffer),
    storeBuffer(illus1Buffer),
    storeBuffer(illus2Buffer),
  ]);

  return { coverImagePath, illustrationPaths: [illus1Path, illus2Path] };
}

// ─── Story text generation ────────────────────────────────────────────────────

async function generateStory(params: {
  childName: string;
  childAge: number;
  childGender: string;
  milestones?: string | null;
  theme: string;
  customPrompt?: string | null;
  bibleVerse?: string | null;
}): Promise<{ title: string; content: string }> {
  const prompt = buildStoryPrompt(params);
  const response = await openai.chat.completions.create({
    model: "gpt-5.6-luna",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 1500,
  });

  const text = response.choices[0]?.message?.content ?? "";
  const lines = text.split("\n");
  const titleLine = lines[0] ?? "";
  const title = titleLine.startsWith("TITLE: ")
    ? titleLine.slice(7).trim()
    : `${params.childName}'s Story of ${params.theme}`;
  const content = lines.slice(1).join("\n").trim();
  return { title, content };
}

// ─── Subscription gate helper ─────────────────────────────────────────────────

async function checkStoryAccess(userId: string): Promise<{ allowed: boolean; reason?: string; usedCredit?: boolean }> {
  // Check user record
  const userRow = await db.execute(
    sql`SELECT stripe_customer_id, has_access_code, story_credits FROM users WHERE id = ${userId}`,
  );
  const row = userRow.rows[0];

  // Access code holders get unlimited stories
  if (row?.has_access_code) return { allowed: true };

  // Active subscription = unlimited stories
  const customerId = (row?.stripe_customer_id as string) ?? null;
  const subscribed = await hasActiveSubscription(customerId);
  if (subscribed) return { allowed: true };

  // Story credits (pay-per-story)
  const credits = parseInt((row?.story_credits as string) ?? "0", 10);
  if (credits > 0) return { allowed: true, usedCredit: true };

  return {
    allowed: false,
    reason: "Purchase a story or subscribe to generate stories",
  };
}

// ── GET /stories ──────────────────────────────────────────────────────────────
router.get("/stories", requireAuth, async (req: any, res): Promise<void> => {
  await ensureUser(req.userId);
  const stories = await db
    .select()
    .from(storiesTable)
    .where(eq(storiesTable.userId, req.userId))
    .orderBy(desc(storiesTable.createdAt));
  res.json(ListStoriesResponse.parse(stories.map(serializeStory)));
});

// ── POST /stories ─────────────────────────────────────────────────────────────
router.post("/stories", requireAuth, async (req: any, res): Promise<void> => {
  await ensureUser(req.userId);

  // Subscription / credit gate
  const access = await checkStoryAccess(req.userId);
  if (!access.allowed) {
    res.status(402).json({ error: access.reason, code: "SUBSCRIPTION_REQUIRED" });
    return;
  }

  // Consume one story credit if that's what unlocked access
  if (access.usedCredit) {
    await db.execute(
      sql`UPDATE users SET story_credits = story_credits - 1, updated_at = NOW() WHERE id = ${req.userId}`,
    );
  }

  const parsed = CreateStoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { childName, childAge, childGender, milestones, theme, customPrompt, bibleVerse, referenceImagePaths } =
    parsed.data;

  const { title, content } = await generateStory({
    childName, childAge, childGender, milestones, theme, customPrompt, bibleVerse,
  });

  // Insert story immediately so we can respond before the 60-second proxy timeout.
  // Images are generated in the background and written back once ready.
  const [story] = await db
    .insert(storiesTable)
    .values({
      userId: req.userId,
      childName, childAge, childGender,
      milestones: milestones ?? null,
      theme,
      customPrompt: customPrompt ?? null,
      bibleVerse: bibleVerse ?? null,
      referenceImagePaths: referenceImagePaths ?? null,
      coverImageUrl: null,
      illustrationUrls: null,
      title,
      content,
    })
    .returning();

  res.status(201).json(CreateStoryResponse.parse(serializeStory(story)));

  // Generate images in the background after responding
  if (referenceImagePaths) {
    setImmediate(async () => {
      try {
        const paths = JSON.parse(referenceImagePaths) as string[];
        if (paths.length > 0) {
          const { coverImagePath, illustrationPaths } = await generateStoryImages({
            childName, childAge, childGender, theme,
            storyTitle: title, storyContent: content, referenceImagePaths: paths,
          });
          await db.execute(sql`
            UPDATE stories
            SET cover_image_url   = ${coverImagePath},
                illustration_urls = ${JSON.stringify(illustrationPaths)},
                updated_at        = NOW()
            WHERE id = ${story.id}
          `);
        }
      } catch (err) {
        console.error("Background image generation failed:", err);
      }
    });
  }
});

// ── GET /stories/stats ────────────────────────────────────────────────────────
router.get("/stories/stats", requireAuth, async (req: any, res): Promise<void> => {
  await ensureUser(req.userId);

  const [total, byTheme, recent] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` })
      .from(storiesTable)
      .where(eq(storiesTable.userId, req.userId)),
    db.select({ theme: storiesTable.theme, count: sql<number>`count(*)::int` })
      .from(storiesTable)
      .where(eq(storiesTable.userId, req.userId))
      .groupBy(storiesTable.theme)
      .orderBy(desc(sql`count(*)`)),
    db.select({ childName: storiesTable.childName })
      .from(storiesTable)
      .where(eq(storiesTable.userId, req.userId))
      .orderBy(desc(storiesTable.createdAt))
      .limit(1),
  ]);

  res.json(
    GetStoryStatsResponse.parse({
      totalStories: total[0]?.count ?? 0,
      byTheme,
      mostRecentChildName: recent[0]?.childName ?? null,
    }),
  );
});

// ── GET /stories/recent ───────────────────────────────────────────────────────
router.get("/stories/recent", requireAuth, async (req: any, res): Promise<void> => {
  await ensureUser(req.userId);
  const stories = await db
    .select()
    .from(storiesTable)
    .where(eq(storiesTable.userId, req.userId))
    .orderBy(desc(storiesTable.createdAt))
    .limit(5);
  res.json(GetRecentStoriesResponse.parse(stories.map(serializeStory)));
});

// ── GET /stories/:id ──────────────────────────────────────────────────────────
router.get("/stories/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = GetStoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [story] = await db.select().from(storiesTable)
    .where(eq(storiesTable.id, params.data.id));

  if (!story) { res.status(404).json({ error: "Story not found" }); return; }
  if (story.userId && story.userId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  // Disable HTTP caching so the client always gets fresh data while images are being painted
  res.setHeader("Cache-Control", "no-store");
  res.json(GetStoryResponse.parse(serializeStory(story)));
});

// ── POST /stories/save-shared ── clone a public story into the current user's library ──
router.post("/stories/save-shared", requireAuth, async (req: any, res): Promise<void> => {
  const { storyId } = req.body;
  if (!storyId || typeof storyId !== "number") {
    res.status(400).json({ error: "storyId must be a number" });
    return;
  }

  const [original] = await db.select().from(storiesTable).where(eq(storiesTable.id, storyId));
  if (!original) {
    res.status(404).json({ error: "Story not found" });
    return;
  }

  const [saved] = await db
    .insert(storiesTable)
    .values({
      userId: req.userId,
      childName: original.childName,
      childAge: original.childAge,
      childGender: original.childGender,
      milestones: original.milestones,
      theme: original.theme,
      customPrompt: original.customPrompt,
      bibleVerse: original.bibleVerse,
      referenceImagePaths: original.referenceImagePaths,
      coverImageUrl: original.coverImageUrl,
      illustrationUrls: original.illustrationUrls,
      title: original.title,
      content: original.content,
    })
    .returning();

  res.status(201).json({ id: saved.id, title: saved.title });
});

// ── GET /stories/:id/public ── no auth, JSON for internal use ─────────────────
router.get("/stories/:id/public", async (req: any, res): Promise<void> => {
  const params = GetStoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [story] = await db.select().from(storiesTable)
    .where(eq(storiesTable.id, params.data.id));

  if (!story) { res.status(404).json({ error: "Story not found" }); return; }

  res.json(GetStoryResponse.parse(serializeStory(story)));
});

// ── GET /share/:id ── fully public HTML page, zero Clerk ──────────────────────
router.get("/share/:id", async (req: any, res): Promise<void> => {
  const params = GetStoryParams.safeParse(req.params);
  if (!params.success) { res.status(404).send("Not found"); return; }

  const [story] = await db.select().from(storiesTable)
    .where(eq(storiesTable.id, params.data.id));

  if (!story) {
    res.status(404).send(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:4rem"><h1>Story not found</h1><p>This story may have been removed.</p><a href="/">Create your own</a></body></html>`);
    return;
  }

  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const host  = req.headers["x-forwarded-host"] ?? req.headers.host ?? "";
  const appUrl = `${proto}://${host}`;

  function imgUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    return `${appUrl}/api/storage${path}`;
  }

  const cover = imgUrl(story.coverImageUrl as string | null);
  let illustrations: string[] = [];
  try {
    const raw = story.illustrationUrls as string | null;
    if (raw) illustrations = (JSON.parse(raw) as string[]).map(p => imgUrl(p)!);
  } catch { /* ignore */ }

  const paragraphs = ((story.content as string) ?? "").split("\n").filter(Boolean);
  const createdDate = story.createdAt instanceof Date
    ? story.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : String(story.createdAt ?? "").split("T")[0];

  // Interleave illustrations after paragraph 2 and paragraph 4
  const illustAfter: Record<number, string> = {};
  if (illustrations[0]) illustAfter[1] = illustrations[0];
  if (illustrations[1]) illustAfter[3] = illustrations[1];

  const paragraphsHtml = paragraphs.map((p: string, i: number) => {
    const illus = illustAfter[i] ? `<div class="illus"><img src="${illustAfter[i]}" alt="Illustration"></div>` : "";
    return `<p>${p.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>${illus}`;
  }).join("\n");

  const coverHtml = cover
    ? `<div class="cover-wrap">
        <img class="cover-img" src="${cover}" alt="Cover — ${(story.title as string ?? "").replace(/"/g, "&quot;")}">
        <div class="cover-overlay">
          <span class="theme-badge">${(story.theme as string ?? "").replace(/</g, "&lt;")}</span>
          <h1 class="cover-title">${(story.title as string ?? "").replace(/</g, "&lt;")}</h1>
        </div>
      </div>`
    : `<div class="header-inner">
        <span class="theme-badge">${(story.theme as string ?? "").replace(/</g, "&lt;")}</span>
        <h1 class="title-nocov">${(story.title as string ?? "").replace(/</g, "&lt;")}</h1>
      </div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${(story.title as string ?? "A Story").replace(/</g, "&lt;")} — Sion Legacy Originals</title>
  <meta property="og:title" content="${(story.title as string ?? "").replace(/"/g, "&quot;")}">
  <meta property="og:description" content="A personalized bedtime story for ${(story.childName as string ?? "").replace(/"/g, "&quot;")}, made with Sion Legacy Originals.">
  ${cover ? `<meta property="og:image" content="${cover}">` : ""}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Nunito', sans-serif; background: hsl(270,30%,97%); color: hsl(270,45%,10%); min-height: 100dvh; }

    /* top banner */
    .banner { background: hsl(272,65%,40%); color: #fff; text-align: center; padding: 0.75rem 1rem; font-size: 0.85rem; font-weight: 600; }
    .banner a { color: hsl(43,90%,75%); text-decoration: underline; }

    .page { max-width: 720px; margin: 0 auto; padding: 2rem 1rem 8rem; }

    /* card */
    .card { background: #fff; border-radius: 2rem; overflow: hidden; box-shadow: 0 4px 24px rgba(80,30,120,.10); border: 1px solid hsl(270,30%,90%); }

    /* cover */
    .cover-wrap { position: relative; width: 100%; aspect-ratio: 9/14; overflow: hidden; }
    .cover-img  { width: 100%; height: 100%; object-fit: cover; display: block; }
    .cover-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(30,10,60,.7) 0%, transparent 55%); display: flex; flex-direction: column; justify-content: flex-end; padding: 2rem; }
    .cover-title { font-family: 'Playfair Display', serif; font-size: clamp(1.6rem,5vw,2.8rem); color: #fff; line-height: 1.15; text-shadow: 0 2px 8px rgba(0,0,0,.4); }

    /* header (no cover) */
    .header-inner { padding: 2.5rem 2rem; text-align: center; border-bottom: 1px solid hsl(270,30%,92%); }
    .title-nocov  { font-family: 'Playfair Display', serif; font-size: clamp(1.6rem,5vw,2.8rem); margin-top: 1rem; }

    /* theme badge */
    .theme-badge { display: inline-flex; align-items: center; gap: .4rem; padding: .35rem .9rem; background: hsl(272,65%,40%); color: #fff; border-radius: 999px; font-size: .75rem; font-weight: 700; margin-bottom: .75rem; }

    /* meta */
    .meta { padding: 1.25rem 2rem; border-bottom: 1px solid hsl(270,30%,92%); display: flex; flex-wrap: wrap; gap: .5rem 1.5rem; font-size: .875rem; color: hsl(270,15%,45%); font-weight: 600; }
    .meta strong { color: hsl(270,45%,10%); background: hsl(272,40%,94%); padding: .1rem .5rem; border-radius: .4rem; }

    /* story text */
    .story { padding: 2rem; }
    .story p { font-family: 'Playfair Display', serif; font-size: 1.1rem; line-height: 1.9; color: hsl(270,45%,14%); margin-bottom: 1.4rem; }
    .illus { margin: 1.5rem 0; border-radius: 1rem; overflow: hidden; box-shadow: 0 2px 12px rgba(80,30,120,.12); }
    .illus img { width: 100%; display: block; }

    /* sticky CTA */
    .cta-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid hsl(270,30%,90%); padding: 1rem; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; box-shadow: 0 -4px 16px rgba(80,30,120,.08); }
    .cta-text p { font-size: .85rem; font-weight: 700; color: hsl(270,45%,10%); }
    .cta-text small { font-size: .75rem; color: hsl(270,15%,45%); }
    .cta-btn { display: inline-flex; align-items: center; gap: .5rem; padding: .7rem 1.4rem; background: hsl(272,65%,40%); color: #fff; font-family: 'Nunito', sans-serif; font-weight: 800; font-size: .9rem; border-radius: 999px; text-decoration: none; white-space: nowrap; box-shadow: 0 2px 8px rgba(80,30,120,.3); }
    .cta-btn:hover { background: hsl(272,65%,33%); }

    @media (max-width: 480px) {
      .story { padding: 1.25rem; }
      .meta { padding: 1rem 1.25rem; }
      .cta-bar { justify-content: center; text-align: center; }
    }
  </style>
</head>
<body>
  <div class="banner">
    Made with <a href="${appUrl}">Sion Legacy Originals</a> — AI-powered personalized bedtime stories
  </div>

  <div class="page">
    <div class="card">
      ${coverHtml}
      <div class="meta">
        <span>For <strong>${(story.childName as string ?? "").replace(/</g, "&lt;")}</strong>, Age ${story.childAge}</span>
        <span>${createdDate}</span>
      </div>
      <div class="story">
        ${paragraphsHtml}
      </div>
    </div>
  </div>

  <div class="cta-bar">
    <div class="cta-text">
      <p>Create a personalized story for your child</p>
      <small>$1 per story &middot; or $3.33/month unlimited</small>
    </div>
    <a class="cta-btn" href="${appUrl}">✨ Create your story</a>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// ── PATCH /stories/:id ────────────────────────────────────────────────────────
router.patch("/stories/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = UpdateStoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateStoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(storiesTable).where(eq(storiesTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Story not found" }); return; }
  if (existing.userId && existing.userId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title != null) updateData.title = parsed.data.title;
  if (parsed.data.content != null) updateData.content = parsed.data.content;
  if (parsed.data.childName != null) updateData.childName = parsed.data.childName;
  if (parsed.data.childAge != null) updateData.childAge = parsed.data.childAge;
  if (parsed.data.childGender != null) updateData.childGender = parsed.data.childGender;
  if (parsed.data.milestones != null) updateData.milestones = parsed.data.milestones;
  if (parsed.data.theme != null) updateData.theme = parsed.data.theme;
  if (parsed.data.customPrompt != null) updateData.customPrompt = parsed.data.customPrompt;

  const [story] = await db.update(storiesTable).set(updateData)
    .where(eq(storiesTable.id, params.data.id)).returning();
  if (!story) { res.status(404).json({ error: "Story not found" }); return; }

  res.json(UpdateStoryResponse.parse(serializeStory(story)));
});

// ── DELETE /stories/:id ───────────────────────────────────────────────────────
router.delete("/stories/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = DeleteStoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [existing] = await db.select().from(storiesTable).where(eq(storiesTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Story not found" }); return; }
  if (existing.userId && existing.userId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(storiesTable).where(eq(storiesTable.id, params.data.id));
  res.sendStatus(204);
});

// ── POST /stories/:id/regenerate ──────────────────────────────────────────────
router.post("/stories/:id/regenerate", requireAuth, async (req: any, res): Promise<void> => {
  const params = RegenerateStoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [existing] = await db.select().from(storiesTable).where(eq(storiesTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Story not found" }); return; }
  if (existing.userId && existing.userId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const { title, content } = await generateStory({
    childName: existing.childName,
    childAge: existing.childAge,
    childGender: existing.childGender,
    milestones: existing.milestones,
    theme: existing.theme,
    customPrompt: existing.customPrompt,
    bibleVerse: existing.bibleVerse,
  });

  let coverImageUrl = existing.coverImageUrl;
  let illustrationUrls = existing.illustrationUrls;

  if (existing.referenceImagePaths) {
    try {
      const paths = JSON.parse(existing.referenceImagePaths) as string[];
      if (paths.length > 0) {
        const result = await generateStoryImages({
          childName: existing.childName, childAge: existing.childAge,
          childGender: existing.childGender, theme: existing.theme,
          storyTitle: title, storyContent: content, referenceImagePaths: paths,
        });
        coverImageUrl = result.coverImagePath;
        illustrationUrls = JSON.stringify(result.illustrationPaths);
      }
    } catch (err) {
      console.error("Image regeneration failed — keeping existing images:", err);
    }
  }

  const [story] = await db.update(storiesTable)
    .set({ title, content, coverImageUrl, illustrationUrls })
    .where(eq(storiesTable.id, params.data.id))
    .returning();

  res.json(RegenerateStoryResponse.parse(serializeStory(story)));
});

export default router;
