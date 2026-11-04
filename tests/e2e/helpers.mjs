// Helper E2E: browser, viewport, dan pembacaan error console.
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer";

// Cari Chrome yang sudah terpasang (cache puppeteer atau sistem) supaya tes
// tidak mengunduh browser baru.
function findChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache)) {
    for (const version of readdirSync(cache)) {
      for (const dir of readdirSync(join(cache, version))) {
        const bin = join(cache, version, dir, "chrome");
        if (existsSync(bin)) return bin;
      }
    }
  }
  for (const bin of ["/usr/bin/chromium", "/usr/bin/google-chrome"]) {
    if (existsSync(bin)) return bin;
  }
  return undefined;
}

export async function launch() {
  return puppeteer.launch({ executablePath: findChrome(), args: ["--no-sandbox"] });
}

export async function openApp(browser, url, { w = 1366, h = 900, mobile = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, isMobile: mobile });
  const errors = [];
  const dialogs = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("dialog", async (d) => {
    dialogs.push(d.message());
    await d.dismiss();
  });
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle0" });
  return { page, errors, dialogs };
}

// Isi input berdasarkan label teks (form dirender dari schema).
export async function fillByLabel(page, labelStart, value) {
  const handle = await page.evaluateHandle((needle) => {
    const label = [...document.querySelectorAll("#form-panel label")].find((l) =>
      (l.textContent || "").trim().startsWith(needle),
    );
    if (!label) return null;
    const id = label.getAttribute("for");
    return id ? document.getElementById(id) : label.querySelector("input,textarea,select");
  }, labelStart);
  const el = handle.asElement();
  if (!el) throw new Error(`field "${labelStart}" tidak ditemukan`);
  await el.click({ clickCount: 3 });
  await el.type(value);
  await new Promise((r) => setTimeout(r, 500));
}
