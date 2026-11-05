// Accordion, rail aktif, chip + dialog, dan urutan dari template lain.
import { openApp } from "../helpers.mjs";

export const name = "navigasi";

const openSteps = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("#form-panel details[data-step]")]
      .filter((d) => d.open)
      .map((d) => d.dataset.step),
  );

export async function run({ browser, url }) {
  {
    const { page, errors } = await openApp(browser, url);
    const blank = await openSteps(page);
    if (blank.length !== 1 || blank[0] !== "identitas")
      throw new Error(`default buka = ${JSON.stringify(blank)}, harus ["identitas"]`);

    // Rail: lompat ke langkah 08.
    const before = await page.evaluate(() => document.getElementById("form-panel").scrollTop);
    await page.click('#rail-list .rail-step[data-step="keterampilan"]');
    await new Promise((r) => setTimeout(r, 500));
    const after = await page.evaluate(() => ({
      scrollTop: document.getElementById("form-panel").scrollTop,
      open: [...document.querySelectorAll("#form-panel details[data-step]")].filter((d) => d.open).map((d) => d.dataset.step),
      current: document.querySelector('.rail-step[aria-current="step"]')?.dataset.step,
      chip: document.getElementById("chip-section").textContent,
    }));
    if (!after.open.includes("keterampilan")) throw new Error("section tujuan tidak terbuka");
    if (after.current !== "keterampilan") throw new Error(`aria-current = ${after.current}`);
    if (!/Keterampilan/.test(after.chip)) throw new Error(`chip = "${after.chip}"`);
    if (after.scrollTop <= before) throw new Error("form tidak ter-scroll ke section tujuan");

    // Buka semua: semua terbuka, tapi langkah aktif tidak ikut berpindah.
    await page.click("#expand-all");
    await new Promise((r) => setTimeout(r, 300));
    const all = await openSteps(page);
    if (all.length !== 10) throw new Error(`buka semua = ${all.length} section`);
    const afterAll = await page.evaluate(() => ({
      current: document.querySelector('.rail-step[aria-current="step"]')?.dataset.step,
      chip: document.getElementById("chip-section").textContent,
    }));
    if (afterAll.current !== "keterampilan")
      throw new Error(`buka semua memindah langkah aktif ke ${afterAll.current}`);
    if (!/Keterampilan/.test(afterAll.chip)) throw new Error(`chip setelah buka semua = "${afterAll.chip}"`);

    // Tutup satu, reload: pilihan bertahan (sessionStorage).
    await page.click('#form-panel details[data-step="bahasa"] > summary');
    await new Promise((r) => setTimeout(r, 200));
    await page.reload({ waitUntil: "networkidle0" });
    const kept = await openSteps(page);
    if (kept.includes("bahasa")) throw new Error("section yang ditutup terbuka lagi setelah reload");
    if (!kept.includes("keterampilan")) throw new Error("langkah aktif tidak dipulihkan");

    if (errors.length) throw new Error(`console: ${errors.join(" | ")}`);
    await page.close();
  }

  // HP: chip membuka dialog, pilih langkah menutup dialog + membuka section.
  {
    const { page, errors } = await openApp(browser, url, { w: 390, h: 844, mobile: true });
    await page.click("#chip-section");
    await new Promise((r) => setTimeout(r, 300));
    const opened = await page.evaluate(() => document.getElementById("sheet").open);
    if (!opened) throw new Error("dialog tidak terbuka");
    await page.click('#sheet-list button[data-step="pendidikan"]');
    await new Promise((r) => setTimeout(r, 400));
    const after = await page.evaluate(() => ({
      open: document.getElementById("sheet").open,
      section: [...document.querySelectorAll("#form-panel details[data-step]")].find((d) => d.dataset.step === "pendidikan")?.open,
      chip: document.getElementById("chip-section").textContent,
    }));
    if (after.open) throw new Error("dialog tidak tertutup setelah memilih");
    if (!after.section) throw new Error("section pilihan tidak terbuka");
    if (!/Pendidikan/.test(after.chip)) throw new Error(`chip = "${after.chip}"`);
    if (errors.length) throw new Error(`HP console: ${errors.join(" | ")}`);
    await page.close();
  }

  // Template lain: nomor mengikuti order, organisasi = dilewati.
  {
    const { page } = await openApp(browser, url);
    await page.evaluate(async () => {
      const store = await import("/js/store.js");
      const { blankState } = await import("/js/schema.js");
      const s = blankState();
      s.template = "experienced";
      s.order = ["ringkasan", "kerja", "pendidikan", "keterampilan", "sertifikasi", "bahasa", "dataPribadi", "organisasi", "referensi"];
      s.hide = ["organisasi"];
      localStorage.setItem(store.KEY, JSON.stringify(store.normalizeState(s)));
    });
    await page.reload({ waitUntil: "networkidle0" });
    const rails = await page.evaluate(() =>
      [...document.querySelectorAll("#rail-list .rail-step")].map((b) => ({
        step: b.dataset.step,
        num: b.querySelector(".rail-num").textContent,
        dot: b.querySelector(".rail-dot").dataset.status,
        aria: b.getAttribute("aria-label"),
      })),
    );
    if (rails.length !== 10) throw new Error(`rail = ${rails.length} langkah`);
    if (rails[2].step !== "kerja" || rails[2].num !== "03") throw new Error(`langkah 03 = ${JSON.stringify(rails[2])}`);
    const org = rails.find((r) => r.step === "organisasi");
    if (org.num !== "09") throw new Error(`organisasi di ${org.num}`);
    if (org.dot !== "dilewati") throw new Error(`status organisasi = ${org.dot}`);
    if (!/^09 Pengalaman Organisasi$/.test(org.aria)) throw new Error(`aria-label rail = "${org.aria}"`);
    await page.close();
  }
}
