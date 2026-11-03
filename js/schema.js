// Satu-satunya sumber kebenaran untuk section, field, dan template.
// Dipakai form.js (render input) dan preview.js (render CV).

export const SECTIONS = [
  {
    id: "ringkasan",
    label: "Ringkasan Profil",
    type: "longtext",
    skippable: false,
    max: 420,
    tip: "2–3 baris: posisi, tahun pengalaman, satu pencapaian berangka, keahlian utama.",
    ph: "Staf Administrasi dengan 3 tahun pengalaman... Mengelola 500+ dokumen per bulan dan memangkas waktu rekap 30%.",
  },
  {
    id: "dataPribadi",
    label: "Data Pribadi",
    type: "fields",
    skippable: true,
    tip: "Khas CV Indonesia. Lewati kalau melamar perusahaan multinasional atau remote luar negeri.",
    fields: [
      { key: "ttl", label: "Tempat, Tgl. Lahir", ph: "Jakarta, 12 Mei 1999" },
      { key: "jk", label: "Jenis Kelamin", options: ["Laki-laki", "Perempuan"] },
      { key: "agama", label: "Agama", options: ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu"] },
      { key: "status", label: "Status Pernikahan", options: ["Belum Menikah", "Menikah"] },
      { key: "kewarganegaraan", label: "Kewarganegaraan", ph: "Indonesia" },
      { key: "alamat", label: "Alamat", ph: "Jl. Melati No. 45, Kebayoran Baru, Jakarta Selatan" },
    ],
  },
  {
    id: "pendidikan",
    label: "Pendidikan",
    type: "entries",
    skippable: false,
    tip: "Terbaru dulu. Cantumkan IPK kalau 3.00 ke atas.",
    newItem: () => ({ jenjang: "", institusi: "", kota: "", periode: "", catatan: "" }),
    itemFields: [
      { key: "jenjang", label: "Jenjang & Jurusan", ph: "S1 Manajemen", title: true },
      { key: "periode", label: "Periode", ph: "2018 – 2022", right: true },
      { key: "institusi", label: "Institusi", ph: "Universitas Indonesia" },
      { key: "kota", label: "Kota", ph: "Depok" },
      { key: "catatan", label: "IPK / prestasi", ph: "IPK 3.62/4.00 · Cumlaude" },
    ],
  },
  {
    id: "kerja",
    label: "Pengalaman Kerja",
    type: "entries",
    skippable: true,
    tip: "Pakai angka. Maksimal 4 bullet per pekerjaan, tiap bullet maksimal 2 baris.",
    newItem: () => ({ jabatan: "", perusahaan: "", kota: "", jenis: "Full-time", periode: "", bullets: [""] }),
    itemFields: [
      { key: "jabatan", label: "Jabatan", ph: "Staf Administrasi", title: true },
      { key: "periode", label: "Periode", ph: "Januari 2022 – Sekarang", right: true },
      { key: "perusahaan", label: "Perusahaan", ph: "PT Contoh Sejahtera" },
      { key: "kota", label: "Kota", ph: "Jakarta" },
      { key: "jenis", label: "Jenis", options: ["Full-time", "Kontrak", "Magang", "Freelance", "Part-time"] },
      { key: "bullets", label: "Pencapaian", type: "bullets" },
    ],
  },
  {
    id: "organisasi",
    label: "Pengalaman Organisasi",
    type: "entries",
    skippable: true,
    tip: "Penting untuk fresh graduate. Lewati kalau sudah 3 tahun lebih bekerja.",
    newItem: () => ({ peran: "", organisasi: "", kota: "", periode: "", bullets: [""] }),
    itemFields: [
      { key: "peran", label: "Peran", ph: "Staf Divisi Acara", title: true },
      { key: "periode", label: "Periode", ph: "2019 – 2021", right: true },
      { key: "organisasi", label: "Organisasi", ph: "Himpunan Mahasiswa Manajemen" },
      { key: "kota", label: "Kota", ph: "Bandung" },
      { key: "bullets", label: "Kegiatan", type: "bullets" },
    ],
  },
  {
    id: "keterampilan",
    label: "Keterampilan",
    type: "fields",
    skippable: false,
    tip: "Sebut nama persis seperti di iklan lowongan (mis. \"Microsoft Excel\", bukan \"Excel\").",
    fields: [
      { key: "teknis", label: "Teknis", ph: "Excel (pivot, VLOOKUP), SQL, Python" },
      { key: "perangkat", label: "Perangkat lunak", ph: "Microsoft Office, Google Workspace, Canva" },
      { key: "lunak", label: "Lunak", ph: "Manajemen waktu, komunikasi, kerja sama tim" },
    ],
  },
  {
    id: "sertifikasi",
    label: "Sertifikasi & Pelatihan",
    type: "entries",
    skippable: true,
    tip: "Cantumkan masa berlaku kalau ada. Yang sudah kedaluwarsa lebih baik dihapus.",
    newItem: () => ({ nama: "", penerbit: "", tahun: "", berlaku: "" }),
    itemFields: [
      { key: "nama", label: "Nama sertifikat", ph: "Microsoft Office Specialist (Excel Associate)", title: true },
      { key: "tahun", label: "Tahun", ph: "2023", right: true },
      { key: "penerbit", label: "Penerbit", ph: "Certiport" },
      { key: "berlaku", label: "Berlaku sampai", ph: "2026" },
    ],
  },
  {
    id: "bahasa",
    label: "Bahasa",
    type: "entries",
    skippable: true,
    tip: "Sebutkan skor kalau ada (TOEFL ITP, IELTS).",
    newItem: () => ({ nama: "", level: "" }),
    itemFields: [
      { key: "nama", label: "Bahasa", ph: "Inggris" },
      { key: "level", label: "Tingkat / skor", ph: "Profesional (TOEFL ITP 550)" },
    ],
  },
  {
    id: "referensi",
    label: "Referensi",
    type: "referensi",
    skippable: true,
    tip: "Minta izin dulu sebelum mencantumkan nama orang. Paling aman: \"Tersedia atas permintaan\".",
    newItem: () => ({ nama: "", jabatan: "", kontak: "" }),
    itemFields: [
      { key: "nama", label: "Nama", ph: "Ibu Sari Dewi", title: true },
      { key: "jabatan", label: "Jabatan & instansi", ph: "HRD Manager, PT Contoh Sejahtera" },
      { key: "kontak", label: "Email / telepon", ph: "sari.dewi@contoh.co.id" },
    ],
  },
];

export const TEMPLATES = {
  freshgrad: {
    label: "Fresh Graduate",
    order: ["ringkasan", "dataPribadi", "pendidikan", "organisasi", "kerja", "keterampilan", "sertifikasi", "bahasa", "referensi"],
    hide: [],
  },
  experienced: {
    label: "Berpengalaman",
    order: ["ringkasan", "kerja", "pendidikan", "keterampilan", "sertifikasi", "bahasa", "dataPribadi", "organisasi", "referensi"],
    hide: ["organisasi"],
  },
};

export const sectionLabel = (id) => SECTIONS.find((s) => s.id === id)?.label ?? id;

export function blankState() {
  const tpl = TEMPLATES.freshgrad;
  const state = {
    version: 1,
    template: "freshgrad",
    order: [...tpl.order],
    hide: [...tpl.hide],
    header: { nama: "", posisi: "", telp: "", email: "", linkedin: "", kota: "", foto: null },
    ringkasan: "",
    dataPribadi: { ttl: "", jk: "", agama: "", status: "", kewarganegaraan: "Indonesia", alamat: "" },
    pendidikan: [],
    kerja: [],
    organisasi: [],
    keterampilan: { teknis: "", perangkat: "", lunak: "" },
    sertifikasi: [],
    bahasa: [],
    referensi: { mode: "tersedia", items: [] },
  };
  return state;
}
