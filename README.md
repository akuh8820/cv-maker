# Bikin CV — Standar Indonesia

Alat web gratis untuk membuat CV sesuai standar Indonesia (data pribadi, foto 3x4, pengalaman organisasi, IPK) dengan preview A4 langsung saat mengetik. Hasilnya bisa disimpan sebagai **PDF** atau **DOCX**.

**Coba langsung:** https://akuh8820.github.io/cv-maker/

## Kenapa ada

Template CV statis bikin orang menebak-nebak: apakah isiannya jadi 2 halaman? apakah placeholder-nya sudah semua diganti? alat ini menutup dua hal itu — ada badge "1 halaman / 2 halaman" yang update saat mengetik, dan preview-nya persis hasil cetak.

## Fitur

- Preview A4 live, hasil print = preview (satu stylesheet, satu DOM).
- Tombol **Simpan PDF** (lewat dialog print browser) dan **DOCX** (dibuat di browser, bukan di server).
- Badge jumlah halaman — 1 halaman adalah target, bukan syarat.
- Dua template: **Fresh Graduate** (organisasi & pendidikan menonjol) dan **Berpengalaman** (kerja menonjol, organisasi disembunyikan).
- Foto di-crop otomatis ke rasio 3x4 dan dikompres di browser.
- Draft tersimpan otomatis di browser; ada export/import **JSON** untuk arsip atau pindah perangkat.
- Halaman [panduan](panduan.html) berisi aturan screening: ATS, kata kunci lowongan, foto, dan data yang tidak perlu dicantumkan.

## Privasi

Tidak ada server dan tidak ada backend. Tidak ada analytics, tidak ada cookie pihak ketiga, tidak ada request keluar selain file situs ini sendiri (CSP `default-src 'self'`). Semua isian, termasuk foto, hanya ada di `localStorage` browser kamu. Kalau data browser dihapus, isian ikut hilang — simpan JSON kalau mau aman.

## Jalan di lokal

```bash
git clone https://github.com/akuh8820/cv-maker.git
cd cv-maker
python3 -m http.server 8000
```

Buka `http://localhost:8000`. Jangan buka `index.html` lewat `file://` — CSP memblokir stylesheet dan module.

Tanpa build step: semua file yang ada di repo bisa langsung disajikan apa adanya.

## Peta file

```
index.html        form + preview + toolbar
panduan.html      aturan screening & ATS
css/app.css       UI form, mobile-first
css/cv.css        layout CV A4 (dipakai layar & print)
css/doc.css       halaman panduan
js/schema.js      definisi section/field/template (sumber tunggal)
js/store.js       state + localStorage + import/export JSON
js/form.js        render form dari schema
js/preview.js     render state -> DOM CV + hitung halaman
js/photo.js       crop & kompres foto 3x4
js/docx.js        export DOCX memakai vendor/docx.umd.cjs
js/main.js        wiring toolbar, badge, print
vendor/           docx@9.15.1 dist/index.umd.cjs (dipin apa adanya)
docs/             design doc & implementation plan
```

## Kontribusi

Bug dan usulan: buka issue. Yang paling berguna: laporan kalau hasil PDF berbeda dari preview, atau CV berisi teks yang bikin layout melewati margin. Sertakan jenis browser + perangkat.

## Lisensi

MIT — lihat [LICENSE](LICENSE).
