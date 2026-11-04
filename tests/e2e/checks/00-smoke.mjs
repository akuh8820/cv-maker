// Smoke: aplikasi versi sekarang harus tetap hidup setelah shell diubah.
import { openApp } from "../helpers.mjs";

export const name = "smoke";

export async function run({ browser, url }) {
  const { page, errors } = await openApp(browser, url);
  const info = await page.evaluate(() => ({
    fieldsets: document.querySelectorAll("#form-panel details[data-step]").length,
    badge: (document.getElementById("badge")?.textContent || "").trim(),
  }));
  await page.close();

  if (info.fieldsets !== 10) throw new Error(`langkah = ${info.fieldsets}, harus 10`);
  if (!info.badge) throw new Error("badge halaman kosong");
  if (errors.length) throw new Error(`console error: ${errors.join(" | ")}`);
}
