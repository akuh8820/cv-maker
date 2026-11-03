import { TEMPLATES } from "./schema.js";
import * as store from "./store.js";
import { renderForm, setTemplate } from "./form.js";
import { renderPreview, measure } from "./preview.js";
import { buildDocx, docxFilename } from "./docx.js";
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
}

const repaint = debounce(() => {
  renderPreview(previewRoot, state);
  paintBadge();
}, 120);

function onChange(next) {
  state = next;
  persist(state);
  repaint();
}

function render() {
  renderForm(formPanel, state, onChange);
  renderPreview(previewRoot, state);
  paintBadge();
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
