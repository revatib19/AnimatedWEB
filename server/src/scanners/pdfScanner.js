import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

// Basic PDF accessibility heuristics. A full PAC-like check is out of scope, but we cover key items
// such as tagged PDF, title metadata, image alt-equivalents (rudimentary), and heading/reading order hints.

function successCriterion(id, name) {
  return { id, name };
}

const WCAG = {
  nonTextContent: successCriterion("1.1.1", "Non-text Content"),
  infoAndRelationships: successCriterion("1.3.1", "Info and Relationships"),
  meaningfulSequence: successCriterion("1.3.2", "Meaningful Sequence"),
  pageTitled: successCriterion("2.4.2", "Page Titled"),
  headingsAndLabels: successCriterion("2.4.6", "Headings and Labels"),
  contrastMinimum: successCriterion("1.4.3", "Contrast (Minimum)"),
};

function createIssue({ id, severity = "medium", description, suggestion, wcag }) {
  return { id, severity, description, suggestion, wcag };
}

export async function scanPdfAccessibility(buffer, filename = "document.pdf") {
  const issues = [];
  let pdfDoc;
  try {
    pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  } catch (e) {
    return { ok: false, error: "Unable to parse PDF", details: e?.message };
  }

  // Title metadata
  const title = pdfDoc.getTitle();
  if (!title || !String(title).trim()) {
    issues.push(
      createIssue({
        id: "pdf-missing-title",
        severity: "low",
        description: "PDF document is missing Title metadata.",
        suggestion: "Set a descriptive Title in the PDF metadata.",
        wcag: [WCAG.pageTitled.id],
      })
    );
  }

  // Tagged PDF check: pdf-lib does not expose logical structure. Use pdfjs to inspect MarkInfo and StructTreeRoot.
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  const catalog = await pdf.getPage(1).then(() => pdf.getMetadata().catch(() => null));

  // pdfjs doesn't easily expose MarkInfo. We infer tagging by presence of structure metadata
  // through xmpMetadata or metadata content. This is heuristic only.
  const hasXmp = Boolean(catalog?.metadata);
  if (!hasXmp) {
    issues.push(
      createIssue({
        id: "pdf-untagged",
        severity: "high",
        description: "PDF may be untagged or missing structure tree.",
        suggestion:
          "Export as a tagged PDF from source authoring tool (enable 'Tagged PDF') and ensure logical reading order.",
        wcag: [WCAG.infoAndRelationships.id, WCAG.meaningfulSequence.id],
      })
    );
  }

  // Scan pages for images and text content (heuristic)
  const numPages = pdf.numPages;
  let imageCount = 0;
  let textItems = 0;
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const ops = await page.getOperatorList();
    for (let j = 0; j < ops.fnArray.length; j++) {
      const fn = ops.fnArray[j];
      // PDFJS OPS enum: 84 = paintImageXObject, 85 = paintInlineImageXObject, 86 = paintImageXObjectRepeat
      if (fn === 84 || fn === 85 || fn === 86) imageCount++;
    }
    const textContent = await page.getTextContent().catch(() => ({ items: [] }));
    textItems += (textContent.items || []).length;
  }

  if (imageCount > 0) {
    issues.push(
      createIssue({
        id: "pdf-images-alt",
        severity: "high",
        description: "PDF contains images that may lack alternate text.",
        suggestion:
          "Add alt text to images via the PDF's structure tree (Alt/ActualText) or in the source document before export.",
        wcag: [WCAG.nonTextContent.id],
      })
    );
  }

  if (textItems === 0) {
    issues.push(
      createIssue({
        id: "pdf-text-missing",
        severity: "high",
        description:
          "No selectable text found. The document may be scanned images without OCR or missing text layer.",
        suggestion: "Run OCR and ensure text is tagged correctly in reading order.",
        wcag: [WCAG.infoAndRelationships.id, WCAG.meaningfulSequence.id],
      })
    );
  }

  return {
    ok: true,
    filename,
    summary: {
      pages: numPages,
      images: imageCount,
      hasText: textItems > 0,
    },
    issues,
  };
}

