import { describe, it, expect } from 'vitest'
import { mapFindingsToReport } from '../src/services/suggestions.js'

describe('Suggestions mapper', () => {
  it('maps axe violations to issues with guideline and fix', () => {
    const findings = [{
      id: 'image-alt',
      help: 'Images must have alternate text',
      impact: 'serious',
      nodes: [{ target: ['img.logo'], html: '<img src="logo.png">' }]
    }]
    const issues = mapFindingsToReport(findings)
    expect(issues.length).toBe(1)
    const issue = issues[0]
    expect(issue.guideline).toBe('1.1.1')
    expect(issue.fix).toContain('alt=')
    expect(issue.node.selector).toBe('img.logo')
  })
})
