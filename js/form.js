// Formulir: dirender dari schema.js (satu-satunya sumber section/field).
// Satu <fieldset> per section + blok header/foto di atas.
// Perubahan input memutasi state lalu onChange(state); re-render lokal hanya
// untuk perubahan struktur (tambah/hapus/naik/turun) supaya fokus tetap.

import { SECTIONS, TEMPLATES } from "./schema.js";
import { processPhoto } from "./photo.js";
import { statusOf, stepIds, stepLabel, STATUS_LABEL } from "./progress.js";

const NO_UI = { activeId: null, openIds: new Set(), onActivate() {}, onToggle() {}, onDelete() {} };

// <summary> tiap langkah: nomor, nama, pill status, chevron.
function sectionSummary(state, id) {
  const summary = el("summary", "section-head");
  const num = el("span", "section-num", String(stepIds(state).indexOf(id) + 1).padStart(2, "0"));
  const name = el("span", "section-name", stepLabel(id));
  const status = statusOf(state, id);
  const pill = el("span", "pill", STATUS_LABEL[status]);
  pill.dataset.status = status;
  summary.append(num, name, pill, el("span", "chev", "▸"));
  return summary;
}

// Terapkan state buka/tutup + event accordion. `open` diset sebelum listener
// agar toggle awal tidak tercatat sebagai aksi user.
function wireDetails(box, id, ui) {
  const open = ui.openIds?.has(id) || ui.activeId === id;
  box.open = Boolean(open);
  box.addEventListener("toggle", () => ui.onToggle?.(id, box.open));
  return box;
}

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

// --- Tab mobile (Isi / Preview), state di sessionStorage ---

function setActiveTab(name) {
  document.body.dataset.tab = name;
  try { sessionStorage.setItem("cv-tab", name); } catch { /* private mode */ }
  for (const id of ["tab-form", "tab-preview"]) {
    const b = document.getElementById(id);
    if (!b) continue;
    const active = b.dataset.tab === name;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-pressed", String(active));
  }
}

function initTabs() {
  const tabbar = document.querySelector(".tabbar");
  if (!tabbar) return;
  if (!tabbar.dataset.bound) {
    tabbar.dataset.bound = "1";
    document.getElementById("tab-form").dataset.tab = "form";
    document.getElementById("tab-preview").dataset.tab = "preview";
    tabbar.addEventListener("click", (e) => {
      const b = e.target.closest(".tab");
      if (b) setActiveTab(b.dataset.tab);
    });
  }
  let saved = "form";
  try { saved = sessionStorage.getItem("cv-tab") || "form"; } catch { /* private mode */ }
  setActiveTab(saved === "preview" ? "preview" : "form");
}

// --- Kontrol dasar ---

function labeled(id, label, control, tipId) {
  const labelEl = el("label", "field-label", label);
  labelEl.htmlFor = id;
  control.id = id;
  if (tipId) control.setAttribute("aria-describedby", tipId);
  const wrap = el("div", "field");
  wrap.append(labelEl, control);
  return wrap;
}

function textInput(value, ph, oninput) {
  const input = el("input", "input");
  input.type = "text";
  if (ph) input.placeholder = ph;
  input.value = value ?? "";
  input.autocomplete = "off";
  input.addEventListener("input", () => oninput(input.value));
  return input;
}

function selectInput(options, value, onchange) {
  const select = el("select", "input");
  select.append(new Option("—", ""));
  for (const opt of options) select.append(new Option(opt, opt));
  if (value && options.includes(value)) select.value = value;
  select.addEventListener("input", () => onchange(select.value));
  return select;
}

// satu kontrol (text / select) yang menulis perubahan via onSet(key, value)
function control(idBase, def, value, onSet, tipId) {
  if (def.options)
    return labeled(`${idBase}-${def.key}`, def.label, selectInput(def.options, value, (v) => onSet(def.key, v)), tipId);
  return labeled(`${idBase}-${def.key}`, def.label, textInput(value, def.ph, (v) => onSet(def.key, v)), tipId);
}

