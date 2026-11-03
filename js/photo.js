// Crop tengah foto ke rasio 3:4 dan kecilkan ke 354x472 supaya muat di kuota localStorage.

const MAX_BYTES = 8 * 1024 * 1024;
const OUT_W = 354;
const OUT_H = 472; // 3:4
const RATIO = OUT_W / OUT_H;

function readDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("File gambar tidak bisa dibaca"));
    fr.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("File gambar tidak bisa dibaca"));
    // CSP hanya mengizinkan img-src 'self' data:, jadi lewat dataURL (bukan blob:).
    img.src = src;
  });
}

export function estimateBytes(dataURL) {
  const i = String(dataURL).indexOf(",");
  const b64 = i >= 0 ? String(dataURL).slice(i + 1) : String(dataURL);
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - pad);
}

export async function processPhoto(file) {
  if (!file || typeof file.type !== "string" || !file.type.startsWith("image/")) {
    throw new Error("File harus berupa gambar (JPG, PNG, atau WebP)");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Ukuran foto maksimal 8 MB. Perkecil dulu, lalu unggah lagi.");
  }

  const img = await loadImage(await readDataURL(file));
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;
  if (!sw || !sh) throw new Error("File gambar tidak bisa dibaca");

  // Crop tengah: ambil area 3:4 terbesar yang muat.
  let cw = sw;
  let ch = sw / RATIO;
  if (ch > sh) {
    ch = sh;
    cw = sh * RATIO;
  }
  const sx = (sw - cw) / 2;
  const sy = (sh - ch) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pengolahan gambar");
  // JPEG tidak punya alpha: latar putih, bukan hitam.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, OUT_W, OUT_H);
  ctx.drawImage(img, sx, sy, cw, ch, 0, 0, OUT_W, OUT_H);

  const dataURL = canvas.toDataURL("image/jpeg", 0.8);
  if (!dataURL.startsWith("data:image/jpeg")) throw new Error("Foto gagal diproses");
  return dataURL;
}
