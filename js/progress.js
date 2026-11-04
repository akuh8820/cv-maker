// Status & progress langkah pengisian. Murni fungsi, tanpa DOM.
// Satu-satunya sumber aturan "selesai/sebagian/kosong/dilewati".
import { SECTIONS } from "./schema.js";

const txt = (v) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());

function filled(v) {
  if (v == null) return false;
  if (typeof v === "string") return txt(v) !== "";
  if (Array.isArray(v)) return v.some(filled);
  if (typeof v === "object") return Object.values(v).some(filled);
  return true;
}

const anyFilled = (obj, keys) => keys.some((k) => filled(obj?.[k]));
const isComplete = (item, keys) => keys.every((k) => filled(item?.[k]));

// Entri berulang: selesai bila ada satu entri lengkap, sebagian bila ada isian.
function entriesStatus(items, keys) {
  if (!Array.isArray(items) || items.length === 0) return "kosong";
  if (items.some((it) => isComplete(it, keys))) return "selesai";
  if (items.some((it) => filled(it))) return "sebagian";
  return "kosong";
}

const RULES = {
  identitas: (s) => {
    const h = s.header || {};
    if (filled(h.nama) && anyFilled(h, ["telp", "email", "linkedin"])) return "selesai";
    return filled(h) ? "sebagian" : "kosong";
  },
  ringkasan: (s) => {
    const len = txt(s.ringkasan).length;
    if (len >= 120) return "selesai";
    return len > 0 ? "sebagian" : "kosong";
  },
  dataPribadi: (s) => {
    const dp = s.dataPribadi || {};
    const n = Object.entries(dp).filter(([k, v]) => filled(v) && !(k === "kewarganegaraan" && txt(v) === "Indonesia")).length;
    if (n >= 3) return "selesai";
    return n > 0 ? "sebagian" : "kosong";
  },
  pendidikan: (s) => entriesStatus(s.pendidikan, ["jenjang", "institusi"]),
  kerja: (s) => entriesStatus(s.kerja, ["jabatan", "perusahaan"]),
  organisasi: (s) => entriesStatus(s.organisasi, ["peran", "organisasi"]),
  keterampilan: (s) => {
    const n = Object.values(s.keterampilan || {}).filter(filled).length;
    if (n >= 2) return "selesai";
    return n > 0 ? "sebagian" : "kosong";
  },
  sertifikasi: (s) => entriesStatus(s.sertifikasi, ["nama"]),
  bahasa: (s) => entriesStatus(s.bahasa, ["nama"]),
  referensi: (s) => {
    const ref = s.referensi || {};
    if (ref.mode !== "daftar") return "selesai";
    if ((ref.items || []).some((it) => filled(it?.nama))) return "selesai";
    return "sebagian";
  },
};

export const STATUS_LABEL = {
  selesai: "Selesai",
  sebagian: "Sebagian",
  kosong: "Belum diisi",
  dilewati: "Dilewati",
};

export function stepIds(state) {
  return ["identitas", ...(state.order || [])];
}

export function stepLabel(id) {
  if (id === "identitas") return "Identitas";
  return SECTIONS.find((s) => s.id === id)?.label ?? id;
}

export function statusOf(state, id) {
  if ((state.hide || []).includes(id)) return "dilewati";
  return RULES[id]?.(state) ?? "kosong";
}

export function progressOf(state) {
  const ids = stepIds(state);
  const done = ids.filter((id) => ["selesai", "dilewati"].includes(statusOf(state, id))).length;
  return { done, total: ids.length, ratio: ids.length ? done / ids.length : 0 };
}
