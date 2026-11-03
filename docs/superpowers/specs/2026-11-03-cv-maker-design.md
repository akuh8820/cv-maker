# Bikin CV — Design Doc

Tanggal: 2026-11-03 · Status: menunggu approval · Repo: `cv-maker` · Host: GitHub Pages

## Intent

Alat web gratis berbahasa Indonesia untuk membuat CV sesuai standar lokal (data pribadi, foto 3x4, organisasi, IPK), dengan hasil PDF/DOCX yang lolos ATS dan aturan 1 halaman. Semua jalan di browser — data pribadi tidak pernah dikirim ke server.

Kenapa: template statis (yang sudah ada di `/root/CV`) berguna, tapi user tetap harus menebak panjang isian, lupa ganti placeholder, dan tidak tahu apakah CV-nya jadi 2 halaman. Form + preview live menutup ketiga masalah itu.

## Goals

- Isi CV lewat form → lihat preview A4 live → simpan PDF dan/atau DOCX.
- Pengguna tahu lebih dulu apakah isiannya bakal jadi 1 atau 2 halaman.
- Hasil PDF berisi teks asli (bukan gambar) supaya terbaca ATS.
- Jalan di HP tanpa install apa pun; layout mobile-first.
- 100% statis: tanpa backend, tanpa build step, tanpa dependensi eksternal saat runtime.
- Data disimpan lokal + bisa export/import JSON.

## Non-goals (versi 1)

- Akun, login, cloud sync, kolaborasi.
- Lebih dari 1 CV tersimpan (1 draft aktif + JSON).
- Bahasa selain Indonesia.
- Template desain beraneka warna/tema.
- Pembuatan PDF sekali-klik dengan engine sendiri (lihat Approaches).
- Analisis ATS otomatis / skor CV dengan AI.

## Anti-goals (kalau ini terjadi, proyeknya gagal)

- Data pribadi user terkirim ke server mana pun, termasuk analytics pihak ketiga.
- PDF berisi hasil screenshot (gambar) sehingga tidak terbaca ATS.
- Butuh build step (npm/bundler) supaya bisa deploy.
- Preview A4 berbeda dari hasil cetak.

## Constraints

- GitHub Pages: file statis saja, HTTPS, tanpa server-side.
- `localStorage` ~5MB → foto harus di-resize (JPEG 3x4, lebar 354px).
- Font harus font sistem (Calibri/Carlito/Arial) — tanpa webfont eksternal.
- Harus tetap benar di Chrome desktop, Chrome Android (kasus utama), Safari iOS (dengan catatan margin print).
- Repo publik: tidak boleh ada data pribadi siapa pun ter-commit.

## Approaches (dipilih: A, lanjut B)

**A. Preview HTML + print-to-PDF** — pakai CSS print yang sudah terverifikasi 1 halaman A4 di template lama. PDF dihasilkan `window.print()`.
- Plus: nol dependensi, teks asli, hasil tajam, layout cuma ditulis sekali.
- Minus: user harus lewat dialog print; di iOS Safari margin `@page 0` tidak selalu dihormati → bisa ada border putih.

**B. A + export DOCX di browser** — library `docx` (build UMD) dijalankan di klien, logic diangkat dari `build-docx.mjs`.
- Plus: portal lamaran Indonesia sering minta DOCX; ini pembeda utama vs CV builder lain.
- Minus: +1 file vendor (~600KB) dan layout kedua yang harus dijaga sinkron.

**C. jsPDF / pdf-lib (layout digambar manual)** — tombol PDF sekali klik, hasil deterministik.
- Plus: tidak bergantung dialog print, margin pasti.
- Minus: layout ketiga yang harus disinkronkan; risiko preview ≠ PDF; kerja ~2x. Tidak dipakai sekarang, disiapkan sebagai jalur v2 kalau print-to-PDF mengecewakan.

**Ditolak: html2canvas + jsPDF** (PDF jadi gambar → ATS gagal baca).

## Keputusan yang sudah diambil user

- Repo `cv-maker`, judul situs "Bikin CV — Standar Indonesia".
- Publik, ada panduan: tips inline per section + halaman `/panduan`.
- 1 draft aktif + export/import JSON.
- PDF lewat print; DOCX opsional tapi masuk v1.

