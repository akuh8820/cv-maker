// Smoke: aplikasi versi sekarang harus tetap hidup setelah shell diubah.
import { openApp } from "../helpers.mjs";

export const name = "smoke";

export async function run({ browser, url }) {
  const { page, errors } = await openApp(browser, url);
  const info = await page.evaluate(() => ({
    fieldsets: document.querySelectorAll("#form-panel fieldset").length,
    badge: (document.getElementById("badge")?.textContent || "").trim(),
  }));
  await page.close();

  if (info.fieldsets !== 9) throw new Error(`fieldset = ${info.fieldsets}, harus 9`);
  if (!info.badge) throw new Error("badge halaman kosong");
  if (errors.length) throw new Error(`console error: ${errors.join(" | ")}`);
}
