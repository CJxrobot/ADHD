# AI-Driven Hardware Doctor

*(A.D.H.D. — netlist import, schematic/SVG/3D cross-probing, and AI-assisted debug chat)*

Restructured into two parts:

```
circuit-debug-assistant/
  backend/    Node/Express server. Holds the Gemini API key. Never ships it to the browser.
  frontend/   Static app (plain HTML + ES modules, no build step). Talks to the backend over /api/*.
```

## Run it

```bash
cd backend
npm install
cp .env.example .env
# edit .env and set GEMINI_API_KEY=your-real-key
npm start
```

Then open `http://localhost:3000` — the backend also serves the frontend
static files, so this is the only thing you need to run in dev.

If you'd rather host the frontend separately (e.g. a CDN/static host) and
run only the backend as an API, set `CORS_ALLOWED_ORIGINS` in `.env` to the
frontend's origin, and change `apiBase` when constructing `BackendProvider`
in `frontend/src/ui/main.js` to point at the backend's URL.

## What changed from the single-file prototype

- **API key moved server-side.** The old `src/ai/providers/gemini.js`
  called Gemini directly from the browser with a user-pasted API key. That's
  now `backend/src/geminiClient.js`, reading `process.env.GEMINI_API_KEY`.
  The frontend calls `POST /api/chat` (see `frontend/src/ai/providers/backendProvider.js`)
  and never sees the key. The "paste your API key" field is gone from the UI.
- **Multi-file SVG import.** The SVG upload input now accepts multiple
  files at once (`<input type="file" multiple>`). All selected files are
  read and mounted together — `svgParser.mountSvg()` treats every top-level
  `<svg>` it finds (across however many files were selected) as one ordered,
  vertically-stacked, scrollable sequence, and `extractRefBBoxes()` /
  `svgViewer.js` now search and highlight across every page, not just the
  first.
- **3D viewer highlight fix.** `bom3dViewer.clearHighlight()` previously
  only hid the floating label and reset local state — it never told the
  EasyEDA 3D engine to actually uncheck the last-highlighted mesh, so
  meshes could accumulate as highlighted across selections. It now takes
  the iframe and issues the real `setModelChecked(..., false)` RPC call
  before resetting, so only one component is ever highlighted at a time.