## Arsitektur

Tanpa framework, tanpa bundler. Modul ES6 di-load `<script type="module">`.

```
index.html          form + preview + toolbar
panduan.html        aturan screening, ATS, kesalahan umum
css/app.css         UI form/toolbar, mobile-first
css/cv.css          stylesheet CV A4 (dipakai preview & print)
js/store.js         state, localStorage, export/import JSON, migrasi versi
js/schema.js        definisi section & field (single source of truth)
js/form.js          render form dari schema, event binding
js/preview.js       render preview dari state + hitung tinggi halaman
js/photo.js         resize/crop foto 3x4 di canvas
js/docx.js          export DOCX (pakai vendor/docx.umd.js)
js/main.js          wiring, template picker, badge halaman
vendor/docx.umd.js  build browser dari npm `docx` (di-commit, versi dipin)
```

`css/cv.css` = hasil ekstraksi `cv-template.html`, satu-satunya sumber layout CV. Preview memakai file yang sama dengan mode print → preview = hasil cetak.

## Model data

```json
{
  "version": 1,
  "template": "freshgrad | experienced",
  "header": { "nama": "", "posisi": "", "telp": "", "email": "", "linkedin": "", "kota": "", "foto": null },
  "ringkasan": "",
  "dataPribadi": { "ttl": "", "jk": "", "agama": "", "status": "", "kewarganegaraan": "Indonesia", "alamat": "" },
  "pendidikan": [{ "jenjang": "", "institusi": "", "kota": "", "mulai": "", "selesai": "", "ipk": "", "catatan": "" }],
  "kerja": [{ "jabatan": "", "perusahaan": "", "kota": "", "jenis": "", "mulai": "", "selesai": "", "bullets": ["", ""] }],
  "organisasi": [ ...sama seperti kerja... ],
  "keterampilan": { "teknis": "", "perangkat": "", "lunak": "" },
  "sertifikasi": [{ "nama": "", "penerbit": "", "tahun": "", "berlaku": "" }],
  "bahasa": [{ "nama": "", "level": "" }],
  "referensi": { "mode": "tersedia | daftar", "items": [{ "nama": "", "jabatan": "", "kontak": "" }] },
  "urutan": ["ringkasan", "dataPribadi", "pendidikan", "kerja", "organisasi", "keterampilan", "sertifikasi", "bahasa", "referensi"],
  "sembunyi": []
}
```

`dataPribadi`, `organisasi`, `referensi` bisa disembunyikan (section jadi `null`/masuk `sembunyi`). Autosave debounce 400ms.

## Perilaku kunci

- **Badge halaman:** ukur tinggi preview vs 1122.5px (297mm @96dpi). ≤1 halaman → hijau "1 halaman"; lebih → kuning "2 halaman — pertimbangkan memangkas". Hitung ulang saat input, debounce 200ms.
- **Template:** `freshgrad` (urutan default: pendidikan → organisasi → kerja) vs `experienced` (kerja → pendidikan, organisasi tersembunyi). Selalu bisa diubah manual.
- **Validasi ringan, tidak memblokir:** nama + minimal satu kontak wajib untuk tombol cetak; email dicek format; tanggal harus urut; bullet >2 baris atau >25 kata diberi tanda; placeholder kosong tidak dicetak.
- **Foto:** input file → crop tengah ke rasio 3:4 → JPEG kualitas 0.8 lebar 354px → dataURL. Bisa dihapus. Peringatan kalau localStorage >3MB.
- **Print:** tombol memanggil `window.print()` dengan `document.body.dataset.mode = "print"` supaya hanya CV yang tercetak; `@page { size: A4; margin: 0 }`.
- **Export DOCX:** tombol terpisah; file `CV-<nama>-<posisi>.docx`; layout mengikuti `cv-template.docx` yang sudah ada.
- **Export/Import JSON:** unduh `<nama>-cv.json`, import dengan validasi `version` + migrasi.

## UI

Mobile-first. <900px: satu kolom — tab "Isi" / "Preview" (preview full-screen, tombol kembali). ≥900px: dua kolom, form kiri scroll sendiri, preview kanan sticky dengan skala agar muat viewport (transform scale, bukan zoom font).

