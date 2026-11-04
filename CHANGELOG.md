# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/), versi mengikuti [SemVer](https://semver.org/lang/id/).

## [1.1.0] — 2026-11-04

Fokus: orientasi saat mengisi dan umpan balik. Lembar CV A4, ekspor PDF/DOCX, dan format draft JSON tidak berubah.

### Ditambahkan
- Navigasi 10 langkah: rail bernomor di desktop (01 Identitas + 9 section) dengan status per langkah (selesai / sebagian / belum diisi / dilewati) dan progress "x/10 bagian".
- Section bisa dilipat (`<details>`); tombol **Buka semua** untuk yang lebih suka menggulir. Di HP, chip langkah aktif membuka daftar 10 bagian sebagai bottom sheet.
- Undo untuk hapus entri, baris pencapaian, dan foto lewat toast **Urungkan** (8 detik). Undo dibatalkan saat template diganti, JSON diimpor, atau ada penghapusan berikutnya.
- Status simpan otomatis: "Tersimpan HH.MM", atau "Gagal menyimpan" yang bisa diklik untuk melihat penyebabnya.
- Empty state pratinjau saat draft masih kosong, plus meta bar A4 (ukuran, template, skala).
- `js/progress.js`: satu-satunya sumber aturan status/progress, diuji unit (15 kasus).

### Diubah
- Toolbar HP dari 3 baris (184px) menjadi satu baris (±56px); **Simpan PDF** selalu terlihat 44px; JSON, Muat JSON, dan DOCX pindah ke menu ⋮.
- Error DOCX dan import JSON memakai toast, bukan `alert()`.
- Kolom pratinjau desktop lebih lebar; skala ≥0,86 pada 1366×900 (sebelumnya ±0,72).
- `index.html`, `css/app.css`, `js/form.js`, dan `js/main.js` direstrukturisasi untuk shell tiga kolom.

### Diperbaiki
- Blok CSS `#form-panel` / `#preview-panel` berada di luar media query sehingga bocor ke mobile (pratinjau HP kena `position: sticky`, tinggi 100%, padding desktop).
- Menambah, memindah, atau menghapus entri memanggil `onChange()` tanpa argumen sehingga seluruh draft menjadi `undefined` dan tersimpan sebagai string `"undefined"` di `localStorage`.
- Tinggi layout desktop tidak lagi memakai angka footer yang di-hardcode (46px).

### Diverifikasi
- `npm test` 15/15 dan `npm run test:e2e` 5 check: smoke, layout (390/1024/1366), navigasi, feedback (undo/toast/status simpan/import), print.
- PDF dari state penuh dengan semua section terlipat: 1 halaman A4, teks asli, tanpa elemen UI.
- DOCX dari browser → LibreOffice: 1 halaman A4.
- 390×844: tanpa scroll horizontal, toolbar ≤60px, tombol PDF 44px terlihat.

## [1.0.0] — 2026-11-03

Rilis pertama. Situs statis di GitHub Pages, 100% client-side.

### Ditambahkan
- Form 9 section sesuai standar CV Indonesia: ringkasan profil, data pribadi, pendidikan, pengalaman kerja, organisasi, keterampilan, sertifikasi, bahasa, referensi.
- Preview A4 live yang otomatis menyesuaikan lebar panel (skala 0.46 di HP, 1.0 di layar lebar) — lembar tidak pernah terpotong.
- Badge jumlah halaman: memberi tahu saat isian melewati satu halaman, sebelum dicetak.
- Tombol **Simpan PDF** lewat dialog print dengan `@page A4 margin 0`; nama file otomatis `CV-<nama>-<posisi>.pdf`.
- Tombol **DOCX** yang membangun file Word di browser (`docx@9.15.1`, di-vendor), termasuk foto 28×38mm bila diunggah.
- Dua template: **Fresh Graduate** (pendidikan & organisasi menonjol) dan **Berpengalaman** (kerja menonjol, organisasi disembunyikan); urutan section bisa diubah manual.
- Upload foto: crop tengah 3:4, dikompres ke 354×472 JPEG sebelum disimpan.
- Autosave draft di `localStorage` + export/import JSON untuk arsip dan pindah perangkat.
- Halaman [panduan](https://akuh8820.github.io/cv-maker/panduan.html): aturan ATS, kata kunci lowongan, foto, data yang tidak perlu dicantumkan, kesalahan umum.
- Tombol **Laporkan bug** yang membuka issue GitHub dengan info teknis terisi otomatis (browser, viewport, template, jumlah halaman) — tanpa isi CV.
- CSP `default-src 'self'`, tanpa request eksternal, tanpa analytics, tanpa cookie pihak ketiga.

### Catatan teknis
- Tanpa build step: HTML + ES modules + satu file vendor; deploy langsung dari branch `main`.
- Geometri HTML dan DOCX disamakan (A4, padding 1.6cm, lebar isi 178mm) supaya hitungan halaman konsisten.
- Print hanya mencetak `.cv-sheet`; toolbar, form, tabbar, dan footer disembunyikan di `@media print`.

### Diverifikasi
- Chrome headless: PDF dari situs live = 1 halaman A4 dengan teks asli (bukan gambar), 0 error console, 0 request eksternal.
- DOCX hasil browser → LibreOffice: 1 halaman A4, 9 heading, foto ter-embed.
- Mobile 390×844: tab Isi/Preview berfungsi, tanpa scroll horizontal; desktop 1366×900 dan 1920×1080 diperiksa.

### Diketahui belum terverifikasi
- Safari iOS: `@page margin: 0` kadang tidak dihormati sehingga PDF bisa punya border putih.
- Microsoft Word asli (verifikasi DOCX memakai LibreOffice + metric-compatible Carlito).
- Kuota `localStorage` saat benar-benar penuh (penanganan error ada, diuji lewat simulasi).
