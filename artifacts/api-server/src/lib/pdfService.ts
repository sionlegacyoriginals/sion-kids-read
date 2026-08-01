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

async function buildInteriorPdf(params: {
  title: string;
  content: string;
  childName: string;
}): Promise<Buffer> {
  const doc = new PDFDocument({
    size: [PAGE_W, PAGE_H],
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    autoFirstPage: false,
  });

  const contentW = PAGE_W - MARGIN * 2;
  const paragraphs = params.content.split("\n").filter(Boolean);

  // --- Half-title page ---
  doc.addPage();
  doc.font(FONT_BOLD).fontSize(26).fillColor("#1c2a3a").text(
    params.title,
    MARGIN,
    PAGE_H / 2 - 40,
    { width: contentW, align: "center" },
  );

  // --- Title page ---
  doc.addPage();
  doc
    .font(FONT_BOLD)
    .fontSize(28)
    .fillColor("#1c2a3a")
    .text(params.title, MARGIN, PAGE_H / 3, { width: contentW, align: "center" });
  doc
    .font(FONT_REGULAR)
    .fontSize(13)
    .fillColor("#526070")
    .text(`A story written for ${params.childName}`, {
      width: contentW,
      align: "center",
    });

  // --- Blank verso ---
  doc.addPage();

  // --- Story content ---
  doc.addPage();
  let y = MARGIN;
  doc.font(FONT_REGULAR).fontSize(11).fillColor("#1c2a3a");

  for (const para of paragraphs) {
    const needed = doc.heightOfString(para, { width: contentW, lineGap: 3 });
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
    doc.text(para, MARGIN, y, { width: contentW, align: "justify", lineGap: 3 });
    y = doc.y + 16;
  }

  // Pad to minimum page count (must be even)
  const current: number = (doc as any)._pageCount ?? 4;
  let toAdd = Math.max(0, MIN_INTERIOR_PAGES - current);
  if ((current + toAdd) % 2 !== 0) toAdd += 1;
  for (let i = 0; i < toAdd; i++) doc.addPage();

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

export async function generateStoryPdfs(params: {
  title: string;
  content: string;
  childName: string;
  childAge: number;
  coverImageUrl: string | null;
}): Promise<{ interiorPdfBuffer: Buffer; coverPdfBuffer: Buffer }> {
  // Download cover image
  let coverImageBuffer: Buffer | null = null;
  if (params.coverImageUrl) {
    try {
      const resp = await fetch(params.coverImageUrl, { signal: AbortSignal.timeout(15_000) });
      if (resp.ok) coverImageBuffer = Buffer.from(await resp.arrayBuffer());
    } catch {
      // Proceed without image
    }
  }

  const interiorPdfBuffer = await buildInteriorPdf(params);

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
