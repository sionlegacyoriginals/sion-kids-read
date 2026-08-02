import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import { ObjectStorageService } from "./objectStorage";

export async function generateStoryImages(params: {
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
          if (objectPath.startsWith("/ref-photos/")) {
            const photoId = objectPath.slice("/ref-photos/".length);
            const result = await db.execute(
              sql`SELECT data_url FROM reference_photos WHERE id = ${photoId}`,
            );
            const dataUrl = result.rows[0]?.data_url as string | undefined;
            return dataUrl ?? null;
          }
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
                text: "Describe this character's physical appearance for a storybook illustration: hair color, hair style, eye color, and skin tone. Two concise sentences, appearance only.",
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
