/**
 * PDF generation for Lulu print fulfillment.
 * Produces a 6"×9" interior and a wraparound cover.
 * Uses pdfkit (CommonJS — esbuild handles the interop).
 *
 * IMPORTANT: Always use embedded TTF fonts (not built-in PDF font names like
 * "Helvetica"). Lulu requires all fonts to be embedded in the PDF file.
 * Built-in PDF fonts are referenced by name only and will cause REJECTED status.
 */

// @ts-ignore pdfkit ships CJS; esbuild bundles it fine
import PDFDocument from "pdfkit";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve fonts directory — works in both dev (dist/) and prod (dist/)
// because the build script copies fonts/ → dist/fonts/
const FONTS_DIR = path.resolve(
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url)),
  "fonts"
);
const FONT_REGULAR = path.join(FONTS_DIR, "DejaVuSans.ttf");
const FONT_BOLD    = path.join(FONTS_DIR, "DejaVuSans-Bold.ttf");

const PT_PER_INCH = 72;
const PAGE_W = 6 * PT_PER_INCH;   // 432 pt
const PAGE_H = 9 * PT_PER_INCH;   // 648 pt
const MARGIN = 0.75 * PT_PER_INCH; // 54 pt
const MIN_INTERIOR_PAGES = 32;     // Lulu minimum for 6×9 perfect-bound softcover

