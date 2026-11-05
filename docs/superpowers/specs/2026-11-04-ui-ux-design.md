# Bikin CV — UI/UX v1.1: rapikan + navigasi

Tanggal: 2026-11-04
Status: menunggu persetujuan
Arah: opsi B (dipilih user dari 3 mockup: `/tmp/cvui/mock/{a,b,c}.html`)

## Kenapa

Form punya 10 blok isian (identitas + 9 section, ±30 field) tanpa penanda posisi.
Di HP tinggi formulir 3.394px, toolbar 184px (3 baris) memakan 22% layar, dan
preview kosong tampil sebagai halaman putih kosong. User tidak tahu sudah sampai
mana, apa yang kurang, dan tidak bisa lompat. Ekspor PDF/DOCX sendiri sudah benar
(terverifikasi 1 halaman A4) — jadi yang diperbaiki adalah shell aplikasi, bukan
mesin CV-nya.

## Tujuan

1. HP: toolbar satu baris ≤60px, "Simpan PDF" selalu terlihat ≥44px, badge
   "1 halaman" dan progress tetap terbaca.
2. Orientasi: rail bernomor di desktop, chip section + bottom sheet di HP;
   klik = lompat ke section.
3. Section bisa dilipat; status per section (selesai / sebagian / belum / dilewati).
4. Aksi destruktif bisa dibatalkan (undo hapus entri), error tidak lagi `alert()`.
5. Tahu kapan draft tersimpan, dan apa yang salah kalau gagal.

## Bukan tujuan

- Tidak menyentuh `css/cv.css`, geometri A4, aturan print, `js/docx.js`,
  `js/photo.js`, `js/preview.js` (kecuali tidak ada perubahan perilaku).
- Tidak mengubah format draft JSON v1 atau `localStorage` key.
- Tidak mengganti identitas visual (itu opsi C), tidak menambah server/akun/analitik.
- Tidak menambah fitur produk baru (multi-draft, AI, dsb).

## Batasan

- Tanpa build step, ES modules, CSP `default-src 'self'` — tidak boleh inline
  `<script>`; inline `style` masih boleh.
- Print harus tetap 1 halaman A4 berisi teks asli; rail, progress, toast, dan
  overlay pratinjau wajib hilang saat print.
- Target sentuh ≥44px, kontras teks ≥4.5:1, navigasi keyboard penuh.
- Draft tetap satu kunci `bikincv.draft.v1`; state tidak ditambah field baru.

## Pendekatan yang dipertimbangkan

| Opsi | Isi | Kenapa tidak dipilih |
|---|---|---|
| A | perbaikan visual saja, tanpa navigasi | masalah utama (panjang & tanpa posisi) tetap |
| **B** | perbaikan A + rail/accordion/progress | **dipilih**: menyelesaikan orientasi tanpa menyentuh area print |
| C | identitas editorial baru, preview hero | permukaan baru paling luas, risiko ke layout A4 paling besar |

## Keputusan desain

### 1. Jumlah langkah: 10, bukan 9

Form asli punya kartu identitas (nama/posisi/kontak/foto) di luar `SECTIONS`.
Mockup menampilkannya sebagai bagian dari "Data Pribadi", tapi di kode keduanya
terpisah. Supaya rail jujur, identitas jadi langkah **01 "Identitas"**, lalu 9
section jadi 02–10. Judul kartu di form berubah "Data Diri" → "Identitas";
judul section di lembar CV **tidak berubah** (tetap "Data Pribadi") supaya output
ATS sama.

### 2. Status section (baru: `js/progress.js`)

`statusOf(state, id)` → `selesai | sebagian | kosong | dilewati`.

- `dilewati`: `state.hide` memuat id (hanya section `skippable`).
- `selesai` / `sebagian` menurut aturan per section:
  - `identitas`: selesai bila `nama` + salah satu dari `telp|email|linkedin`;
    sebagian bila ada isian selain nama.
  - `ringkasan`: selesai bila ≥120 karakter; sebagian bila >0.
  - `dataPribadi`: selesai bila ≥3 field terisi (default "Indonesia" tidak
    dihitung); sebagian bila ada.
  - `pendidikan` / `kerja` / `organisasi`: selesai bila ≥1 entri punya dua field
    inti (jenjang+institusi / jabatan+perusahaan / peran+organisasi); sebagian
    bila ada entri terisi sebagian.
  - `keterampilan`: selesai bila ≥2 dari 3 field; sebagian bila ada.
  - `sertifikasi` / `bahasa`: selesai bila ≥1 entri punya nama; sebagian bila ada.
  - `referensi`: selesai bila mode "tersedia" atau ≥1 nama; sebagian bila ada.
