import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const storiesTable = pgTable("stories", {
  id: serial("id").primaryKey(),
  childName: text("child_name").notNull(),
  childAge: integer("child_age").notNull(),
  childGender: text("child_gender").notNull(),
  milestones: text("milestones"),
  theme: text("theme").notNull(),
  customPrompt: text("custom_prompt"),
  bibleVerse: text("bible_verse"),
  referenceImagePaths: text("reference_image_paths"), // JSON array of object paths
  coverImageUrl: text("cover_image_url"),
  illustrationUrls: text("illustration_urls"), // JSON array of generated image URLs
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStorySchema = createInsertSchema(storiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStory = z.infer<typeof insertStorySchema>;
export type Story = typeof storiesTable.$inferSelect;
