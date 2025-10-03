const wcagMap = {
  'image-alt': '1.1.1',
  'color-contrast': '1.4.3',
  'aria-valid-attr': '4.1.2',
  'aria-roles': '4.1.2',
  'label': '2.5.3',
  'heading-order': '2.4.6',
  'keyboard': '2.1.1',
  'target-size': '2.5.8',
  'pdf-metadata-title': '2.4.2',
  'pdf-no-text': '1.1.1',
  'pdf-tagging-missing': '1.3.1'
}

function buildFixSuggestion(ruleId, node) {
  switch (ruleId) {
    case 'image-alt':
      return '<img src="..." alt="Describe the image meaningfully" />'
    case 'color-contrast':
      return 'Increase contrast: e.g., color: #111; background: #fff;'
    case 'label':
      return '<label for="name">Name</label>\n<input id="name" name="name" />'
    case 'heading-order':
      return '<h1>...</h1>\n<h2>...</h2>\n<h3>...</h3>'
    case 'keyboard':
      return 'Ensure all interactive elements are focusable via keyboard (tabindex, semantics)'
    case 'target-size':
      return 'Increase hit area to at least 24x24px or 44x44px where applicable'
    case 'pdf-metadata-title':
      return 'Set Title metadata in the PDF properties'
    case 'pdf-no-text':
      return 'Add OCR text layer or provide text equivalents for images'
    case 'pdf-tagging-missing':
      return 'Add PDF/UA tags for structure, alt text, and reading order'
    default:
      return node?.html || ''
  }
}

export function mapFindingsToReport(findings) {
  const issues = []
  for (const f of findings) {
    // axe violation style
    if (f.nodes) {
      for (const n of f.nodes) {
        issues.push({
          description: f.help || f.description || f.id,
          guideline: wcagMap[f.id] || (f.tags?.find(t => /wcag/.test(t)) ?? 'WCAG 2.2 AA'),
          severity: (f.impact || 'minor'),
          type: detectType(f.id),
          node: {
            selector: n.target?.[0] || '',
            snippet: n.html || ''
          },
          fix: buildFixSuggestion(f.id, n)
        })
      }
    } else {
      // PDF heuristic entries already flat
      issues.push({
        description: f.description || f.id,
        guideline: wcagMap[f.id] || 'WCAG 2.2 AA',
        severity: f.impact || 'minor',
        type: detectType(f.id),
        node: {},
        fix: buildFixSuggestion(f.id)
      })
    }
  }
  return issues
}

function detectType(ruleId) {
  if (/contrast|color/.test(ruleId)) return 'contrast'
  if (/image|alt/.test(ruleId)) return 'html'
  if (/aria/.test(ruleId)) return 'aria'
  if (/label|form/.test(ruleId)) return 'forms'
  if (/heading|structure|pdf/.test(ruleId)) return 'structure'
  if (/keyboard|focus/.test(ruleId)) return 'html'
  return 'html'
}
