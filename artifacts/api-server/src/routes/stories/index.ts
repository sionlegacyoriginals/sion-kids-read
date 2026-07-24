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

const router: IRouter = Router();

function serializeStory(story: Record<string, unknown>) {
  return {
    ...story,
    createdAt:
      story.createdAt instanceof Date
        ? story.createdAt.toISOString()
        : story.createdAt,
    updatedAt:
      story.updatedAt instanceof Date
        ? story.updatedAt.toISOString()
        : story.updatedAt,
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
      ? `Weave one fitting Bible verse into the story naturally — choose a verse that powerfully reinforces the theme of ${params.theme}. Quote it exactly (with book, chapter, and verse reference) at the moment in the story where it feels most meaningful, as if a wise character says it or a narrator gently reflects on it.`
      : params.bibleVerse
        ? `Weave this Bible verse into the story naturally: "${params.bibleVerse}". Quote it at the moment where it feels most meaningful, as if a wise character says it or a narrator gently reflects on it.`
        : "";

  return `You are a master children's story author. Write a warm, wholesome, age-appropriate children's story for a ${params.childAge}-year-old child named ${params.childName}.

Theme/value to reinforce: ${params.theme}

${milestonesLine}
${customLine}
${bibleLine}

Requirements:
- The story should be engaging, imaginative, and age-appropriate for a ${params.childAge}-year-old.
- Refer to ${params.childName} using ${pronouns.subject}/${pronouns.object}/${pronouns.possessive} pronouns.
- Follow classic children's story structure: an engaging opening that introduces ${params.childName}, a gentle challenge or journey that tests the theme of ${params.theme}, and a positive resolution that reinforces the value of ${params.theme}.
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

  // Step 1 – download reference photos and convert to base64 data URIs
  const base64Images = (
    await Promise.all(
      params.referenceImagePaths.slice(0, 5).map(async (objectPath) => {
        try {
          const file = await objectStorage.getObjectEntityFile(objectPath);
          const response = await objectStorage.downloadObject(file);
          const buffer = Buffer.from(await response.arrayBuffer());
          const contentType =
            response.headers.get("content-type") || "image/jpeg";
          return `data:${contentType};base64,${buffer.toString("base64")}`;
        } catch {
          return null;
        }
      }),
    )
  ).filter((x): x is string => x !== null);

  // Step 2 – use gpt-5.6-luna (supports image inputs) to describe the child
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
      // Vision unavailable; fall back to generic description
    }
  }

  // Step 3 – build prompts for gpt-image-1
  const paragraphs = params.storyContent.split("\n").filter(Boolean);
  const scene1 = (paragraphs[1] ?? paragraphs[0] ?? "").slice(0, 250);
  const scene2 = (paragraphs[3] ?? paragraphs[2] ?? paragraphs[0] ?? "").slice(0, 250);

  const bookStyle =
    "warm watercolor children's book illustration, soft pastel palette, gentle line art, cozy and whimsical, suitable for a bedtime story, no text";

  const coverPrompt = `${bookStyle}. Full storybook cover art for "${params.storyTitle}". The main character is ${childDescription}, shown in a magical scene that embodies the theme of ${params.theme}. Inviting, heartwarming, beautiful composition.`;
  const illus1Prompt = `${bookStyle}. Interior story illustration: ${childDescription} in this scene — ${scene1}`;
  const illus2Prompt = `${bookStyle}. Interior story illustration: ${childDescription} in this scene — ${scene2}`;

  // Step 4 – generate all three images in parallel using gpt-image-1
  const [coverBuffer, illus1Buffer, illus2Buffer] = await Promise.all([
    generateImageBuffer(coverPrompt, "1024x1024"),
    generateImageBuffer(illus1Prompt, "1024x1024"),
    generateImageBuffer(illus2Prompt, "1024x1024"),
  ]);

  // Step 5 – upload generated images to object storage, return object paths
  async function storeBuffer(buffer: Buffer): Promise<string> {
    const presignedUrl = await objectStorage.getObjectEntityUploadURL();
    const objectPath = objectStorage.normalizeObjectEntityPath(presignedUrl);
    const resp = await fetch(presignedUrl, {
      method: "PUT",
      // @ts-ignore – Node's Buffer is accepted by fetch as BodyInit
      body: buffer,
      headers: { "Content-Type": "image/png" },
    });
    if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
    return objectPath;
  }

  const [coverImagePath, illus1Path, illus2Path] = await Promise.all([
    storeBuffer(coverBuffer),
    storeBuffer(illus1Buffer),
    storeBuffer(illus2Buffer),
  ]);

  return { coverImagePath, illustrationPaths: [illus1Path, illus2Path] };
}

// ─── Story text generation ───────────────────────────────────────────────────

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
    max_completion_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
    stream: false,
  });

  const raw = response.choices[0]?.message?.content ?? "";
  const lines = raw.split("\n");
  const titleLine = lines[0] ?? "";
  const title = titleLine.startsWith("TITLE: ")
    ? titleLine.slice(7).trim()
    : `${params.childName}'s Story of ${params.theme}`;
  const content = lines.slice(1).join("\n").trim();

  return { title, content };
}

// GET /stories
router.get("/stories", async (_req, res): Promise<void> => {
  const stories = await db
    .select()
    .from(storiesTable)
    .orderBy(desc(storiesTable.createdAt));
  res.json(ListStoriesResponse.parse(stories.map(serializeStory)));
});

// POST /stories
router.post("/stories", async (req, res): Promise<void> => {
  const parsed = CreateStoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { childName, childAge, childGender, milestones, theme, customPrompt, bibleVerse, referenceImagePaths } =
    parsed.data;

  const { title, content } = await generateStory({
    childName,
    childAge,
    childGender,
    milestones,
    theme,
    customPrompt,
    bibleVerse,
  });

  // Generate cover + illustrations when reference photos were provided
  let coverImageUrl: string | null = null;
  let illustrationUrls: string | null = null;

  if (referenceImagePaths) {
    try {
      const paths = JSON.parse(referenceImagePaths) as string[];
      if (paths.length > 0) {
        const { coverImagePath, illustrationPaths } = await generateStoryImages({
          childName,
          childAge,
          childGender,
          theme,
          storyTitle: title,
          storyContent: content,
          referenceImagePaths: paths,
        });
        coverImageUrl = coverImagePath;
        illustrationUrls = JSON.stringify(illustrationPaths);
      }
    } catch (err) {
      req.log.error({ err }, "Image generation failed — story saved without illustrations");
    }
  }

  const [story] = await db
    .insert(storiesTable)
    .values({
      childName,
      childAge,
      childGender,
      milestones: milestones ?? null,
      theme,
      customPrompt: customPrompt ?? null,
      bibleVerse: bibleVerse ?? null,
      referenceImagePaths: referenceImagePaths ?? null,
      coverImageUrl,
      illustrationUrls,
      title,
      content,
    })
    .returning();

  res.status(201).json(CreateStoryResponse.parse(serializeStory(story)));
});

// GET /stories/stats
router.get("/stories/stats", async (_req, res): Promise<void> => {
  const total = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(storiesTable);

  const byTheme = await db
    .select({
      theme: storiesTable.theme,
      count: sql<number>`count(*)::int`,
    })
    .from(storiesTable)
    .groupBy(storiesTable.theme)
    .orderBy(desc(sql`count(*)`));

  const recent = await db
    .select({ childName: storiesTable.childName })
    .from(storiesTable)
    .orderBy(desc(storiesTable.createdAt))
    .limit(1);

  res.json(
    GetStoryStatsResponse.parse({
      totalStories: total[0]?.count ?? 0,
      byTheme: byTheme,
      mostRecentChildName: recent[0]?.childName ?? null,
    }),
  );
});

// GET /stories/recent
router.get("/stories/recent", async (_req, res): Promise<void> => {
  const stories = await db
    .select()
    .from(storiesTable)
    .orderBy(desc(storiesTable.createdAt))
    .limit(5);
  res.json(GetRecentStoriesResponse.parse(stories.map(serializeStory)));
});

// GET /stories/:id
router.get("/stories/:id", async (req, res): Promise<void> => {
  const params = GetStoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [story] = await db
    .select()
    .from(storiesTable)
    .where(eq(storiesTable.id, params.data.id));

  if (!story) {
    res.status(404).json({ error: "Story not found" });
    return;
  }

  res.json(GetStoryResponse.parse(serializeStory(story)));
});

// PATCH /stories/:id
router.patch("/stories/:id", async (req, res): Promise<void> => {
  const params = UpdateStoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateStoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title != null) updateData.title = parsed.data.title;
  if (parsed.data.content != null) updateData.content = parsed.data.content;
  if (parsed.data.childName != null) updateData.childName = parsed.data.childName;
  if (parsed.data.childAge != null) updateData.childAge = parsed.data.childAge;
  if (parsed.data.childGender != null) updateData.childGender = parsed.data.childGender;
  if (parsed.data.milestones != null) updateData.milestones = parsed.data.milestones;
  if (parsed.data.theme != null) updateData.theme = parsed.data.theme;
  if (parsed.data.customPrompt != null) updateData.customPrompt = parsed.data.customPrompt;

  const [story] = await db
    .update(storiesTable)
    .set(updateData)
    .where(eq(storiesTable.id, params.data.id))
    .returning();

  if (!story) {
    res.status(404).json({ error: "Story not found" });
    return;
  }

  res.json(UpdateStoryResponse.parse(serializeStory(story)));
});

