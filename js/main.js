import { TEMPLATES } from "./schema.js";
import * as store from "./store.js";
import { renderForm, setTemplate } from "./form.js";
import { renderPreview, measure } from "./preview.js";
import { buildDocx, docxFilename } from "./docx.js";
import { wireReportLink } from "./report.js";
import { filename, setPrintTitle, downloadBlob, debounce } from "./util.js";

const $ = (id) => document.getElementById(id);
const formPanel = $("form-panel");
const previewRoot = $("preview-root");
const badge = $("badge");

let state = store.load();

const persist = debounce((s) => {
  try {
    store.save(s);
  } catch (err) {
    console.warn(err.message);
  }
}, 400);

function paintBadge() {
  const sheet = previewRoot.querySelector(".cv-sheet");
  if (!sheet) return;
  const { pages, heightPx, limitPx } = measure(sheet);
  badge.textContent = pages > 1 ? "2 halaman — pertimbangkan memangkas" : "1 halaman";
  badge.className = `badge ${pages > 1 ? "badge-warn" : "badge-ok"}`;
  badge.title = `${Math.round(heightPx)}px dari ${Math.round(limitPx)}px area cetak`;
  wireReportLink(state, sheet);
}

const repaint = debounce(() => {
  renderPreview(previewRoot, state);
  paintBadge();
  fitPreview();
}, 120);

// Fit-to-width preview: skala = min(1, lebar tersedia / 794). (tampilan saja)
const viewport = document.querySelector(".preview-viewport");
let lastScale = -1;
function fitPreview() {
  const sheet = previewRoot?.firstElementChild;
  if (!viewport || !sheet) return;
  const avail = viewport.clientWidth;
  if (!avail) return;
  const w = sheet.offsetWidth || 794;
  const s = avail < w ? avail / w : 1;
  if (Math.abs(s - lastScale) < 0.001) return;
  lastScale = s;
  viewport.parentElement.style.setProperty("--cv-scale", s.toFixed(4));
  viewport.parentElement.classList.toggle("is-fit", s < 1);
  previewRoot.style.height = s < 1 ? `${Math.ceil(sheet.getBoundingClientRect().height * s)}px` : "";
}
new ResizeObserver(fitPreview).observe(viewport);
window.addEventListener("resize", fitPreview);

function onChange(next) {
  state = next;
  persist(state);
  repaint();
}

function render() {
  renderForm(formPanel, state, onChange);
  renderPreview(previewRoot, state);
  paintBadge();
  fitPreview();
}

function fillTemplates() {
  const sel = $("template");
  sel.replaceChildren(
    ...Object.entries(TEMPLATES).map(([id, t]) => new Option(t.label, id, false, id === state.template)),
  );
  sel.addEventListener("change", () => {
    state = setTemplate(state, sel.value);
    persist(state);
    render();
  });
}

$("btn-pdf").addEventListener("click", () => {
  const restore = setPrintTitle(filename(state, "pdf"));
  window.addEventListener("afterprint", () => setTimeout(restore, 0), { once: true });
  window.print();
});

$("btn-docx").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  try {
    downloadBlob(await buildDocx(state), docxFilename(state));
  } catch (err) {
    alert(`Gagal membuat DOCX: ${err.message}`);
  } finally {
    btn.disabled = false;
  }
});

$("btn-json").addEventListener("click", () => {
  downloadBlob(store.toJSONFile(state), filename(state, "json"));
});

$("btn-import").addEventListener("click", () => $("file-import").click());

$("file-import").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;
  try {
    onChange(await store.fromJSONFile(file));
    $("template").value = state.template;
  } catch (err) {
    alert(`Gagal memuat JSON: ${err.message}`);
  }
});

fillTemplates();
render();