- Progress = `(selesai + dilewati) / 10`, ditampilkan `5/10 bagian`. Dilewati
  dihitung beres karena user sudah mengambil keputusan, tapi pill-nya tetap "–".

### 3. Accordion

- Section dirender `<details class="section" open?>` + `<summary class="section-head">`
  berisi nomor, label, pill status, jumlah entri, chevron. Native `<details>`
  dipilih agar keyboard/ARIA gratis dan tidak perlu JS trap.
- Default: **hanya section aktif yang terbuka**. Aktif = section pertama yang
  belum selesai; kalau semua selesai, section terakhir. Klik rail/chip = section
  itu jadi aktif + dibuka + di-scroll.
- Pilihan manual user disimpan di `sessionStorage` (bukan draft), dan tombol
  "Buka semua" di kepala rail untuk yang lebih suka scroll.
- `renderForm()` tetap `replaceChildren` (dipanggil hanya saat ganti template /
  import), jadi state buka/tutup disimpan di modul `form.js` lalu diterapkan
  ulang saat render.

### 4. Layout

- `≥1200px`: `grid-template-columns: 176px minmax(360px, 480px) minmax(0, 1fr)`;
  rail sticky, form scroll sendiri, preview sticky. Di 1366 preview dapat ±710px
  → skala ±0.89, dan `fitPreview()` tetap dipakai apa adanya.
- `900–1199px`: rail menyempit jadi 56px (angka + titik status, label di
  `aria-label`/tooltip), form `1fr`, preview `minmax(0,1fr)`.
- `<900px`: satu panel + tabbar yang sudah ada. Di bawah toolbar ada baris
  progress: `5/10 · 1 halaman · Tersimpan 12.04` + chip section aktif yang membuka
  `<dialog>` daftar 10 langkah.
- Tinggi sticky: toolbar 56px; baris progress 36px di HP. Semua target lompat
  memakai `scroll-margin-top` = toolbar + progress + 12px.

### 5. Toolbar & menu

- Desktop: judul, badge halaman, select template, `DOCX`, `Simpan PDF` (primer),
  menu `⋮` (Simpan JSON, Muat JSON, Panduan, Laporkan bug).
- HP: judul ringkas, select template, `⋮`, `Simpan PDF` (berlabel, 44px). Badge
  halaman pindah ke baris progress.
- Menu = `<details>` + CSS, item 44px, tutup saat klik di luar/ESC. Tanpa JS
  framework.

### 6. Umpan balik

- **Undo hapus**: tombol Hapus menyimpan `{sectionId, index, item}` di memori,
  toast "Entri dihapus · Urungkan" (8 detik). Urungkan mengembalikan entri pada
  indeks semula + toast "Dikembalikan". Satu pending pada satu waktu.
- **Status simpan**: setelah `store.save` sukses → "Tersimpan HH.MM"; gagal →
  "Gagal menyimpan" (merah) yang bisa diklik untuk menampilkan pesan penyebab
  (mis. kuota penuh) inline. Tidak ada `alert()`.
- **Error DOCX / import JSON**: toast error, bukan `alert()`.
- **Pratinjau kosong**: overlay di atas lembar (bukan di dalam `.cv-sheet`):
  "Pratinjau muncul setelah nama dan satu pengalaman terisi." Hilang otomatis
  saat ada isi, dan `display:none` saat print.

## Berkas yang berubah

| Berkas | Perubahan |
|---|---|
| `index.html` | kerangka rail, baris progress, `<dialog>` daftar section, kontainer toast, meta bar A4, overlay pratinjau kosong |
| `css/app.css` | layout 3 kolom + rail, `<details>/<summary>`, pill status, progress, dialog, toast, empty state; **hapus blok `#form-panel`/`#preview-panel` di luar media query (baris 212–226) yang bocor ke mobile** |
| `js/progress.js` | baru: `statusOf`, `progressOf`, label langkah |
| `js/form.js` | section jadi `<details>`, pill status, state buka/tutup, "Buka semua", undo hapus, nomor langkah |
| `js/main.js` | wire rail/chip/dialog, paint progress + status simpan, overlay pratinjau kosong, meta bar skala, toast |
| `js/schema.js` | tidak berubah (kecuali label form "Identitas" bila disimpan di sini) |
| `js/preview.js`, `js/docx.js`, `css/cv.css` | **tidak berubah** |

