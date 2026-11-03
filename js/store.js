// State, localStorage, export/import JSON. Satu draft aktif.
import { SECTIONS, TEMPLATES, blankState } from "./schema.js";

export const KEY = "bikincv.draft.v1";
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// blankState + satu contoh entri per section berulang, agar field asing di entri impor dibuang.
function shape() {
  const s = blankState();
  for (const sec of SECTIONS) if (sec.newItem && Array.isArray(s[sec.id])) s[sec.id] = [sec.newItem()];
  const ref = SECTIONS.find((x) => x.id === "referensi");
  if (ref?.newItem) s.referensi.items = [ref.newItem()];
  return s;
}

const SHAPE = shape();
const IDS = SECTIONS.map((s) => s.id);

function normalize(tpl, val) {
  if (Array.isArray(tpl)) {
    if (isObj(tpl[0])) {
      if (!Array.isArray(val)) return [];
      return val.filter(isObj).map((v) => normalize(tpl[0], v));
    }
    if (!Array.isArray(val)) return [...tpl];
    return val.filter((x) => typeof x === "string");
  }
  if (isObj(tpl)) {
    const src = isObj(val) ? val : {};
    const out = {};
    for (const k of Object.keys(tpl)) out[k] = normalize(tpl[k], src[k]);
    return out;
  }
  if (tpl === null) return typeof val === "string" ? val : null;
  if (typeof tpl === "number") return typeof val === "number" && Number.isFinite(val) ? val : tpl;
  return typeof val === "string" ? val : tpl;
}

// State apa pun -> state lengkap yang aman dirender.
export function normalizeState(input) {
  const out = normalize(SHAPE, isObj(input) ? input : {});
  out.version = 1;
  out.template = Object.hasOwn(TEMPLATES, out.template) ? out.template : "freshgrad";
  const order = out.order.filter((id) => IDS.includes(id));
  for (const id of IDS) if (!order.includes(id)) order.push(id);
  out.order = order;
  out.hide = [...new Set(out.hide.filter((id) => IDS.includes(id)))];
  if (out.referensi.mode !== "daftar") out.referensi.mode = "tersedia";
  return out;
}

export function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY));
    if (!isObj(parsed)) return blankState();
    // Draft lama (version hilang/0) dimigrasikan lewat normalisasi yang sama.
    return normalizeState(parsed);
  } catch {
    return blankState();
  }
}

const isQuota = (e) =>
  e?.name === "QuotaExceededError" || e?.name === "NS_ERROR_DOM_QUOTA_REACHED" || e?.code === 22 || e?.code === 1014;

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    if (isQuota(e)) {
      throw new Error("Penyimpanan browser penuh (kuota ±5 MB). Hapus foto atau perkecil isian, lalu coba lagi.");
    }
    throw new Error("Draft gagal disimpan di browser ini.");
  }
}

export function toJSONFile(state) {
  return new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
}

export async function fromJSONFile(file) {
  let text;
  try {
    text = await file.text();
  } catch {
    throw new Error("File tidak bisa dibaca");
  }
  if (typeof text !== "string" || !text.trim()) throw new Error("File bukan JSON yang valid");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("File bukan JSON yang valid");
  }
  if (!isObj(parsed)) throw new Error("File bukan JSON yang valid");
  if (parsed.version !== 1) throw new Error("Versi file tidak dikenal");
  return normalizeState(parsed);
}

export function clear() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* localStorage tidak tersedia: tidak ada yang perlu dihapus */
  }
}

// Perkiraan byte seluruh localStorage (UTF-16 = 2 byte/karakter).
export function storageBytes() {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      total += (k.length + (localStorage.getItem(k) ?? "").length) * 2;
    }
  } catch {
    return 0;
  }
  return total;
}
