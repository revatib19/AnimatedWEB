import puppeteer from 'puppeteer'
import fs from 'node:fs/promises'
import path from 'node:path'
import axeCore from 'axe-core'

export async function scanUrlWithAxe(targetUrl) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()
  await page.setBypassCSP(true)
  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 })

  const axePath = path.join(process.cwd(), 'axe.min.js')
  await fs.writeFile(axePath, axeCore.source)
  await page.addScriptTag({ path: axePath })

  const results = await page.evaluate(async () => {
    return await window.axe.run(document, {
      runOnly: ['wcag2a', 'wcag2aa', 'wcag22aa']
    })
  })

  await browser.close()
  const findings = [
    ...(results.violations || []).map(v => ({ ...v, impact: v.impact || 'minor' }))
  ]
  return findings
}
