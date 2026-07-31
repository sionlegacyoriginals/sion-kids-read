/**
 * PDF generation for Lulu print fulfillment.
 * Produces a 6"×9" interior and a wraparound cover.
 * Uses pdfkit (CommonJS — esbuild handles the interop).
 */

// @ts-ignore pdfkit ships CJS; esbuild bundles it fine
import PDFDocument from "pdfkit";

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
  doc.font("Helvetica-Bold").fontSize(26).fillColor("#1c2a3a").text(
    params.title,
    MARGIN,
    PAGE_H / 2 - 40,
    { width: contentW, align: "center" },
  );

  // --- Title page ---
  doc.addPage();
  doc
    .font("Helvetica-Bold")
    .fontSize(28)
    .fillColor("#1c2a3a")
    .text(params.title, MARGIN, PAGE_H / 3, { width: contentW, align: "center" });
  doc
    .font("Helvetica")
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
  doc.font("Helvetica").fontSize(11).fillColor("#1c2a3a");

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
}): Promise<Buffer> {
  // Spine width: ~0.00254" per page for 60# uncoated paper
  const spineW = Math.max(6, params.pageCount * 0.00254 * PT_PER_INCH);
  const totalW = PAGE_W * 2 + spineW;

  const doc = new PDFDocument({
    size: [totalW, PAGE_H],
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    autoFirstPage: false,
  });

  doc.addPage({ size: [totalW, PAGE_H] });

  // Cream background for entire cover
  doc.rect(0, 0, totalW, PAGE_H).fill("#fdfbf7");

  // --- Front cover (right panel) ---
  const frontX = PAGE_W + spineW;
  if (params.coverImageBuffer) {
    doc.image(params.coverImageBuffer, frontX, 0, {
      width: PAGE_W,
      height: PAGE_H,
      cover: [PAGE_W, PAGE_H],
    });
  } else {
    doc.rect(frontX, 0, PAGE_W, PAGE_H).fill("#f5a224");
  }

  // Gradient-like dark overlay on lower front for title legibility
  doc.rect(frontX, PAGE_H * 0.58, PAGE_W, PAGE_H * 0.42).fillOpacity(0.55).fill("#000000");
  doc.fillOpacity(1);

  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor("#ffffff")
    .text(params.title, frontX + 24, PAGE_H * 0.63, { width: PAGE_W - 48, align: "center" });
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#ffffffcc")
    .text(`A story for ${params.childName}`, { width: PAGE_W - 48, align: "center" });

  // --- Spine ---
  doc.rect(PAGE_W, 0, spineW, PAGE_H).fill("#f5a224");

  // --- Back cover (left panel) ---
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#f5a224")
    .text("StoryBloom", 24, 32, { width: PAGE_W - 48 });
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#526070")
    .text("Personalised AI-generated children's stories", 24, 58, { width: PAGE_W - 48 });

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

  const coverPdfBuffer = await buildCoverPdf({
    title: params.title,
    childName: params.childName,
    pageCount,
    coverImageBuffer,
  });

  return { interiorPdfBuffer, coverPdfBuffer };
}
