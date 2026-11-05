// Shell: toolbar HP ringkas, rail desktop, lembar A4 muat di kolomnya.
import { openApp } from "../helpers.mjs";

export const name = "layout";

const num = (v) => Number.parseFloat(v) || 0;

export async function run({ browser, url }) {
  // --- HP 390 ---
  {
    const { page, errors } = await openApp(browser, url, { w: 390, h: 844, mobile: true });
    const m = await page.evaluate(() => {
      const pdf = document.getElementById("btn-pdf").getBoundingClientRect();
      const bar = document.getElementById("mprogress");
      return {
        scrollW: document.documentElement.scrollWidth,
        toolbarH: Math.round(document.querySelector(".toolbar").getBoundingClientRect().height),
        pdfH: Math.round(pdf.height),
        pdfW: Math.round(pdf.width),
        mprogress: bar ? getComputedStyle(bar).display : "none",
        badgeM: document.getElementById("badge-m").textContent,
      };
    });
    if (m.scrollW > 390) throw new Error(`HP scroll horizontal: ${m.scrollW}`);
    if (m.toolbarH > 60) throw new Error(`toolbar HP ${m.toolbarH}px > 60`);
    if (m.pdfW === 0 || m.pdfH < 44) throw new Error(`tombol PDF HP ${m.pdfW}×${m.pdfH}`);
    if (m.mprogress === "none") throw new Error("baris progress HP tidak tampil");
    if (!m.badgeM) throw new Error("badge halaman HP kosong");
    if (errors.length) throw new Error(`HP console: ${errors.join(" | ")}`);

    // Label langkah terpanjang + status simpan harus tetap muat tanpa clipping.
    await page.type("#header-nama", "Putri");
    await new Promise((r) => setTimeout(r, 900));
    await page.evaluate(() => {
      document.querySelector('#rail-list .rail-step[data-step="organisasi"]').click();
    });
    await new Promise((r) => setTimeout(r, 300));
    const fit = await page.evaluate(() => {
      const row = document.getElementById("mprogress");
      const chip = document.getElementById("chip-section").getBoundingClientRect();
      return {
        rowScroll: row.scrollWidth,
        rowClient: row.clientWidth,
        chipRight: Math.round(chip.right),
        chipH: Math.round(chip.height),
        chipText: document.getElementById("chip-section").textContent,
      };
    });
    if (fit.rowScroll > fit.rowClient + 1)
      throw new Error(`baris progress meluber: ${fit.rowScroll} > ${fit.rowClient}`);
    if (fit.chipRight > 390 + 1) throw new Error(`chip keluar layar: right=${fit.chipRight}`);
    if (fit.chipH < 44) throw new Error(`chip ${fit.chipH}px < 44px`);
    if (!fit.chipText) throw new Error("chip langkah kosong");
    await page.close();
  }

  // --- Desktop 1366 ---
  {
    const { page, errors } = await openApp(browser, url, { w: 1366, h: 900 });
    const d = await page.evaluate(() => {
      const rail = document.getElementById("rail").getBoundingClientRect();
      const panel = document.getElementById("preview-panel").getBoundingClientRect();
      const sheet = document.querySelector("#preview-root .cv-sheet").getBoundingClientRect();
      const scale = getComputedStyle(document.getElementById("preview-panel")).getPropertyValue("--cv-scale");
      return {
        railW: Math.round(rail.width),
        railVisible: rail.width > 0,
        panelL: Math.round(panel.left),
        panelR: Math.round(panel.right),
        sheetL: Math.round(sheet.left),
        sheetR: Math.round(sheet.right),
        scale: Number.parseFloat(scale) || 1,
      };
    });
    await page.close();
    if (!d.railVisible || d.railW < 170) throw new Error(`rail desktop ${d.railW}px`);
    if (d.sheetL < d.panelL - 1 || d.sheetR > d.panelR + 1)
      throw new Error(`lembar keluar kolom: ${d.sheetL}..${d.sheetR} vs ${d.panelL}..${d.panelR}`);
    if (d.scale < 0.85) throw new Error(`skala pratinjau ${d.scale} < 0.85`);
    if (errors.length) throw new Error(`desktop console: ${errors.join(" | ")}`);
  }

  // --- 1024: rail sempit + progress di kepala form ---
  {
    const { page } = await openApp(browser, url, { w: 1024, h: 768 });
    const t = await page.evaluate(() => {
      const rail = document.getElementById("rail").getBoundingClientRect();
      const prog = document.getElementById("form-progress");
      return {
        railW: Math.round(rail.width),
        progDisplay: prog ? getComputedStyle(prog).display : "none",
        progText: document.getElementById("form-progress-text").textContent,
      };
    });
    await page.close();
    if (t.railW < 44 || t.railW > 60) throw new Error(`rail 1024 = ${t.railW}px`);
    if (t.progDisplay === "none") throw new Error("progress form tidak tampil di 1024");
    if (!/\d+\/10 bagian/.test(t.progText)) throw new Error(`teks progress "${t.progText}"`);
  }
}
