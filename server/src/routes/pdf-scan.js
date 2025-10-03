import { Router } from 'express'
import { scanPdfAccessibility } from '../services/pdfScanner.js'
import { mapFindingsToReport } from '../services/suggestions.js'

const router = Router()

router.post('/', async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Missing pdf upload' })
    const findings = await scanPdfAccessibility(req.file.path)
    const issues = mapFindingsToReport(findings)
    res.json({ issues })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to scan PDF' })
  }
})

export default router
