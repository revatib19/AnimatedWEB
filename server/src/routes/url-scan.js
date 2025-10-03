import { Router } from 'express'
import { scanUrlWithAxe } from '../services/urlScanner.js'
import { mapFindingsToReport } from '../services/suggestions.js'

const router = Router()

router.post('/', async (req, res) => {
  const { url } = req.body || {}
  if (!url) return res.status(400).json({ message: 'Missing url' })
  try {
    const findings = await scanUrlWithAxe(url)
    const issues = mapFindingsToReport(findings)
    res.json({ issues })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to scan URL' })
  }
})

export default router
