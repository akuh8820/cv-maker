# PROJECT.md — Bikin CV

Memory for agents. Only facts expensive to rediscover and not visible in code.
Live: https://akuh8820.github.io/cv-maker/

## Run & test

- No build step. Plain static files; `npm install` only for the dev-only test deps.
- Serve over HTTP, never `file://` — CSP `default-src 'self'` + ES modules block it:
  `python3 -m http.server 8100` from the repo root.
- `npm test` → unit (`node --test tests/unit`), 15 cases.
- `npm run test:e2e` → Puppeteer. Argument is a **substring of the check filename**:
  `npm run test:e2e nav` runs `20-nav.mjs`. Filter names: `smoke`, `layout`, `nav`,
  `feedback`, `print`.
- Chrome is already downloaded: `~/.cache/puppeteer/chrome/linux_arm-*/`. For fresh
  installs use `PUPPETEER_SKIP_DOWNLOAD=1 npm install`; helpers auto-find the binary.
- Print is checked by rendering a real PDF (`page.pdf({format:"A4", margin:0})`) then
  `pdfinfo`/`pdftotext`. DOCX is checked by `soffice --headless --convert-to pdf`.
  Both binaries exist on this machine.

## Environment gotchas (this box)

- Shell calls longer than ~60 s often die to a server restart mid-run. Run each E2E
  check as its own command with `timeout 120`. Don't batch the whole suite.
- `pkill -f <pattern>` can match the shell's own command line and kill your session.
  Confirm with `ps` first. Stale headless Chrome processes survive; a few are fine.
- `/tmp/cvui` (screenshots, throwaway Puppeteer scripts) may lose its `node_modules`
  symlink after a restart. Run scripts from the repo root, or re-create the link.

## Invariants

- Client-side only: no server, no analytics, no cookies. The bug-report link may carry
  only whitelisted diagnostics (`js/report.js`), never CV content.
- Draft JSON v1 is a public contract (users archive and move devices). Additive keys
  only, with `normalizeState()` defaults; never rename or restructure.
- UI state (active step, open sections) lives in `sessionStorage` under
  `bikincv.ui.v1`; the draft stays in `localStorage` under `bikincv.draft.v1`. Don't mix.
- Result must stay **1 page A4**. `css/app.css` `@media print` must remain last and
  hide every UI element; `css/cv.css` `@media print` hides `body > *` that lacks
  `.cv-sheet`. Never add `min-height`/`transform` outside a screen media query.
- `css/cv.css`, `js/preview.js`, `js/docx.js`, `js/photo.js` are the render/export core.
  Touching them means re-verifying the PDF **and** the DOCX, not just unit tests.

## Layout decisions

- Form column maxes at 460 px (not 480) so the A4 preview stays ≥0.85 scale at 1366×900.
- Mobile progress row: text + badge + save are `flex:none`; the step chip is
  `flex:0 1 auto; min-width:0` and ellipsises. Adding a fourth signal must not push the
  row past 390 px.

## Dead ends (don't retry)

- Entry count in `<summary>`: the number goes stale — adding/removing an entry only
  re-renders the list, not the header. The status pill already carries completeness.
- Auto-collapsing other sections when the rail/chip is used: keep manual opens so two
  sections can be compared. "Buka semua" exists for the scroll-everything crowd.
- Desktop layout keyed to a hardcoded footer height (46 px): broke whenever the footer
  wrapped. Flex on `body` with `100dvh` + `footer { flex: none }` replaced it.

## Deploy

- GitHub Pages, **legacy** build from the `main` branch root, not Actions. A branch must
  be merged to `main` to go live; `.nojekyll` keeps Jekyll out.
- Check the deploy: `gh api repos/akuh8820/cv-maker/pages/builds/latest --jq .status`
  should read `built` for the merged commit.
