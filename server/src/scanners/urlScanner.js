import Axe from "axe-core";
import puppeteer from "puppeteer";

function mapAxeImpactToSeverity(impact) {
  switch (impact) {
    case "critical":
      return "high";
    case "serious":
      return "high";
    case "moderate":
      return "medium";
    case "minor":
      return "low";
    default:
      return "unknown";
  }
}

function buildSuggestionFromAxe(node, rule) {
  const { html, target } = node;
  const ruleHelp = rule.help || "Fix the issue per WCAG guidance.";
  return {
    summary: ruleHelp,
    example: html,
    selector: Array.isArray(target) ? target.join(", ") : String(target || ""),
  };
}

function extractCategory(tags = []) {
  const categoryTag = (tags || []).find((t) => t.startsWith("cat."));
  return categoryTag ? categoryTag.replace(/^cat\./, "") : "general";
}

function generateFixForRule(ruleId, node, item) {
  const example = (node && node.html) || "";
  const selector = Array.isArray(node?.target) ? node.target.join(", ") : String(node?.target || "");
  const helpUrl = item?.helpUrl;

  switch (ruleId) {
    case "image-alt":
    case "area-alt":
    case "object-alt":
    case "svg-img-alt":
      return {
        title: "Add descriptive alt text to images",
        language: "html",
        code: `<img src="example.jpg" alt="Concise description of the image" />`,
        notes: "Ensure decorative images use alt=\"\" and meaningful images have specific alt text.",
        helpUrl,
      };
    case "color-contrast":
    case "link-in-text-block":
      return {
        title: "Increase color contrast to meet 4.5:1",
        language: "css",
        code: `/* Example: darken text color */\n.selector { color: #0f172a; } /* slate-900 */`,
        notes: "Adjust foreground/background colors until contrast ≥ 4.5:1. Prefer text colors ≥ AA.",
        helpUrl,
      };
    case "label":
    case "form-field-multiple-labels":
    case "label-title-only":
      return {
        title: "Associate labels with form controls",
        language: "html",
        code: `<label for="email">Email</label>\n<input id="email" name="email" type="email" />`,
        notes: "Use a visible <label> tied to the control via id/for. Avoid multiple labels per control unless necessary.",
        helpUrl,
      };
    case "button-name":
      return {
        title: "Provide accessible name for button",
        language: "html",
        code: `<button type="button">Submit form</button>` ,
        notes: "Buttons must have discernible text via content, aria-label or aria-labelledby.",
        helpUrl,
      };
    case "link-name":
      return {
        title: "Provide accessible name for link",
        language: "html",
        code: `<a href="/pricing">View pricing plans</a>`,
        notes: "Avoid generic \"click here\"; link text should describe the destination or action.",
        helpUrl,
      };
    case "heading-order":
      return {
        title: "Fix semantic heading order",
        language: "html",
        code: `<h1>Page title</h1>\n<h2>Section</h2>\n<h3>Subsection</h3>`,
        notes: "Do not skip heading levels (e.g., h1 -> h3). Use headings for structure, not styling.",
        helpUrl,
      };
    case "html-has-lang":
    case "html-lang-valid":
      return {
        title: "Specify valid document language",
        language: "html",
        code: `<!doctype html>\n<html lang="en">`,
        notes: "Use a valid BCP 47 language tag matching the document language.",
        helpUrl,
      };
    case "document-title":
      return {
        title: "Provide a descriptive <title>",
        language: "html",
        code: `<head>\n  <title>Product Dashboard – ACME</title>\n</head>`,
        notes: "Titles should be unique and describe the page purpose.",
        helpUrl,
      };
    case "frame-title":
      return {
        title: "Give iframes a meaningful title",
        language: "html",
        code: `<iframe src="/map" title="Store locations map"></iframe>`,
        notes: "Title must describe the embedded content's purpose.",
        helpUrl,
      };
    case "meta-viewport":
      return {
        title: "Allow user zoom in viewport",
        language: "html",
        code: `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
        notes: "Avoid maximum-scale=1 or user-scalable=no to support zoom.",
        helpUrl,
      };
    case "duplicate-id":
      return {
        title: "Ensure unique element IDs",
        language: "html",
        code: `<!-- Remove duplicates or make IDs unique -->\n<div id="section-1"></div>\n<div id="section-2"></div>`,
        notes: "IDs must be unique per document; duplicates break relationships for labels and aria.*",
        helpUrl,
      };
    case "aria-roles":
    case "aria-valid-attr-value":
    case "aria-allowed-attr":
    case "aria-required-children":
      return {
        title: "Correct ARIA roles and attributes",
        language: "html",
        code: `<nav role="navigation" aria-label="Main"></nav>`,
        notes: "Use valid roles and only supported aria-* for that role. Prefer native semantics.",
        helpUrl,
      };
    case "region":
      return {
        title: "Add landmarks for page regions",
        language: "html",
        code: `<header>...</header>\n<nav aria-label="Primary">...</nav>\n<main id="main">...</main>\n<footer>...</footer>`,
        notes: "Use semantic landmarks to aid navigation.",
        helpUrl,
      };
    default:
      return {
        title: item?.help || "Fix per WCAG guidance",
        language: "html",
        code: example || `<!-- Update element ${selector} to meet ${item?.id} -->`,
        notes: item?.description || "Refer to the guidance link for details.",
        helpUrl,
      };
  }
}

export async function scanUrlAccessibility(url) {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath,
  });
  try {
    const page = await browser.newPage();
    await page.setBypassCSP(true);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    await page.addScriptTag({ content: Axe.source });
    const results = await page.evaluate(async () => {
      // Ensure axe is available globally
      const axe = window.axe || (window.Axe && window.Axe) || undefined;
      if (!axe) {
        throw new Error("axe-core failed to inject");
      }
      return await axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"],
        },
        resultTypes: ["violations", "incomplete"],
        reporter: "v2",
      });
    });

    const issues = [];
    const pushFrom = (items, isIncomplete = false) => {
      for (const item of items) {
        for (const node of item.nodes || []) {
          issues.push({
            id: item.id,
            impact: item.impact || (isIncomplete ? "unknown" : undefined),
            severity: mapAxeImpactToSeverity(item.impact),
            help: item.help,
            helpUrl: item.helpUrl,
            description: item.description,
            wcag: (item.tags || []).filter((t) => t.startsWith("wcag")),
            category: extractCategory(item.tags || []),
            suggestion: buildSuggestionFromAxe(node, item),
            fix: generateFixForRule(item.id, node, item),
            target: node.target,
          });
        }
      }
    };

    pushFrom(results.violations || []);
    pushFrom(results.incomplete || [], true);

    return {
      ok: true,
      url,
      summary: {
        violations: (results.violations || []).length,
        incomplete: (results.incomplete || []).length,
        passes: (results.passes || []).length,
      },
      issues,
    };
  } finally {
    await browser.close();
  }
}

