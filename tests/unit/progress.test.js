import test from "node:test";
import assert from "node:assert/strict";
import { blankState } from "../../js/schema.js";
import { statusOf, progressOf, stepIds, stepLabel } from "../../js/progress.js";

const fill = (state, id, value) => ({ ...state, [id]: value });
const entry = (over = {}) => ({ jenjang: "", institusi: "", kota: "", periode: "", catatan: "", ...over });

test("state kosong: hanya referensi yang selesai", () => {
  const s = blankState();
  assert.equal(statusOf(s, "identitas"), "kosong");
  assert.equal(statusOf(s, "ringkasan"), "kosong");
  assert.equal(statusOf(s, "dataPribadi"), "kosong");
  assert.equal(statusOf(s, "pendidikan"), "kosong");
  assert.equal(statusOf(s, "kerja"), "kosong");
  assert.equal(statusOf(s, "organisasi"), "kosong");
  assert.equal(statusOf(s, "keterampilan"), "kosong");
  assert.equal(statusOf(s, "sertifikasi"), "kosong");
  assert.equal(statusOf(s, "bahasa"), "kosong");
  assert.equal(statusOf(s, "referensi"), "selesai");
  assert.deepEqual(progressOf(s), { done: 1, total: 10, ratio: 0.1 });
});

test("identitas butuh nama + satu kontak", () => {
  let s = blankState();
  s.header.nama = "Putri";
  assert.equal(statusOf(s, "identitas"), "sebagian");
  s.header.email = "putri@example.com";
  assert.equal(statusOf(s, "identitas"), "selesai");
});

test("identitas: kota saja tetap sebagian", () => {
  const s = blankState();
  s.header.kota = "Jakarta";
  assert.equal(statusOf(s, "identitas"), "sebagian");
});

test("ringkasan selesai pada 120 karakter", () => {
  let s = blankState();
  s.ringkasan = "x".repeat(119);
  assert.equal(statusOf(s, "ringkasan"), "sebagian");
  s.ringkasan = "x".repeat(120);
  assert.equal(statusOf(s, "ringkasan"), "selesai");
});

test("data pribadi: default Indonesia tidak dihitung", () => {
  let s = blankState();
  s.dataPribadi.ttl = "Jakarta, 12 Mei 1999";
  s.dataPribadi.jk = "Perempuan";
  assert.equal(statusOf(s, "dataPribadi"), "sebagian");
  s.dataPribadi.status = "Belum Menikah";
  assert.equal(statusOf(s, "dataPribadi"), "selesai");
});

test("data pribadi: kewarganegaraan non-default dihitung", () => {
  const s = blankState();
  s.dataPribadi.kewarganegaraan = "Singapura";
  assert.equal(statusOf(s, "dataPribadi"), "sebagian");
});

test("pendidikan butuh jenjang + institusi dalam satu entri", () => {
  let s = blankState();
  s.pendidikan = [entry({ jenjang: "S1 Manajemen" })];
  assert.equal(statusOf(s, "pendidikan"), "sebagian");
  s.pendidikan = [entry({ jenjang: "S1 Manajemen", institusi: "UI" })];
  assert.equal(statusOf(s, "pendidikan"), "selesai");
});

test("kerja butuh jabatan + perusahaan", () => {
  let s = blankState();
  s.kerja = [{ jabatan: "Staf", perusahaan: "", kota: "Jakarta", jenis: "", periode: "", bullets: [""] }];
  assert.equal(statusOf(s, "kerja"), "sebagian");
  s.kerja[0].perusahaan = "PT Contoh";
  assert.equal(statusOf(s, "kerja"), "selesai");
});

test("organisasi butuh peran + organisasi", () => {
  let s = blankState();
  s.organisasi = [{ peran: "Bendahara", organisasi: "", kota: "", periode: "", bullets: [""] }];
  assert.equal(statusOf(s, "organisasi"), "sebagian");
  s.organisasi[0].organisasi = "HMJ";
  assert.equal(statusOf(s, "organisasi"), "selesai");
});

test("keterampilan selesai pada 2 dari 3 field", () => {
  let s = blankState();
  s.keterampilan.teknis = "Excel";
  assert.equal(statusOf(s, "keterampilan"), "sebagian");
  s.keterampilan.perangkat = "Office";
  assert.equal(statusOf(s, "keterampilan"), "selesai");
});

test("sertifikasi dan bahasa butuh nama entri", () => {
  let s = blankState();
  s.sertifikasi = [{ nama: "MOS", penerbit: "", tahun: "", berlaku: "" }];
  s.bahasa = [{ nama: "", level: "TOEFL 550" }];
  assert.equal(statusOf(s, "sertifikasi"), "selesai");
  assert.equal(statusOf(s, "bahasa"), "sebagian");
});

test("referensi daftar tanpa nama = sebagian, dengan nama = selesai", () => {
  let s = blankState();
  s.referensi = { mode: "daftar", items: [] };
  assert.equal(statusOf(s, "referensi"), "sebagian");
  s.referensi.items = [{ nama: "Ibu Sari", jabatan: "", kontak: "" }];
  assert.equal(statusOf(s, "referensi"), "selesai");
});

test("section yang dilewati menang atas aturan isi", () => {
  let s = blankState();
  s.hide = ["kerja"];
  assert.equal(statusOf(s, "kerja"), "dilewati");
  const p = progressOf(s);
  assert.equal(p.done, 2); // referensi + kerja yang dilewati
});

test("stepIds mengikuti urutan template, total tetap 10", () => {
  const s = blankState();
  assert.equal(stepIds(s)[0], "identitas");
  assert.equal(stepIds(s).length, 10);
  s.template = "experienced";
  s.order = ["ringkasan", "kerja", "pendidikan", "keterampilan", "sertifikasi", "bahasa", "dataPribadi", "organisasi", "referensi"];
  assert.equal(stepIds(s)[1], "ringkasan");
  assert.equal(stepIds(s)[2], "kerja");
  assert.equal(progressOf(s).total, 10);
});

test("stepLabel", () => {
  assert.equal(stepLabel("identitas"), "Identitas");
  assert.equal(stepLabel("kerja"), "Pengalaman Kerja");
});
