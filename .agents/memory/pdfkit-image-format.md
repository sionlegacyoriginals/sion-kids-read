---
name: PDFKit PNG embedding issue in CJS scripts
description: PDFKit silently fails to render PNG images when required directly as a CJS module in temp/admin scripts; JPEG works reliably.
---

## Rule
When embedding a cover photo (or any photo) in a PDFKit PDF from a plain Node CJS script (`require('pdfkit/js/pdfkit.js')`), convert the image to JPEG first (`convert input.png -quality 90 output.jpg`). PDFKit in this context silently drops PNG images — the area renders as white with no error thrown.

**Why:** The compiled TypeScript bundle (used by the production API server) appears to handle PNGs fine. But when PDFKit is required directly as a CJS module (e.g. in standalone admin/resend scripts), PNG images fail silently. JPEG (FFD8FF header) embeds reliably in both contexts.

**How to apply:** Any temp or admin script that uses PDFKit to embed a photo should:
1. Save the image to disk as PNG first
2. Run `convert input.png -quality 90 output.jpg` (ImageMagick, available in Nix env)
3. Read the `.jpg` file and pass that buffer to `doc.image()`