## Risiko & mitigasi

- **Print rusak** → `@media print` yang ada dipertahankan; elemen baru diberi
  `display:none` di print; verifikasi cetak ulang ke PDF 1 halaman.
- **Preview terpotong** karena kolom lebih sempit → `fitPreview()` sudah
  menghitung ulang lewat `ResizeObserver`; uji di 1024/1200/1366.
- **State buka/tutup hilang** saat ganti template/import → disimpan di modul,
  diterapkan ulang di `renderForm`.
- **Status salah hitung** → aturan di atas adalah satu-satunya sumber; uji dengan
  state kosong, separuh, penuh, dan section dilewati.
- **Kompleksitas baru** → `progress.js` murni fungsi, tanpa DOM; `form.js` tetap
  satu renderer.

## Verifikasi

- 390×844: toolbar ≤60px, `scrollWidth = 390`, tombol PDF 44px terlihat, dialog
  buka/tutup (ESC + backdrop), progress sesuai aturan.
- 1024 dan 1366: rail tampil, lembar A4 utuh di dalam kolomnya (tidak terpotong),
  skala ≥0.85 di 1366.
- Print dari state terisi: 1 halaman A4, teks asli, tanpa rail/progress/toast/
  overlay.
- Hapus → Urungkan mengembalikan entri di indeks yang sama.
- Import JSON v1 → status & progress benar; export tetap format sama.
- Keyboard: Tab ke summary + Enter, fokus masuk dialog, `aria-current` di rail.
- 0 error console, 0 request eksternal, 0 response 4xx.

## Keputusan hasil builder check

Tujuh pertanyaan muncul saat spec dibaca ulang. Semua diputuskan di sini supaya
tidak jadi tebakan saat implementasi.

1. **Cakupan undo.** Yang bisa diurungkan: hapus entri, hapus baris bullet, dan
   hapus foto (semua aksi destruktif). Undo mengganti toast yang masih pending —
   hanya satu pending. Undo **dibatalkan** (bukan dipulihkan ke indeks lama) bila
   user: ganti template, import JSON, atau menghapus entri lain. Alasannya:
   memulihkan ke indeks di state yang sudah berubah berisiko menaruh data di slot
   yang salah. Toast pending selalu menyebut objek yang dihapus.
2. **Section aktif.** Status pill dan progress dihitung live setiap perubahan
   (debounce render yang sudah ada). Tapi accordion **tidak** auto-tutup/auto-buka
   saat mengetik — itu akan menutup section di bawah kursor. "Aktif" =
   section terakhir yang dipilih user (rail/chip/klik summary); saat load =
   section pertama yang belum selesai. `aria-current` ikut pilihan manual itu.
3. **DOCX di HP.** Tetap tersedia lewat menu `⋮` (tidak ada regresi fitur).
   Toolbar HP: template, `⋮`, Simpan PDF.
4. **Kapan overlay pratinjau kosong tampil.** Tampil hanya bila `.cv-sheet` tidak
   berisi elemen apa pun (`childElementCount === 0`) — bukan berdasarkan
   "nama + pengalaman". Jadi begitu ada nama/kontak, overlay hilang karena
   header CV sudah terender. Copy disesuaikan: "Pratinjau muncul setelah nama
   atau kontak terisi." `display:none` saat print.
5. **Kartu Identitas ikut accordion.** `headerBlock()` dibungkus `<details>` yang
   sama, nomor 01, default terbuka (selalu langkah pertama yang belum selesai).
   Upload foto tetap berfungsi; tidak ada duplikasi markup.
6. **Footer tetap ada.** `.site-foot` dipertahankan (link Panduan + Laporkan bug +
   baris privasi), dan menu `⋮` memuat tautan yang sama. `#link-bug` tetap di
   footer sehingga `js/report.js` tidak berubah. `app.css` tinggi layout desktop
   memakai tinggi footer yang sebenarnya, bukan angka 46px yang di-hardcode.
7. **Progress di 900–1199px.** Rail 56px tidak cukup; progress (`5/10 bagian` +
   bar tipis) ditaruh di kepala kolom form, hanya terlihat pada rentang itu.
   ≥1200 di kepala rail, <900 di baris progress HP.

## Diserahkan ke pembangun

- Angka spacing/padding, warna pill, set ikon inline SVG, dan copy mikro
  (status, toast, empty state).
- Breakpoint tepat 1200px dan bentuk rail 56px.
- Apakah "Buka semua" perlu juga di HP (sheet sudah memuat semua langkah).
