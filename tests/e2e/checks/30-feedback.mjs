// Umpan balik: undo hapus, status simpan, pratinjau kosong, error tanpa alert().
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openApp } from "../helpers.mjs";

export const name = "feedback";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const toast = (page) =>
  page.evaluate(() => {
    const t = document.getElementById("toast");
    if (!t || t.hidden) return null;
    return { text: t.textContent.trim(), action: t.querySelector(".toast-action")?.textContent?.trim() || "" };
  });

const clickStep = async (page, id) => {
  await page.evaluate((step) => {
    document.querySelector(`#rail-list .rail-step[data-step="${step}"]`)?.click();
  }, id);
  await wait(350);
};

async function seedPhoto(page, dataUrl) {
  await page.evaluate(async (url) => {
    const store = await import("/js/store.js");
    const { blankState } = await import("/js/schema.js");
    const s = blankState();
    s.header.nama = "Putri Ramadhani";
    s.header.foto = url;
    localStorage.setItem(store.KEY, JSON.stringify(store.normalizeState(s)));
  }, dataUrl);
  await page.reload({ waitUntil: "networkidle0" });
  await wait(400);
}

export async function run({ browser, url }) {
  // --- 1. Hapus entri kerja → toast + Urungkan mengembalikan di indeks semula ---
  {
    const { page, errors, dialogs } = await openApp(browser, url);
    await clickStep(page, "kerja");
    await page.evaluate(() => document.querySelector('button[data-add-entry="kerja"]').click());
    await wait(200);
    await page.type("#kerja-e0-jabatan", "Staf Administrasi");
    await page.type("#kerja-e0-perusahaan", "PT Contoh Sejahtera");
    await wait(600);

    await page.evaluate(() => {
      document.querySelector('details[data-section="kerja"] button[aria-label="Hapus entri 1"]').click();
    });
    await wait(300);

    const afterDelete = await page.evaluate(() => ({
      entries: document.querySelectorAll('details[data-section="kerja"] .entry').length,
    }));
    const t1 = await toast(page);
    if (afterDelete.entries !== 0) throw new Error(`entri masih ${afterDelete.entries} setelah hapus`);
    if (!t1) throw new Error("toast hapus tidak tampil");
    if (!/Hapus|hapus|dihapus/i.test(t1.text)) throw new Error(`teks toast: "${t1.text}"`);
    if (!t1.action) throw new Error("tombol Urungkan tidak ada di toast");

    await page.evaluate(() => document.querySelector("#toast .toast-action").click());
    await wait(400);

    const restored = await page.evaluate(() => ({
      entries: document.querySelectorAll('details[data-section="kerja"] .entry').length,
      jabatan: document.getElementById("kerja-e0-jabatan")?.value ?? "",
      toastText: document.getElementById("toast").hidden
        ? ""
        : document.getElementById("toast").textContent.trim(),
    }));
    if (restored.entries !== 1) throw new Error(`undo: entri = ${restored.entries}`);
    if (restored.jabatan !== "Staf Administrasi") throw new Error(`undo: jabatan = "${restored.jabatan}"`);
    if (!/Dikembalikan/i.test(restored.toastText))
      throw new Error(`toast setelah undo = "${restored.toastText}"`);
    if (dialogs.length) throw new Error(`alert/confirm muncul: ${dialogs.join(" | ")}`);
    if (errors.length) throw new Error(`console: ${errors.join(" | ")}`);
    await page.close();
  }

  // --- 2. Undo batal bila user mengganti template ---
  {
    const { page } = await openApp(browser, url);
    await clickStep(page, "kerja");
    await page.evaluate(() => document.querySelector('button[data-add-entry="kerja"]').click());
    await wait(200);
    await page.type("#kerja-e0-jabatan", "Staf Administrasi");
    await wait(500);
    await page.evaluate(() => {
      document.querySelector('details[data-section="kerja"] button[aria-label="Hapus entri 1"]').click();
    });
    await wait(200);
    if (!(await toast(page))) throw new Error("toast tidak muncul sebelum ganti template");

    await page.select("#template", "experienced");
    await wait(500);
    if (await toast(page)) throw new Error("toast undo masih ada setelah ganti template");
    const entries = await page.evaluate(
      () => document.querySelectorAll('details[data-section="kerja"] .entry').length,
    );
    if (entries !== 0) throw new Error(`entri terhapus muncul lagi setelah ganti template (${entries})`);
    await page.close();
  }

  // --- 3. Pratinjau kosong tampil saat lembar kosong, hilang setelah nama diisi ---
  {
    const { page } = await openApp(browser, url);
    const emptyAtStart = await page.evaluate(() => {
      const empty = document.getElementById("preview-empty");
      return { hidden: empty.hidden, text: empty.textContent.trim(), scale: getComputedStyle(empty).display };
    });
    if (emptyAtStart.hidden) throw new Error("overlay pratinjau kosong tidak tampil saat state kosong");
    if (!/Pratinjau/i.test(emptyAtStart.text)) throw new Error(`teks overlay: "${emptyAtStart.text}"`);

    await page.type("#header-nama", "Putri");
    await wait(500);
    const hiddenAfter = await page.evaluate(() => document.getElementById("preview-empty").hidden);
    if (!hiddenAfter) throw new Error("overlay masih tampil setelah nama diisi");

    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle0" });
    await wait(300);
    const back = await page.evaluate(() => document.getElementById("preview-empty").hidden);
    if (back) throw new Error("overlay tidak kembali setelah draft kosong dimuat ulang");
    await page.close();
  }

  // --- 4. Status simpan ---
  {
    const { page } = await openApp(browser, url);
    await page.type("#header-nama", "Putri");
    await wait(900);
    const st = await page.evaluate(() => {
      const desktop = document.getElementById("save");
      const mobile = document.getElementById("save-m");
      return { desktop: desktop.textContent.trim(), tone: desktop.dataset.tone || "", mobile: mobile.textContent.trim() };
    });
    if (!/Tersimpan \d{2}\.\d{2}/.test(st.desktop))
      throw new Error(`status simpan = "${st.desktop}" (harus "Tersimpan HH.MM")`);
    if (st.mobile && !/Tersimpan \d{2}\.\d{2}/.test(st.mobile))
      throw new Error(`status simpan HP = "${st.mobile}"`);
    await page.close();
  }

  // --- 5. Import JSON rusak → toast error, bukan alert() ---
  {
    const file = join(tmpdir(), "bikincv-rusak.json");
    writeFileSync(file, "{ ini bukan json }");
    const { page, dialogs } = await openApp(browser, url);
    const input = await page.$("#file-import");
    await input.uploadFile(file);
    await wait(600);
    const t = await toast(page);
    if (!t) throw new Error("tidak ada toast saat import gagal");
    if (!/gagal|Gagal/.test(t.text)) throw new Error(`toast import: "${t.text}"`);
    const tone = await page.evaluate(() => document.getElementById("toast").dataset.tone || "");
    if (tone !== "error") throw new Error(`tone toast = "${tone}"`);
    if (dialogs.length) throw new Error(`alert() masih dipakai: ${dialogs.join(" | ")}`);
    await page.close();
  }

  // --- 6. Hapus foto bisa diurungkan ---
  {
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const { page, dialogs } = await openApp(browser, url);
    await seedPhoto(page, png);
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("details[data-step='identitas'] button")].find(
        (b) => b.textContent.trim() === "Hapus Foto",
      );
      btn.click();
    });
    await wait(400);
    const gone = await page.evaluate(() => {
      const img = document.querySelector("details[data-step='identitas'] .foto-thumb");
      return img ? img.hidden : true;
    });
    if (!gone) throw new Error("foto tidak terhapus");
    const t = await toast(page);
    if (!t?.action) throw new Error("toast hapus foto tanpa Urungkan");
    await page.evaluate(() => document.querySelector("#toast .toast-action").click());
    await wait(400);
    const back = await page.evaluate(() => {
      const img = document.querySelector("details[data-step='identitas'] .foto-thumb");
      return img && !img.hidden ? img.src.slice(0, 22) : "";
    });
    if (!back.startsWith("data:image/png")) throw new Error("undo foto tidak mengembalikan gambar");
    if (dialogs.length) throw new Error(`alert() pada foto: ${dialogs.join(" | ")}`);
    await page.close();
  }
}
