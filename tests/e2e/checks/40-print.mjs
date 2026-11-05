// Regresi print: UI baru tidak boleh ikut tercetak, dan hasilnya 1 halaman A4
// walau semua section dilipat.
import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openApp } from "../helpers.mjs";

export const name = "print";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const hasPoppler = (() => {
  try {
    execFileSync("pdfinfo", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

async function seed(page) {
  await page.evaluate(async () => {
    const store = await import("/js/store.js");
    const { blankState } = await import("/js/schema.js");
    const s = blankState();
    s.header.nama = "Putri Ramadhani";
    s.header.posisi = "Staf Administrasi";
    s.header.email = "putri@email.com";
    s.header.telp = "0812-3456-7890";
    s.header.kota = "Jakarta";
    s.ringkasan =
      "Staf Administrasi dengan 3 tahun pengalaman di bidang administrasi dan pengarsipan dokumen. Mengelola 500+ dokumen per bulan dan memangkas waktu rekap 30%.";
    s.kerja = [
      {
        jabatan: "Staf Administrasi",
        perusahaan: "PT Contoh Sejahtera",
        kota: "Jakarta",
        jenis: "Penuh waktu",
        periode: "2022 – Sekarang",
        bullets: ["Mengelola 500+ dokumen per bulan dengan arsip digital.", "Memangkas waktu rekap bulanan 30%."],
      },
      {
        jabatan: "Admin Magang",
        perusahaan: "CV Mitra Jaya",
        kota: "Jakarta",
        jenis: "Magang",
        periode: "2021 – 2022",
        bullets: ["Menyusun 120 surat masuk per bulan."],
      },
    ];
    s.pendidikan = [
      { jenjang: "S1 Manajemen", institusi: "Universitas Indonesia", kota: "Depok", periode: "2018 – 2022", catatan: "" },
    ];
    localStorage.setItem(store.KEY, JSON.stringify(store.normalizeState(s)));
  });
  await page.reload({ waitUntil: "networkidle0" });
  await wait(500);
}

export async function run({ browser, url }) {
  const { page, errors, dialogs } = await openApp(browser, url);
  await seed(page);

  // Semua section dilipat: print tidak boleh bergantung pada state accordion.
  await page.evaluate(() => {
    for (const d of document.querySelectorAll("#form-panel details[data-step]")) d.open = false;
    const t = document.getElementById("toast");
    if (t) {
      t.hidden = false;
      t.textContent = "Entri uji dihapus";
    }
  });
  await page.emulateMediaType("print");
  await wait(300);

  const hidden = await page.evaluate(() => {
    const ids = [
      "rail",
      "mprogress",
      "toast",
      "pmeta",
      "preview-empty",
      "form-panel",
      "form-progress",
    ];
    const sels = [".toolbar", ".tabbar", ".site-foot", "#sheet"];
    const out = {};
    for (const id of ids) out[id] = getComputedStyle(document.getElementById(id)).display;
    for (const sel of sels) {
      const el = document.querySelector(sel);
      out[sel] = el ? getComputedStyle(el).display : "none";
    }
    return out;
  });

  const visible = Object.entries(hidden).filter(([, v]) => v !== "none");
  if (visible.length) throw new Error(`elemen UI ikut tercetak: ${visible.map(([k]) => k).join(", ")}`);

  const file = join(tmpdir(), "bikincv-print.pdf");
  const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  writeFileSync(file, pdf);
  await page.emulateMediaType(null);
  await page.close();

  if (dialogs.length) throw new Error(`alert saat print: ${dialogs.join(" | ")}`);
  if (errors.length) throw new Error(`console: ${errors.join(" | ")}`);
  if (!hasPoppler) return; // tanpa poppler: hanya cek CSS

  const info = execFileSync("pdfinfo", [file], { encoding: "utf8" });
  const pages = Number((info.match(/^Pages:\s+(\d+)/m) || [])[1] || 0);
  if (pages !== 1) throw new Error(`PDF ${pages} halaman, harus 1`);

  const text = execFileSync("pdftotext", [file, "-"], { encoding: "utf8" });
  for (const needle of ["PUTRI RAMADHANI", "Staf Administrasi", "PT Contoh Sejahtera", "CV Mitra Jaya", "Universitas Indonesia"]) {
    if (!text.toLowerCase().includes(needle.toLowerCase()))
      throw new Error(`teks "${needle}" tidak ada di PDF`);
  }
  for (const needle of ["Buka semua", "Kemajuan", "Tersimpan", "Urungkan"]) {
    if (text.includes(needle)) throw new Error(`teks UI "${needle}" ikut tercetak`);
  }
  if (!existsSync(file)) throw new Error("PDF tidak dibuat");
}
