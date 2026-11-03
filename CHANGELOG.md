# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/), versi mengikuti [SemVer](https://semver.org/lang/id/).

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