// --- Baris bullet (maks 4) dengan tombol tambah/hapus ---

function bulletsBlock(idBase, entry, def, onChange, ui) {
  const rows = entry[def.key];
  const wrap = el("div", "field bullets-field");

  const list = el("ul", "bullet-list");
  const rerender = () => {
    list.replaceChildren();
    rows.forEach((v, i) => {
      const li = el("li", "bullet-row");
      const input = textInput(v, "Pencapaian dengan angka…", (val) => { rows[i] = val; onChange(); });
      input.id = `${idBase}-b${i}`;
      input.setAttribute("aria-label", `${def.label} baris ${i + 1}`);
      li.append(input);
      if (rows.length > 1) {
        const del = el("button", "btn-icon", "Hapus");
        del.type = "button";
        del.setAttribute("aria-label", `Hapus ${def.label.toLowerCase()} baris ${i + 1}`);
        del.addEventListener("click", () => {
          const [removed] = rows.splice(i, 1);
          onChange();
          rerender();
          ui.onDelete?.({
            message: `Baris ${def.label.toLowerCase()} dihapus`,
            undo: () => rows.splice(i, 0, removed),
          });
        });
        li.append(del);
      }
      list.append(li);
    });
  };
  rerender();
  wrap.append(el("span", "field-label", def.label));
  wrap.append(list);

  if (rows.length < 4) {
    const add = el("button", "btn-ghost", "+ Baris");
    add.type = "button";
    add.addEventListener("click", () => { rows.push(""); onChange(); rerender(); });
    wrap.append(add);
  } else {
    wrap.append(el("p", "hint", "Maksimal 4 baris. Pangkas yang paling lemah."));
  }
  return wrap;
}

// --- Kartu entri berulang ---

function entryTitle(entry) {
  for (const key of ["jabatan", "peran", "jenjang", "nama"]) {
    const v = (entry?.[key] ?? "").toString().trim();
    if (v) return v;
  }
  return "";
}

function entryCard(sid, idx, total, entry, section, onChange, rerender, tipId, ui) {
  const art = el("article", "entry");
  const head = el("div", "entry-head");
  head.append(el("span", "entry-num", String(idx + 1)));
  const actions = el("div", "entry-actions");
  const mk = (txt, enabled, fn) => {
    const b = el("button", "btn-icon", txt);
    b.type = "button";
    b.setAttribute("aria-label", `${txt} entri ${idx + 1}`);
    b.disabled = !enabled;
    b.addEventListener("click", fn);
    actions.append(b);
  };
  mk("Naik", idx > 0, () => {
    art.remove();
    const [x] = section.items.splice(idx, 1);
    section.items.splice(idx - 1, 0, x);
    onChange();
    rerender();
  });
  mk("Turun", idx < total - 1, () => {
    art.remove();
    const [x] = section.items.splice(idx, 1);
    section.items.splice(idx + 1, 0, x);
    onChange();
    rerender();
  });
  mk("Hapus", true, () => {
    art.remove();
    const [removed] = section.items.splice(idx, 1);
    onChange();
    rerender();
    const title = entryTitle(removed);
    ui.onDelete?.({
      message: title ? `Entri "${title}" dihapus` : "Entri dihapus",
      undo: () => section.items.splice(idx, 0, removed),
    });
  });
  head.append(actions);
  art.append(head);

  const idBase = `${sid}-e${idx}`;
  for (const def of section.itemFields) {
    if (def.type === "bullets") {
      art.append(bulletsBlock(idBase, entry, def, onChange, ui));
    } else {
      art.append(control(idBase, def, entry[def.key], (k, v) => { entry[k] = v; onChange(); }, tipId));
    }
  }
  return art;
}

