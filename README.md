## Accessibility Checker (WCAG 2.2) – React + Node

### Stack
- Backend: Node.js, Express, axe-core via Puppeteer, pdf-lib, pdfjs-dist
- Frontend: React (Vite), Tailwind CSS, jsPDF

### Prerequisites
- Node.js 18+
- Internet access for Puppeteer to download Chromium on first run (or provide a system Chrome)

If Chromium download is blocked or slow, install Chrome/Chromium and set:

```bash
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### Setup

Install server dependencies (Chromium download may take a while):

```bash
cd server
npm install
```

Install client dependencies:

```bash
cd ../client
npm install
```

### Run

In one terminal:

```bash
cd server
npm run dev
```

In another terminal:

```bash
cd client
npm run dev
```

Open the app at `http://localhost:5173` and set `VITE_API_BASE` if the API runs elsewhere.

### Notes
- URL Scan uses axe-core rules filtered by `wcag2a`, `wcag2aa`, `wcag21*`, and `wcag22*` tags.
- PDF Scan performs heuristic checks (metadata title, tagging signals, images, text layer). It is not a full PAC audit.
- The report shows WCAG success criteria references when available and provides fix suggestions with example code for common issues.

# AnimatedWEBSITE
 I have created animated website using HTML5,CSS3