// DELETE /stories/:id
router.delete("/stories/:id", async (req, res): Promise<void> => {
  const params = DeleteStoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [story] = await db
    .delete(storiesTable)
    .where(eq(storiesTable.id, params.data.id))
    .returning();

  if (!story) {
    res.status(404).json({ error: "Story not found" });
    return;
  }

  res.sendStatus(204);
});

// POST /stories/:id/regenerate
router.post("/stories/:id/regenerate", async (req, res): Promise<void> => {
  const params = RegenerateStoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(storiesTable)
    .where(eq(storiesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Story not found" });
    return;
  }

  const { title, content } = await generateStory({
    childName: existing.childName,
    childAge: existing.childAge,
    childGender: existing.childGender,
    milestones: existing.milestones,
    theme: existing.theme,
    customPrompt: existing.customPrompt,
    bibleVerse: existing.bibleVerse,
  });

  // Re-generate images if this story had reference photos
  let coverImageUrl = existing.coverImageUrl;
  let illustrationUrls = existing.illustrationUrls;

  if (existing.referenceImagePaths) {
    try {
      const paths = JSON.parse(existing.referenceImagePaths) as string[];
      if (paths.length > 0) {
        const result = await generateStoryImages({
          childName: existing.childName,
          childAge: existing.childAge,
          childGender: existing.childGender,
          theme: existing.theme,
          storyTitle: title,
          storyContent: content,
          referenceImagePaths: paths,
        });
        coverImageUrl = result.coverImagePath;
        illustrationUrls = JSON.stringify(result.illustrationPaths);
      }
    } catch (err) {
      req.log.error({ err }, "Image regeneration failed — keeping existing images");
    }
  }

  const [story] = await db
    .update(storiesTable)
    .set({ title, content, coverImageUrl, illustrationUrls })
    .where(eq(storiesTable.id, params.data.id))
    .returning();

  res.json(RegenerateStoryResponse.parse(serializeStory(story)));
});

export default router;