// Daftar entri: host kartu + tombol "+ Tambah". sectionLike: { label, items, newItem, itemFields }.
function entryList(sid, sectionLike, emptyText, onChange, tipId, ui = NO_UI) {
  const host = el("div", "entries");
  const rerender = () => {
    host.replaceChildren();
    const total = sectionLike.items.length;
    if (!total) host.append(el("p", "empty", emptyText));
    sectionLike.items.forEach((entry, idx) =>
      host.append(entryCard(sid, idx, total, entry, sectionLike, onChange, rerender, tipId, ui)),
    );
  };
  rerender();

  const wrap = el("div", "entries-wrap");
  wrap.append(host);
  const add = el("button", "btn");
  add.type = "button";
  add.dataset.addEntry = sid;
  add.textContent = `+ Tambah ${sectionLike.label.toLowerCase()}`;
  add.addEventListener("click", () => {
    sectionLike.items.push(sectionLike.newItem());
    onChange();
    rerender();
  });
  wrap.append(add);
  return wrap;
}

// --- Isi section non-header ---

function sectionBody(section, state, onChange, ui) {
  const body = el("div", "section-body");
  const tipId = `${section.id}-tip`;

  if (section.type === "fields") {
    const obj = state[section.id];
    for (const def of section.fields)
      body.append(control(section.id, def, obj[def.key], (k, v) => { obj[k] = v; onChange(state); }, tipId));
  } else if (section.type === "longtext") {
    body.append(longTextField(section, state, onChange));
  } else if (section.type === "referensi") {
    const ref = state.referensi;
    body.append(control(section.id, { key: "mode", label: "Bentuk referensi", options: ["Tersedia atas permintaan", "Daftar"] },
      ref.mode === "daftar" ? "Daftar" : "Tersedia atas permintaan",
      (k, v) => { ref.mode = v === "Daftar" ? "daftar" : "tersedia"; onChange(state); },
      tipId));
    body.append(entryList("referensi-items",
      { label: "Referensi", items: ref.items, newItem: section.newItem, itemFields: section.itemFields },
      "Pilih \"Daftar\" untuk mengisi nama orang. Minta izinnya dulu.", onChange, tipId, ui));
  } else if (section.type === "entries") {
    body.append(entryList(section.id,
      { label: section.label, items: state[section.id], newItem: section.newItem, itemFields: section.itemFields },
      `Belum ada ${section.label.toLowerCase()}.${section.skippable ? " Lewati kalau tidak relevan." : ""}`,
      onChange, tipId, ui));
  }
  return body;
}

function longTextField(section, state, onChange) {
  const id = `${section.id}-text`;
  const area = el("textarea", "input textarea");
  area.id = id;
  area.rows = 4;
  if (section.ph) area.placeholder = section.ph;
  area.value = state[section.id] ?? "";
  area.maxLength = section.max;
  area.setAttribute("aria-describedby", `${section.id}-tip`);
  const counter = el("p", "counter", `0 / ${section.max}`);
  counter.textContent = `${area.value.length} / ${section.max}`;
  area.addEventListener("input", () => {
    state[section.id] = area.value;
    counter.textContent = `${area.value.length} / ${section.max}`;
    onChange(state);
  });
  const wrap = labeled(id, "Teks ringkasan", area, `${section.id}-tip`);
  wrap.append(counter);
  return wrap;
}

// --- Header & foto ---