function bufferFromDoc(doc: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function addPageNumber(doc: any, pageNum: number) {
  doc
    .font(FONT_REGULAR)
    .fontSize(9)
    .fillColor("#9ca3af")
    .text(String(pageNum), 0, PAGE_H - MARGIN + 12, { width: PAGE_W, align: "center" });
}

function addDecorativeDot(doc: any) {
  const cx = PAGE_W / 2;
  doc.circle(cx, MARGIN / 2, 2).fill("#d4b896");
}

async function buildInteriorPdf(params: {
  title: string;
  content: string;
  childName: string;
  illustrationBuffers?: (Buffer | null)[];
}): Promise<Buffer> {
  const doc = new PDFDocument({
    size: [PAGE_W, PAGE_H],
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    autoFirstPage: false,
  });

  const contentW = PAGE_W - MARGIN * 2;
  const paragraphs = params.content.split("\n").filter(Boolean);
  const illus = params.illustrationBuffers ?? [];

  // Illustrations appear after paragraph index 1 and 3 (same as the reader)
  const ILLUS_AFTER: Record<number, Buffer | null> = {};
  if (illus[0]) ILLUS_AFTER[1] = illus[0];
  if (illus[1]) ILLUS_AFTER[3] = illus[1];

  let storyPageNum = 0;

  // ── Half-title page ──────────────────────────────────────────────────────
  doc.addPage({ size: [PAGE_W, PAGE_H] });
  doc.rect(0, 0, PAGE_W, PAGE_H).fill("#fdf9f4");
  addDecorativeDot(doc);
  doc.font(FONT_BOLD).fontSize(22).fillColor("#1c2a3a")
    .text(params.title, MARGIN, PAGE_H / 2 - 30, { width: contentW, align: "center" });

  // ── Title page ───────────────────────────────────────────────────────────
  doc.addPage({ size: [PAGE_W, PAGE_H] });
  doc.rect(0, 0, PAGE_W, PAGE_H).fill("#fdf9f4");
  // Decorative top bar
  doc.rect(MARGIN, MARGIN * 0.6, contentW, 2).fill("#d4b896");
  doc.font(FONT_BOLD).fontSize(28).fillColor("#1c2a3a")
    .text(params.title, MARGIN, PAGE_H * 0.35, { width: contentW, align: "center" });
  doc.font(FONT_REGULAR).fontSize(12).fillColor("#7c6a5a")
    .text(`A personalised story for ${params.childName}`, MARGIN, doc.y + 14, {
      width: contentW, align: "center",
    });
  doc.rect(MARGIN, PAGE_H - MARGIN * 0.8, contentW, 2).fill("#d4b896");
  doc.font(FONT_REGULAR).fontSize(9).fillColor("#b0a090")
    .text("Sion Legacy Originals", MARGIN, PAGE_H - MARGIN * 0.7, {
      width: contentW, align: "center",
    });

  // ── Blank verso (copyright page) ────────────────────────────────────────
  doc.addPage({ size: [PAGE_W, PAGE_H] });
  doc.rect(0, 0, PAGE_W, PAGE_H).fill("#fdf9f4");
  doc.font(FONT_REGULAR).fontSize(8).fillColor("#b0a090")
    .text(
      `This story was created especially for ${params.childName}.\n` +
      `© Sion Legacy Originals. All rights reserved.\n` +
      `Personalised AI-generated children's stories.\n` +
      `sionlegacyoriginals.com`,
      MARGIN, PAGE_H - MARGIN * 2.5,
      { width: contentW, align: "left", lineGap: 4 },
    );

  // ── Story content — one paragraph per page ───────────────────────────────
  for (let i = 0; i < paragraphs.length; i++) {
    storyPageNum++;
    doc.addPage({ size: [PAGE_W, PAGE_H] });
    doc.rect(0, 0, PAGE_W, PAGE_H).fill("#fdf9f4");
    addDecorativeDot(doc);

    // Large, comfortable children's-book font size
    const fontSize = 15;
    const lineGap  = 7;
    const textH    = doc.heightOfString(paragraphs[i], {
      width: contentW, lineGap, fontSize,
    });
    // Vertically centre the paragraph on the page
    const textY = Math.max(MARGIN * 1.4, (PAGE_H - textH) / 2);

    doc.font(FONT_REGULAR).fontSize(fontSize).fillColor("#1c2a3a")
      .text(paragraphs[i], MARGIN, textY, {
        width: contentW, align: "justify", lineGap,
      });

    addPageNumber(doc, storyPageNum);

    // Full-page illustration after this paragraph (if one exists)
    const illustBuf = ILLUS_AFTER[i];
    if (illustBuf) {
      doc.addPage({ size: [PAGE_W, PAGE_H] });
      doc.rect(0, 0, PAGE_W, PAGE_H).fill("#1c2a3a"); // dark bg in case image has transparency
      doc.image(illustBuf, 0, 0, { width: PAGE_W, height: PAGE_H, cover: [PAGE_W, PAGE_H] });
    }
  }

  // ── "The End" page ───────────────────────────────────────────────────────
  doc.addPage({ size: [PAGE_W, PAGE_H] });
  doc.rect(0, 0, PAGE_W, PAGE_H).fill("#fdf9f4");
  doc.rect(MARGIN, PAGE_H / 2 - 2, contentW, 1.5).fill("#d4b896");
  doc.font(FONT_BOLD).fontSize(20).fillColor("#1c2a3a")
    .text("~ The End ~", MARGIN, PAGE_H / 2 - 40, { width: contentW, align: "center" });
  doc.font(FONT_REGULAR).fontSize(11).fillColor("#7c6a5a")
    .text(`Made with love for ${params.childName}`, MARGIN, PAGE_H / 2 + 14, {
      width: contentW, align: "center",
    });

  // ── Pad to Lulu minimum (must be even) ──────────────────────────────────
  const current: number = (doc as any)._pageCount ?? 8;
  let toAdd = Math.max(0, MIN_INTERIOR_PAGES - current);
  if ((current + toAdd) % 2 !== 0) toAdd += 1;
  for (let i = 0; i < toAdd; i++) {
    doc.addPage({ size: [PAGE_W, PAGE_H] });
    doc.rect(0, 0, PAGE_W, PAGE_H).fill("#fdf9f4");
  }

  return bufferFromDoc(doc);
}

async function buildCoverPdf(params: {
  title: string;
  childName: string;
  pageCount: number;
  coverImageBuffer: Buffer | null;
  blurb: string;
}): Promise<Buffer> {
  // Spine width: ~0.00254" per page for 60# uncoated paper
  const spineW = Math.max(6, params.pageCount * 0.00254 * PT_PER_INCH);
  const totalW = PAGE_W * 2 + spineW;

  // Lulu requires 0.125" bleed on all 4 edges of the cover PDF
  const BLEED = 0.125 * PT_PER_INCH; // 9 pt
  const docW = totalW + 2 * BLEED;
  const docH = PAGE_H + 2 * BLEED;

  const doc = new PDFDocument({
    size: [docW, docH],
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    autoFirstPage: false,
  });

  doc.addPage({ size: [docW, docH] });

  // ── Back cover (left panel) ──────────────────────────────────────────────
  // Deep purple background matching the front cover art palette
  const backX = BLEED;
  const BACK_BG = "#2d1b5e";
  const GOLD    = "#f5a224";
  const TEXT_W  = PAGE_W - 48;

  doc.rect(backX, 0, PAGE_W + BLEED, docH).fill(BACK_BG);

  // Gold top accent bar
  doc.rect(backX, BLEED, PAGE_W, 4).fill(GOLD);

  // Brand name
  doc
    .font(FONT_BOLD).fontSize(13).fillColor(GOLD)
    .text("Sion Legacy Originals", backX + 24, BLEED + 20, { width: TEXT_W });
  doc
    .font(FONT_REGULAR).fontSize(8).fillColor("#c4b5e8")
    .text("Personalised AI-generated children's stories", backX + 24, BLEED + 40, { width: TEXT_W });

  // Decorative divider
  doc.rect(backX + 24, BLEED + 60, 40, 1.5).fill(GOLD);

  // Story blurb — truncate to ~180 words so it fits
  const words = params.blurb.split(/\s+/);
  const clipped = words.slice(0, 180).join(" ") + (words.length > 180 ? "…" : "");
  doc
    .font(FONT_REGULAR).fontSize(11).fillColor("#e8e0f5")
    .text(clipped, backX + 24, BLEED + 82, {
      width: TEXT_W,
      align: "left",
      lineGap: 3,
    });

  // "A story written for [name]" tag above barcode area
  const tagY = BLEED + PAGE_H - 110;
  doc.rect(backX + 24, tagY, TEXT_W, 1).fill("#4a3080");
  doc
    .font(FONT_REGULAR).fontSize(10).fillColor("#c4b5e8")
    .text(`A story written especially for ${params.childName}`, backX + 24, tagY + 10, {
      width: TEXT_W,
      align: "left",
    });

  // White barcode placeholder box (Lulu can add real ISBN/barcode here)
  const bcW = 100; const bcH = 60;
  const bcX = backX + PAGE_W - 24 - bcW;
  const bcY = BLEED + PAGE_H - 80;
  doc.rect(bcX, bcY, bcW, bcH).fill("#ffffff");
  doc
    .font(FONT_REGULAR).fontSize(6).fillColor("#888888")
    .text("ISBN / Barcode", bcX, bcY + bcH + 3, { width: bcW, align: "center" });

  // Gold bottom accent bar
  doc.rect(backX, BLEED + PAGE_H - 4, PAGE_W, 4).fill(GOLD);

  // ── Spine ────────────────────────────────────────────────────────────────
  const spineX = BLEED + PAGE_W;
  doc.rect(spineX, 0, spineW, docH).fill("#1e1240");

  // Spine title text (rotated) — only if spine is wide enough to fit text
  if (spineW >= 24) {
    doc.save();
    doc.translate(spineX + spineW / 2, BLEED + PAGE_H / 2);
    doc.rotate(-90);
    doc
      .font(FONT_BOLD).fontSize(Math.min(10, spineW * 0.55)).fillColor(GOLD)
      .text(params.title, -PAGE_H / 2 + 12, -spineW / 2 + 1, {
        width: PAGE_H - 24,
        align: "center",
        lineBreak: false,
      });
    doc.restore();
  }

  // ── Front cover (right panel) ────────────────────────────────────────────
  const frontX = BLEED + PAGE_W + spineW;
  if (params.coverImageBuffer) {
    doc.image(params.coverImageBuffer, frontX, BLEED, {
      width: PAGE_W,
      height: PAGE_H,
      cover: [PAGE_W, PAGE_H],
    });
  } else {
    doc.rect(frontX, BLEED, PAGE_W, PAGE_H).fill(GOLD);
  }

  // Dark gradient-style overlay on lower front for title legibility
  doc.rect(frontX, BLEED + PAGE_H * 0.55, PAGE_W, PAGE_H * 0.45).fillOpacity(0.65).fill("#000000");
  doc.fillOpacity(1);

  doc
    .font(FONT_BOLD).fontSize(20).fillColor("#ffffff")
    .text(params.title, frontX + 24, BLEED + PAGE_H * 0.60, { width: PAGE_W - 48, align: "center" });
  doc
    .font(FONT_REGULAR).fontSize(11).fillColor("#ffffffcc")
    .text(`A story for ${params.childName}`, { width: PAGE_W - 48, align: "center" });

  // Front cover gold bottom bar (extends into bleed)
  doc.rect(frontX, BLEED + PAGE_H - 4, PAGE_W + BLEED, 4 + BLEED).fill(GOLD);

  return bufferFromDoc(doc);
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (resp.ok) return Buffer.from(await resp.arrayBuffer());
  } catch {
    // Proceed without image
  }
  return null;
}

