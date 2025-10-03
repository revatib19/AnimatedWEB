import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import urlScanRouter from './routes/url-scan.js'
import pdfScanRouter from './routes/pdf-scan.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
const upload = multer({ dest: uploadDir })

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/scan/url', urlScanRouter)
app.use('/api/scan/pdf', upload.single('pdf'), pdfScanRouter)

const port = process.env.PORT || 3001
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