function headerBlock(state, onChange, ui) {
  const box = el("details", "section");
  box.dataset.step = "identitas";
  box.append(sectionSummary(state, "identitas"));

  const body = el("div", "section-body");
  const tip = el("p", "tip", "Nama dan minimal satu kontak sebelum menyimpan PDF.");
  tip.id = "header-tip";
  body.append(tip);

  for (const [key, label, ph] of [
    ["nama", "Nama Lengkap", "Putri Ramadhani"],
    ["posisi", "Posisi yang Dilamar", "Staf Administrasi"],
    ["telp", "Telepon / WhatsApp", "0812-3456-7890"],
    ["email", "Email", "nama@email.com"],
    ["linkedin", "LinkedIn (tanpa https://)", "linkedin.com/in/namakamu"],
    ["kota", "Kota", "Jakarta"],
  ]) {
    body.append(labeled(`header-${key}`, label, textInput(state.header[key], ph, (v) => { state.header[key] = v; onChange(state); }), "header-tip"));
  }

  const err = el("p", "error");
  err.id = "foto-error";
  err.setAttribute("role", "alert");
  err.hidden = true;

  const thumb = el("img", "foto-thumb");
  thumb.alt = "Pratinjau foto 3x4";
  const file = el("input");
  file.type = "file";
  file.accept = "image/*";
  file.id = "foto-file";
  file.className = "sr-only";
  file.setAttribute("aria-describedby", "header-tip foto-error");

  const uploadLabel = el("label", "btn", "Unggah Foto 3x4");
  uploadLabel.htmlFor = "foto-file";
  const removeBtn = el("button", "btn-icon", "Hapus Foto");
  removeBtn.type = "button";

  const sync = () => {
    const has = Boolean(state.header.foto);
    thumb.hidden = !has;
    removeBtn.hidden = !has;
    uploadLabel.hidden = has;
    if (has) thumb.src = state.header.foto;
  };
  file.addEventListener("change", async () => {
    const f = file.files?.[0];
    file.value = "";
    if (!f) return;
    err.hidden = true;
    err.textContent = "";
    try {
      state.header.foto = await processPhoto(f);
      onChange(state);
      sync();
    } catch (e) {
      err.textContent = e.message;
      err.hidden = false;
    }
  });
  removeBtn.addEventListener("click", () => {
    const prev = state.header.foto;
    state.header.foto = null;
    onChange(state);
    sync();
    ui.onDelete?.({
      message: "Foto dihapus",
      undo: () => {
        state.header.foto = prev;
      },
    });
  });
  sync();

  file.addEventListener("focus", () => uploadLabel.classList.add("is-focus-within"));
  file.addEventListener("blur", () => uploadLabel.classList.remove("is-focus-within"));

  const fotoBox = el("div", "foto-box");
  fotoBox.append(el("span", "field-label", "Foto 3x4"), uploadLabel, file, thumb, removeBtn, err);
  body.append(fotoBox);
  box.append(body);
  return wireDetails(box, "identitas", ui);
}

// --- renderForm / setTemplate ---

export function renderForm(root, state, onChange, ui = NO_UI) {
  initTabs();
  const frag = document.createDocumentFragment();
  frag.append(headerBlock(state, onChange, ui));

  for (const sid of state.order) {
    const section = SECTIONS.find((s) => s.id === sid);
    if (!section) continue;

    const fs = el("details", "section");
    fs.dataset.section = section.id;
    fs.dataset.step = section.id;
    fs.dataset.tip = `${section.id}-tip`;
    fs.append(sectionSummary(state, section.id));

    const body = el("div", "section-body");
    const tip = el("p", "tip", section.tip);
    tip.id = `${section.id}-tip`;
    body.append(tip);

    if (section.skippable) {
      const id = `${section.id}-skip`;
      const skip = el("input");
      skip.type = "checkbox";
      skip.id = id;
      skip.className = "skip-check";
      skip.checked = state.hide.includes(section.id);
      const mark = () => fs.classList.toggle("is-skipped", skip.checked);
      mark();
      skip.addEventListener("change", () => {
        const i = state.hide.indexOf(section.id);
        if (skip.checked && i === -1) state.hide.push(section.id);
        if (!skip.checked && i !== -1) state.hide.splice(i, 1);
        mark();
        onChange(state);
      });
      const skipLabel = el("label", "skip-label", "Lewati section ini");
      skipLabel.htmlFor = id;
      skipLabel.setAttribute("aria-describedby", `${section.id}-tip`);
      const skipBox = el("div", "skip-box");
      skipBox.append(skip, skipLabel);
      body.append(skipBox);
    }

    body.append(sectionBody(section, state, onChange, ui));
    fs.append(body);
    frag.append(wireDetails(fs, section.id, ui));
  }
  root.replaceChildren(frag);
}

// State baru sesuai template: order & hide dari TEMPLATES.
export function setTemplate(state, name) {
  const tpl = TEMPLATES[name];
  if (!tpl) return state;
  return { ...state, template: name, order: [...tpl.order], hide: [...tpl.hide] };
}