export async function generateStoryPdfs(params: {
  title: string;
  content: string;
  childName: string;
  childAge: number;
  coverImageUrl: string | null;
  illustrationUrls?: string[];
}): Promise<{ interiorPdfBuffer: Buffer; coverPdfBuffer: Buffer }> {
  // Download cover + illustrations in parallel
  const [coverImageBuffer, ...illustrationBuffers] = await Promise.all([
    params.coverImageUrl ? fetchImageBuffer(params.coverImageUrl) : Promise.resolve(null),
    ...(params.illustrationUrls ?? []).map(url => fetchImageBuffer(url)),
  ]);

  const interiorPdfBuffer = await buildInteriorPdf({
    ...params,
    illustrationBuffers,
  });

  // Count pages from interior doc for spine calculation (rough estimate)
  const pageCount = Math.max(MIN_INTERIOR_PAGES, 24);

  // Use the first 2–3 paragraphs as the back-cover blurb
  const paragraphs = params.content.split("\n").filter(Boolean);
  const blurb = paragraphs.slice(0, 3).join(" ");

  const coverPdfBuffer = await buildCoverPdf({
    title: params.title,
    childName: params.childName,
    pageCount,
    coverImageBuffer,
    blurb,
  });

  return { interiorPdfBuffer, coverPdfBuffer };
}
