import fs from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'

// In Node, prefer single-threaded parsing without worker

export async function scanPdfAccessibility(filePath) {
  const buffer = await readFile(filePath)
  const doc = await PDFDocument.load(buffer, { updateMetadata: false })

  const issues = []

  // Basic metadata checks
  const title = doc.getTitle()
  if (!title) {
    issues.push({
      id: 'pdf-metadata-title',
      description: 'PDF is missing Title metadata',
      impact: 'moderate',
      tags: ['wcag2aa', 'wcag22aa'],
      help: 'Add Title metadata to describe the document',
      helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/page-titled',
      nodes: []
    })
  }

  // Use pdfjs to extract text and simple structure heuristics
  const loadingTask = pdfjsLib.getDocument({ data: buffer, disableWorker: true, useWorkerFetch: false })
  const pdf = await loadingTask.promise

  let totalTextItems = 0
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    totalTextItems += content.items.length
  }
  if (totalTextItems === 0) {
    issues.push({
      id: 'pdf-no-text',
      description: 'PDF appears to be image-only without selectable text',
      impact: 'serious',
      tags: ['wcag2aa'],
      help: 'Provide text equivalents or OCR text layer',
      helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content',
      nodes: []
    })
  }

  // Note: Full PDF/UA tagging checks require a specialized library. Heuristics below.
  const isTagged = doc.getForm() || false // placeholder heuristic
  if (!isTagged) {
    issues.push({
      id: 'pdf-tagging-missing',
      description: 'PDF likely lacks proper tagging structure (PDF/UA)',
      impact: 'serious',
      tags: ['wcag2aa'],
      help: 'Add semantic tags for headings, lists, reading order, alt text',
      helpUrl: 'https://www.w3.org/WAI/standards-guidelines/pdf/techniques/',
      nodes: []
    })
  }

  return issues
}
