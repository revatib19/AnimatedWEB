import { useState } from 'react'
import axios from 'axios'

const initialFilters = { severity: 'all', type: 'all', guideline: 'all' }

export default function App() {
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const [error, setError] = useState('')

  const onCheck = async () => {
    setError('')
    setIsLoading(true)
    setResults([])
    try {
      if (file) {
        const formData = new FormData()
        formData.append('pdf', file)
        const { data } = await axios.post('/api/scan/pdf', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        setResults(data.issues || [])
      } else if (url) {
        const { data } = await axios.post('/api/scan/url', { url })
        setResults(data.issues || [])
      } else {
        setError('Enter a URL or upload a PDF')
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Request failed')
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = results.filter(r => {
    const bySeverity = filters.severity === 'all' || r.severity === filters.severity
    const byType = filters.type === 'all' || r.type === filters.type
    const byGuide = filters.guideline === 'all' || r.guideline?.includes(filters.guideline)
    return bySeverity && byType && byGuide
  })

  const exportPdf = async () => {
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
    const margin = 40
    let y = margin
    pdf.setFontSize(16)
    pdf.text('Accessibility Report', margin, y)
    y += 24
    pdf.setFontSize(11)
    filtered.forEach((it, idx) => {
      const lines = pdf.splitTextToSize(`${idx + 1}. [${it.severity}] ${it.description} (${it.guideline || 'WCAG'})`, 515)
      if (y + lines.length * 14 > 780) {
        pdf.addPage(); y = margin
      }
      pdf.text(lines, margin, y)
      y += lines.length * 14 + 6
      if (it.node && it.node.selector) {
        const loc = `Selector: ${it.node.selector}`
        const locLines = pdf.splitTextToSize(loc, 515)
        if (y + locLines.length * 14 > 780) { pdf.addPage(); y = margin }
        pdf.text(locLines, margin, y)
        y += locLines.length * 14 + 10
      }
    })
    pdf.save('accessibility-report.pdf')
  }

  const Input = ({ label, children }) => (
    <label className="block text-sm font-medium text-gray-800">
      <span className="mb-1 inline-block">{label}</span>
      {children}
    </label>
  )

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Accessibility Checker</h1>
          <button onClick={exportPdf} className="px-3 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-50" disabled={!filtered.length}>Export PDF</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 p-4 rounded border bg-white">
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Website URL">
                <input className="w-full border rounded px-3 py-2" type="url" placeholder="https://example.com" value={url} onChange={e => { setUrl(e.target.value); setFile(null) }} aria-describedby="url-help" />
                <p id="url-help" className="text-xs mt-1 text-gray-600">Provide a publicly reachable URL.</p>
              </Input>
              <Input label="Or Upload PDF">
                <input className="w-full border rounded px-3 py-2" type="file" accept="application/pdf" onChange={e => { setFile(e.target.files?.[0] || null); setUrl('') }} />
              </Input>
            </div>
            <div className="mt-4">
              <button onClick={onCheck} className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50" disabled={isLoading}>
                {isLoading ? 'Checking…' : 'Check Accessibility'}
              </button>
              {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
            </div>
          </div>
          <div className="p-4 rounded border bg-white">
            <h2 className="font-medium mb-2">Filters</h2>
            <div className="grid gap-3">
              <label className="text-sm">
                Severity
                <select className="w-full border rounded px-2 py-1 mt-1" value={filters.severity} onChange={e => setFilters(s => ({ ...s, severity: e.target.value }))}>
                  <option value="all">All</option>
                  <option value="critical">Critical</option>
                  <option value="serious">Serious</option>
                  <option value="moderate">Moderate</option>
                  <option value="minor">Minor</option>
                </select>
              </label>
              <label className="text-sm">
                Type
                <select className="w-full border rounded px-2 py-1 mt-1" value={filters.type} onChange={e => setFilters(s => ({ ...s, type: e.target.value }))}>
                  <option value="all">All</option>
                  <option value="html">HTML</option>
                  <option value="contrast">Contrast</option>
                  <option value="aria">ARIA</option>
                  <option value="forms">Forms</option>
                  <option value="structure">Structure</option>
                </select>
              </label>
              <label className="text-sm">
                Guideline
                <select className="w-full border rounded px-2 py-1 mt-1" value={filters.guideline} onChange={e => setFilters(s => ({ ...s, guideline: e.target.value }))}>
                  <option value="all">All</option>
                  <option value="1.1.1">1.1.1 Non-text Content</option>
                  <option value="1.3.1">1.3.1 Info and Relationships</option>
                  <option value="1.4.3">1.4.3 Contrast (Minimum)</option>
                  <option value="2.1.1">2.1.1 Keyboard</option>
                  <option value="2.4.6">2.4.6 Headings and Labels</option>
                  <option value="2.5.3">2.5.3 Label in Name</option>
                  <option value="2.5.8">2.5.8 Target Size (Minimum)</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <section className="mt-6">
          <h2 className="text-lg font-medium mb-2">Results ({filtered.length})</h2>
          <div className="grid gap-3">
            {filtered.map((it, idx) => (
              <article key={idx} className="border rounded p-3 bg-white" aria-labelledby={`issue-${idx}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 id={`issue-${idx}`} className="font-medium text-gray-900">{it.description}</h3>
                  <span className="text-xs px-2 py-1 rounded bg-gray-200">{it.guideline}</span>
                </div>
                <p className="text-sm text-gray-700 mt-1">Severity: {it.severity} • Type: {it.type}</p>
                {it.node?.snippet && (
                  <pre className="text-xs bg-gray-50 border rounded p-2 overflow-auto mt-2" aria-label="Code snippet"><code>{it.node.snippet}</code></pre>
                )}
                {it.fix && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-indigo-700">Suggested fix</summary>
                    <pre className="text-xs bg-gray-50 border rounded p-2 overflow-auto mt-2" aria-label="Suggested code"><code>{it.fix}</code></pre>
                  </details>
                )}
              </article>
            ))}
            {!filtered.length && !isLoading && <p className="text-gray-600">No issues to display.</p>}
          </div>
        </section>
      </main>
    </div>
  )
}
import React, { useMemo, useRef, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

function Pill({ children, tone = "neutral" }) {
  const toneMap = {
    high: "bg-red-100 text-red-800 border-red-300",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
    low: "bg-blue-100 text-blue-800 border-blue-300",
    neutral: "bg-gray-100 text-gray-800 border-gray-300",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${toneMap[tone] || toneMap.neutral}`}>
      {children}
    </span>
  );
}

function IssueRow({ issue }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border-b border-gray-200">
      <div className="grid grid-cols-12 gap-3 p-3 focus-within:outline focus-within:outline-2 focus-within:outline-sky-600">
        <div className="col-span-3">
          <div className="font-semibold text-gray-900">{issue.help || issue.id}</div>
          <div className="text-xs text-gray-600 line-clamp-2">{issue.description}</div>
        </div>
        <div className="col-span-2 flex gap-2 items-center">
          {issue.severity && <Pill tone={issue.severity}>{issue.severity}</Pill>}
          {issue.category && <Pill>{issue.category}</Pill>}
          {issue.wcag && issue.wcag.slice(0, 2).map((w) => (
            <Pill key={w}>{w}</Pill>
          ))}
        </div>
        <div className="col-span-3 text-sm text-gray-800">
          {issue.suggestion?.summary || "See details"}
          {issue.suggestion?.selector && (
            <div className="text-xs text-gray-500 mt-1">{issue.suggestion.selector}</div>
          )}
        </div>
        <div className="col-span-3 text-xs text-gray-600">
          {issue.helpUrl && (
            <a className="text-sky-700 underline" href={issue.helpUrl} target="_blank" rel="noreferrer">
              Guidance
            </a>
          )}
        </div>
        <div className="col-span-1 flex items-center justify-end gap-2">
          <Pill tone="neutral">{issue.id}</Pill>
          <button
            className="text-sm text-sky-700 underline"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={`fix-${issue.id}`}
          >
            {open ? "Hide" : "View"} fix
          </button>
        </div>
      </div>
      {open && (
        <div id={`fix-${issue.id}`} className="px-3 pb-4">
          {issue.fix ? (
            <div className="rounded-md border bg-gray-50">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="text-sm font-medium">{issue.fix.title}</div>
                <div className="flex items-center gap-2">
                  {issue.fix.helpUrl && (
                    <a className="text-sky-700 underline text-xs" href={issue.fix.helpUrl} target="_blank" rel="noreferrer">Reference</a>
                  )}
                  <button
                    className="text-xs px-2 py-1 border rounded-md"
                    onClick={() => navigator.clipboard.writeText(String(issue.fix.code || ""))}
                  >
                    Copy code
                  </button>
                </div>
              </div>
              {issue.fix.notes && (
                <div className="px-3 pb-2 text-xs text-gray-700">{issue.fix.notes}</div>
              )}
              {issue.fix.code && (
                <pre className="px-3 pb-3 overflow-auto text-xs"><code>{issue.fix.code}</code></pre>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-700">No automatic fix available. See guidance link.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [filter, setFilter] = useState({ type: "all", severity: "all", wcag: "all", category: "all" });
  const fileRef = useRef(null);

  const filteredIssues = useMemo(() => {
    if (!result?.issues) return [];
    return result.issues.filter((i) => {
      const matchesSeverity = filter.severity === "all" || i.severity === filter.severity;
      const matchesWcag = filter.wcag === "all" || (i.wcag || []).some((w) => w.includes(filter.wcag));
      const matchesCategory = filter.category === "all" || i.category === filter.category;
      return matchesSeverity && matchesWcag && matchesCategory;
    });
  }, [result, filter]);

  async function handleScan() {
    setLoading(true);
    setResult(null);
    try {
      if (file) {
        const form = new FormData();
        form.append("file", file);
        const { data } = await axios.post(`${API_BASE}/api/scan/pdf`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setResult({ type: "pdf", ...data });
      } else if (url) {
        const { data } = await axios.post(`${API_BASE}/api/scan/url`, { url });
        setResult({ type: "url", ...data });
      } else {
        alert("Enter a URL or upload a PDF");
      }
    } catch (e) {
      setResult({ ok: false, error: e?.response?.data?.error || e.message });
    } finally {
      setLoading(false);
    }
  }

  function exportPdf() {
    if (!result) return;
    const doc = new jsPDF();
    let y = 10;
    const addLine = (text) => {
      const lines = doc.splitTextToSize(text, 180);
      for (const line of lines) {
        if (y > 280) {
          doc.addPage();
          y = 10;
        }
        doc.text(line, 10, y);
        y += 6;
      }
    };
    addLine("Accessibility Report");
    addLine("");
    if (result.type === "url") addLine(`URL: ${result.url}`);
    if (result.filename) addLine(`File: ${result.filename}`);
    addLine("");
    if (result.summary) addLine(`Summary: ${JSON.stringify(result.summary)}`);
    addLine("");
    (result.issues || []).forEach((i, idx) => {
      addLine(`${idx + 1}. [${i.severity || "unknown"}] ${i.help || i.id}`);
      if (i.wcag) addLine(`   WCAG: ${(i.wcag || []).join(", ")}`);
      if (i.suggestion?.summary) addLine(`   Suggestion: ${i.suggestion.summary}`);
      if (i.suggestion?.selector) addLine(`   Selector: ${i.suggestion.selector}`);
      if (i.helpUrl) addLine(`   Ref: ${i.helpUrl}`);
      addLine("");
    });
    doc.save("a11y-report.pdf");
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Accessibility Checker (WCAG 2.2)</h1>
          <button
            className="px-3 py-1.5 rounded-md bg-sky-600 text-white text-sm hover:bg-sky-700 focus:outline focus:outline-2 focus:outline-sky-600"
            onClick={exportPdf}
            aria-disabled={!result}
            disabled={!result}
          >
            Export Report PDF
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <section aria-labelledby="scan-section" className="mb-6">
          <h2 id="scan-section" className="sr-only">Input</h2>
          <div className="grid gap-3 sm:grid-cols-3 items-end">
            <div className="sm:col-span-2">
              <label htmlFor="url" className="block text-sm font-medium text-gray-700">Website URL</label>
              <input
                id="url"
                name="url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
                aria-describedby="url-help"
              />
              <p id="url-help" className="text-xs text-gray-500 mt-1">Enter a public page URL to scan.</p>
            </div>
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700">Upload PDF</label>
              <input
                id="file"
                ref={fileRef}
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm text-gray-700"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-3">
            <button
              className="px-4 py-2 rounded-md bg-sky-600 text-white text-sm hover:bg-sky-700 focus:outline focus:outline-2 focus:outline-sky-600 disabled:opacity-50"
              onClick={handleScan}
              disabled={loading}
            >
              {loading ? "Checking..." : "Check Accessibility"}
            </button>
            <button
              className="px-3 py-2 rounded-md border text-sm"
              onClick={() => {
                setUrl("");
                setFile(null);
                if (fileRef.current) fileRef.current.value = "";
                setResult(null);
              }}
            >
              Reset
            </button>
          </div>
        </section>

        {result && (
          <section aria-labelledby="results-section">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="results-section" className="text-base font-semibold">Results</h2>
              <div className="flex gap-2">
                <select
                  className="border rounded-md px-2 py-1 text-sm"
                  aria-label="Filter by severity"
                  value={filter.severity}
                  onChange={(e) => setFilter((f) => ({ ...f, severity: e.target.value }))}
                >
                  <option value="all">All severities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select
                  className="border rounded-md px-2 py-1 text-sm"
                  aria-label="Filter by WCAG"
                  value={filter.wcag}
                  onChange={(e) => setFilter((f) => ({ ...f, wcag: e.target.value }))}
                >
                  <option value="all">All WCAG</option>
                  <option value="1.1.1">1.1.1</option>
                  <option value="1.3.1">1.3.1</option>
                  <option value="1.3.2">1.3.2</option>
                  <option value="1.4.3">1.4.3</option>
                  <option value="2.1.1">2.1.1</option>
                  <option value="2.4.2">2.4.2</option>
                  <option value="2.4.6">2.4.6</option>
                </select>
                <select
                  className="border rounded-md px-2 py-1 text-sm"
                  aria-label="Filter by category"
                  value={filter.category}
                  onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value }))}
                >
                  <option value="all">All categories</option>
                  <option value="aria">aria</option>
                  <option value="color">color</option>
                  <option value="forms">forms</option>
                  <option value="keyboard">keyboard</option>
                  <option value="language">language</option>
                  <option value="name-role-value">name-role-value</option>
                  <option value="sensory-and-visual-cues">sensory-and-visual-cues</option>
                  <option value="semantics">semantics</option>
                  <option value="structure">structure</option>
                  <option value="tables">tables</option>
                  <option value="text-alternatives">text-alternatives</option>
                  <option value="general">general</option>
                </select>
              </div>
            </div>
            {result.ok === false ? (
              <div role="alert" className="p-3 border border-red-300 bg-red-50 text-red-800 rounded-md">
                {result.error || "Scan failed"}
              </div>
            ) : (
              <div className="border rounded-md divide-y">
                <div className="grid grid-cols-12 gap-3 p-3 bg-gray-50 text-sm font-medium text-gray-700">
                  <div className="col-span-3">Issue</div>
                  <div className="col-span-2">Severity/WCAG</div>
                  <div className="col-span-3">Suggestion</div>
                  <div className="col-span-3">Links</div>
                  <div className="col-span-1 text-right">ID</div>
                </div>
                {(filteredIssues || []).map((issue, idx) => (
                  <IssueRow key={`${issue.id}-${idx}`} issue={issue} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

