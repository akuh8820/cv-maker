import { SECTIONS } from "./schema.js";

const LABEL = Object.fromEntries(SECTIONS.map((s) => [s.id, s.label]));
const FIELDS = Object.fromEntries(SECTIONS.map((s) => [s.id, s.fields || s.itemFields || []]));
const DP = FIELDS.dataPribadi || [];
const txt = (v) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());
const join = (...p) => p.map(txt).filter(Boolean).join(" · ");
const pair = (a, b) => [txt(a), txt(b)].filter(Boolean).join(" — ");
const span = (a, b) => [txt(a), txt(b)].filter(Boolean).join(" – ");

function filled(v) {
  if (v == null) return false;
  if (typeof v === "string") return txt(v) !== "";
  if (Array.isArray(v)) return v.some(filled);
  if (typeof v === "object") return Object.values(v).some(filled);
  return true;
}

const dpEmpty = (v) => !DP.some((f) => txt(v?.[f.key]) && !(f.key === "kewarganegaraan" && txt(v[f.key]) === "Indonesia"));
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  return n;
}

function head(state) {
  const h = state.header || {};
  const wrap = el("header", "header");
  const main = el("div", "header-main");
  if (txt(h.nama)) main.append(el("h1", null, txt(h.nama).toUpperCase()));
  if (txt(h.posisi)) main.append(el("p", "posisi", txt(h.posisi)));
  const kontak = join(h.telp, h.email, h.linkedin, h.kota);
  if (kontak) main.append(el("p", "kontak", kontak));
  if (main.childElementCount) wrap.append(main);
  if (typeof h.foto === "string" && h.foto) {
    const img = Object.assign(el("img", "foto"), { src: h.foto, alt: "Foto" });
    wrap.append(img);
  }
  return wrap.childElementCount ? wrap : null;
}

function entry(title, period, meta, bullets, italic) {
  const e = el("div", "entri");
  const row = el("div", "baris1");
  row.append(el("strong", null, title));
  if (period) row.append(el("span", "tanggal", period));
  e.append(row);
  if (meta) e.append(el("p", italic ? "sub meta" : "sub", meta));
  const lis = (bullets || []).map(txt).filter(Boolean);
  if (lis.length) {
    const ul = el("ul");
    lis.forEach((b) => ul.append(el("li", null, b)));
    e.append(ul);
  }
  return e;
}

function build(id, state) {
  const v = state[id];
  const items = id === "referensi" ? (v?.items || []).filter(filled) : null;
  if (id === "referensi" ? !items.length : !filled(v)) return null;
  if (id === "dataPribadi" && dpEmpty(v)) return null;
  const s = el("section", "cv-section");
  s.append(el("h2", null, LABEL[id] || id));
  if (id === "ringkasan") s.append(el("p", null, txt(v)));
  else if (id === "dataPribadi") {
    const box = el("div", "data-pribadi");
    const rows = DP.filter((f) => txt(v[f.key]));
    for (let i = 0; i < rows.length; i += 2) {
      const kel = el("div", "kel");
      for (const f of rows.slice(i, i + 2)) {
        const p = el("p");
        p.append(el("span", "label", f.label), el("span", "nilai", txt(v[f.key])));
        kel.append(p);
      }
      box.append(kel);
    }
    s.append(box);
  } else if (id === "pendidikan") {
    v.filter(filled).forEach((it) => s.append(entry(txt(it.jenjang), txt(it.periode), join(it.institusi, it.kota, it.catatan))));
  } else if (id === "kerja") {
    v.filter(filled).forEach((it) => s.append(entry(pair(it.jabatan, it.perusahaan), txt(it.periode), join(it.kota, it.jenis), it.bullets, true)));
  } else if (id === "organisasi") {
    v.filter(filled).forEach((it) => s.append(entry(pair(it.peran, it.organisasi), txt(it.periode), join(it.kota), it.bullets, true)));
  } else if (id === "keterampilan") {
    FIELDS.keterampilan.forEach((f) => {
      const t = txt(v[f.key]);
      if (!t) return;
      const p = el("p", "baris-ket");
      p.append(el("span", "label", `${f.label}:`), document.createTextNode(` ${t}`));
      s.append(p);
    });
  } else if (id === "sertifikasi") {
    v.filter(filled).forEach((it) => s.append(entry(pair(it.nama, it.penerbit), span(it.tahun, it.berlaku))));
  } else if (id === "bahasa") {
    v.filter(filled).forEach((it) => s.append(el("p", "baris-ket", pair(it.nama, it.level))));
  } else if (id === "referensi") {
    if (v.mode === "tersedia") s.append(el("p", null, "Tersedia atas permintaan."));
    else items.forEach((it) => {
      const kontak = txt(it.kontak) ? `(${txt(it.kontak)})` : "";
      s.append(el("p", "baris-ket", `${pair(it.nama, it.jabatan)} ${kontak}`.trim()));
    });
  }
  return s;
}

export function renderPreview(root, state) {
  const sheet = el("div", "cv-sheet");
  const header = head(state);
  if (header) sheet.append(header);
  const hide = new Set(state.hide || []);
  for (const id of state.order || []) {
    if (hide.has(id)) continue;
    const s = build(id, state);
    if (s) sheet.append(s);
  }
  root.replaceChildren(sheet);
}

export function measure(sheet) {
  const limitPx = (265 * 96) / 25.4;
  const last = sheet.lastElementChild;
  const cs = getComputedStyle(sheet);
  const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const top = sheet.getBoundingClientRect().top + parseFloat(cs.paddingTop);
  const heightPx = Math.max(sheet.scrollHeight - pad, last ? last.getBoundingClientRect().bottom - top : 0);
  return { heightPx, limitPx, pages: heightPx > limitPx + 1 ? 2 : 1 };
}