Form: satu section per `<fieldset>` dengan `<legend>`, entri berulang punya tombol tambah/hapus/naik-turun, semua field punya `<label>`, error pakai `aria-describedby`, badge halaman `aria-live="polite"`.

Tanpa ikon dekoratif; tipografi sistem; state kosong punya pesan jelas ("Belum ada pengalaman kerja — lewati kalau fresh graduate").

## Keamanan & privasi

- Tanpa `fetch` ke domain luar; CSP meta: `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'`.
- Tidak ada analytics, tidak ada cookie pihak ketiga.
- Import JSON: hanya render teks (hindari `innerHTML` untuk nilai user), tolak field tak dikenal.
- Repo publik berisi contoh data fiktif saja.

## Deployment

- Repo `cv-maker` (publik), branch `main`, root folder → GitHub Pages, tanpa Actions.
- `README.md` (publik), `LICENSE` MIT, `.gitignore`.
- URL: `https://akuh8820.github.io/cv-maker/`.

## Verifikasi

- Chrome headless (sudah tersedia di mesin ini) untuk: tinggi preview vs 1 halaman, tidak ada overflow horizontal, jumlah halaman PDF = 1 untuk data contoh, tidak ada request eksternal (cek network log).
- LibreOffice (`soffice --convert-to pdf`) untuk DOCX hasil export browser: 1 halaman A4, 10 section ada.
- Uji data panjang (3 pekerjaan × 4 bullet) → badge harus berubah ke 2 halaman dan tidak ada entri terpotong (`page-break-inside: avoid`).
- Cek mobile 390×844: tab Isi/Preview berfungsi, tidak ada scroll horizontal.
- Cek keyboard-only: semua field bisa diisi, tombol bisa diaktifkan, fokus terlihat.

## Keputusan implementasi (jawaban builder check)

1. **Node & ambang badge halaman.** Yang diukur `.cv-sheet` (pembungkus isi, tanpa `min-height`, tanpa padding). Ambang = 265mm ≈ 1001.8px (297mm − 2×16mm). Tinggi dihitung `Math.max(sheet.scrollHeight, lastChild.bottom - sheet.top)`. Verifikasi wajib: data panjang → badge harus jadi "2 halaman".
2. **Node print = node preview.** Satu DOM. Skala layar hanya pada wrapper (`.preview-viewport`) via `transform: scale()`; `@media print` menetapkan `transform: none` pada wrapper dan `body > *:not(.cv-sheet) { display: none }`. Anti-goal "preview = hasil cetak" diuji dengan membandingkan PDF hasil print dan tinggi `.cv-sheet`.
3. **Foto di DOCX: di-embed.** `ImageRun` dari dataURL (JPEG hasil resize 354×472) di header, teks placeholder tidak dipakai lagi saat ada foto. Kalau `header.foto` null → header kembali ke layout teks (nama + kontak), tanpa kotak kosong.
4. **Geometri disamakan ke HTML.** Margins DOCX jadi 1.6cm semua sisi (konten 178mm = 10091 twips); `LABEL_TAB` tetap 44mm, tab kanan periode = 10091. Tujuannya: jumlah baris di HTML dan DOCX konvergen sehingga klaim "1 halaman" berlaku untuk keduanya.
5. **Nama file PDF.** Sebelum `window.print()`, `document.title` di-set ke `CV-<nama>-<posisi>` (spasi → `-`, buang `/ \ : * ? " < > |`), dikembalikan setelah dialog. DOCX memakai aturan sama.
6. **Isi repo publik = situs saja.** Root: `index.html`, `panduan.html`, `css/`, `js/`, `vendor/docx.umd.cjs`, `README.md`, `LICENSE`, `docs/`. Tidak di-commit: `build-docx.mjs`, `package.json`, `preview-*.pdf`, `cv-template.*`, `CONTENT.md`. Vendor ditulis dari `docx@9.15.1` `dist/index.umd.cjs` (bukan `index.umd.js`).

## Yang diserahkan ke builder

- Nama endpoint/tombol final, urutan field dalam form, microcopy, dan tata letak toolbar.
- Cara crop foto (drag vs auto center).
- Apakah panduan memakai halaman terpisah atau panel samping (default: halaman terpisah).
- Detail visual (spacing, ukuran tombol) — desain mengikuti `css/cv.css` yang sudah ada.
