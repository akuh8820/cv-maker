// Tautan "Laporkan bug": bawa info teknis secukupnya, TANPA isi CV user.
const REPO = "https://github.com/akuh8820/cv-maker";
const VERSION = "1.0.0";

export function diagnostics(state, sheet) {
  const sections = (state.order || []).filter((id) => !(state.hide || []).includes(id));
  const pages = sheet && sheet.scrollHeight > 0 ? (sheet.scrollHeight > 1001.6 ? 2 : 1) : 1;
  return [
    `versi: ${VERSION}`,
    `browser: ${navigator.userAgent}`,
    `viewport: ${window.innerWidth}x${window.innerHeight} (dpr ${window.devicePixelRatio})`,
    `template: ${state.template}`,
    `section aktif: ${sections.length}`,
    `terukur: ${pages} halaman`,
    `foto: ${state.header?.foto ? "ada" : "tidak ada"}`,
  ].join("\n");
}

export function reportUrl(state, sheet) {
  const body = [
    "## Apa yang terjadi",
    "",
    "",
    "## Langkah reproduksi",
    "1. ",
    "2. ",
    "",
    "## Yang diharapkan",
    "",
    "",
    "## Info teknis (otomatis)",
    "```",
    diagnostics(state, sheet),
    "```",
    "",
    "_Jangan tempel isi CV atau data pribadi di sini. Kalau perlu, sensor dulu._",
  ].join("\n");
  const q = new URLSearchParams({ labels: "bug", title: "[Bug] ", body });
  return `${REPO}/issues/new?${q}`;
}

export function wireReportLink(state, sheet) {
  const el = document.getElementById("link-bug");
  if (el) el.href = reportUrl(state, sheet);
}
