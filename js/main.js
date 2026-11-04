import { TEMPLATES } from "./schema.js";
import { stepIds, stepLabel, statusOf, progressOf } from "./progress.js";
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
const badgeM = $("badge-m");
const saveStatus = [$("save"), $("save-m")];

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
  const text = pages > 1 ? "2 halaman — pertimbangkan memangkas" : "1 halaman";
  const cls = `badge ${pages > 1 ? "badge-warn" : "badge-ok"}`;
  for (const node of [badge, badgeM]) {
    if (!node) continue;
    node.textContent = text;
    node.className = cls;
    node.title = `${Math.round(heightPx)}px dari ${Math.round(limitPx)}px area cetak`;
  }
  wireReportLink(state, sheet);
}

// ---- Shell: rail, progress, meta A4 ----

function buildRail(s) {
  const list = $("rail-list");
  if (!list) return;
  list.replaceChildren(
    ...stepIds(s).map((id) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rail-step";
      btn.dataset.step = id;
      btn.title = stepLabel(id);

      const num = document.createElement("span");
      num.className = "rail-num";
      const idx = stepIds(s).indexOf(id) + 1;
      num.textContent = String(idx).padStart(2, "0");

      const label = document.createElement("span");
      label.className = "rail-label";
      label.textContent = stepLabel(id);

      const dot = document.createElement("span");
      dot.className = "rail-dot";

      btn.append(num, label, dot);
      li.append(btn);
      return li;
    }),
  );
}

function buildSheet(s) {
  const list = $("sheet-list");
  if (!list) return;
  list.replaceChildren(
    ...stepIds(s).map((id, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.step = id;
      const num = document.createElement("span");
      num.className = "rail-num";
      num.textContent = String(i + 1).padStart(2, "0");
      const label = document.createElement("span");
      label.textContent = stepLabel(id);
      const dot = document.createElement("span");
      dot.className = "rail-dot";
      btn.append(num, label, dot);
      li.append(btn);
      return li;
    }),
  );
}

function paintShell(s) {
  const { done, total, ratio } = progressOf(s);
  const pct = `${Math.round(ratio * 100)}%`;

  if ($("rail-done")) $("rail-done").textContent = String(done);
  if ($("rail-total")) $("rail-total").textContent = String(total);
  if ($("rail-bar")) $("rail-bar").style.width = pct;
  if ($("mprogress-text")) $("mprogress-text").textContent = `${done}/${total} bagian`;
  if ($("form-progress-text")) $("form-progress-text").textContent = `${done}/${total} bagian`;
  if ($("form-progress-fill")) $("form-progress-fill").style.width = pct;

  for (const node of document.querySelectorAll("#rail-list .rail-step, #sheet-list button")) {
    node.querySelector(".rail-dot")?.setAttribute("data-status", statusOf(s, node.dataset.step));
  }
}

function paintPmeta(scale) {
  const meta = $("pmeta");
  if (!meta) return;
  const tpl = TEMPLATES[state.template]?.label ?? "";
  const skala = scale >= 0.999 ? "1:1" : `${Math.round(scale * 100)}%`;
  meta.textContent = `A4 · 210 × 297 mm · ${tpl} · skala ${skala}`;
}

const repaint = debounce(() => {
  renderPreview(previewRoot, state);
  paintBadge();
  paintShell(state);
  fitPreview();
}, 120);

// Fit-to-width preview: skala = min(1, lebar tersedia / 794). (tampilan saja)
const viewport = document.querySelector(".preview-viewport");
let lastScale = -1;
function fitPreview() {
  const sheet = previewRoot?.firstElementChild;
  const panel = $("preview-panel");
  if (!viewport || !panel) return;
  if (!sheet) return;
  const avail = viewport.clientWidth;
  if (!avail) return;
  const w = sheet.offsetWidth || 794;
  const s = avail < w ? avail / w : 1;
  paintPmeta(s);
  if (Math.abs(s - lastScale) < 0.001) return;
  lastScale = s;
  panel.style.setProperty("--cv-scale", s.toFixed(4));
  panel.classList.toggle("is-fit", s < 1);
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
  buildRail(state);
  buildSheet(state);
  renderForm(formPanel, state, onChange);
  renderPreview(previewRoot, state);
  paintBadge();
  paintShell(state);
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

// Menu ⋮: tutup saat klik di luar atau Escape.
const menu = $("menu");
document.addEventListener("click", (e) => {
  if (menu?.open && !menu.contains(e.target)) menu.open = false;
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && menu?.open) menu.open = false;
});

$("btn-pdf").addEventListener("click", () => {
  const restore = setPrintTitle(filename(state, "pdf"));
  window.addEventListener("afterprint", () => setTimeout(restore, 0), { once: true });
  window.print();
});

async function exportDocx(e) {
  const btn = e.currentTarget;
  btn.disabled = true;
  try {
    downloadBlob(await buildDocx(state), docxFilename(state));
  } catch (err) {
    alert(`Gagal membuat DOCX: ${err.message}`);
  } finally {
    btn.disabled = false;
  }
}
$("btn-docx").addEventListener("click", exportDocx);
$("btn-docx-menu").addEventListener("click", (e) => {
  menu.open = false;
  exportDocx(e);
});

$("btn-json").addEventListener("click", () => {
  menu.open = false;
  downloadBlob(store.toJSONFile(state), filename(state, "json"));
});

$("btn-import").addEventListener("click", () => {
  menu.open = false;
  $("file-import").click();
});

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
