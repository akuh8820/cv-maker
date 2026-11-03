// Export DOCX memakai build UMD docx@9.15.1 (window.docx), tanpa bundler.
// Geometri mengikuti css/cv.css: A4, margin 1.6cm, konten 178mm, tab label 44mm.

import { SECTIONS } from "./schema.js";
import { filename } from "./util.js";

const GRAY = "666666";
const clean = (v) => String(v ?? "").trim();
const EMPTY = (v) => clean(v) === "";
const join = (parts, sep) => parts.map(clean).filter(Boolean).join(sep);
const fieldsOf = (id) => SECTIONS.find((s) => s.id === id)?.fields ?? [];
const labelOf = (id) => SECTIONS.find((s) => s.id === id)?.label ?? id;

function imageBytes(dataUrl) {
  const bin = atob(String(dataUrl).split(",")[1] || "");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export async function buildDocx(state) {
  const d = window.docx;
  if (!d) throw new Error("Pustaka DOCX belum termuat.");
  const twip = d.convertMillimetersToTwip;
  const CONTENT = twip(178);
  const LABEL_TAB = twip(44);
  const s = state || {};

  // --- blok dasar -------------------------------------------------------
  const heading = (text) =>
    new d.Paragraph({
      spacing: { before: 200, after: 60 },
      border: { bottom: { style: d.BorderStyle.SINGLE, size: 6, color: "888888", space: 1 } },
      children: [new d.TextRun({ text: String(text).toUpperCase(), bold: true })],
    });

  const entry = (title, period, meta) => [
    new d.Paragraph({
      spacing: { before: 100, after: 0 },
      tabStops: [{ type: d.TabStopType.RIGHT, position: CONTENT }],
      children: [new d.TextRun({ text: title, bold: true }), new d.TextRun({ text: period ? `\t${period}` : "" })],
    }),
    ...(meta
      ? [new d.Paragraph({ spacing: { after: 20 }, children: [new d.TextRun({ text: meta, italics: true, color: GRAY, size: 20 })] })]
      : []),
  ];

  const bullet = (text) => new d.Paragraph({ text, bullet: { level: 0 }, spacing: { after: 20 } });

  const row = (label, value) =>
    new d.Paragraph({
      spacing: { after: 20 },
      tabStops: [{ type: d.TabStopType.LEFT, position: LABEL_TAB }],
      children: [new d.TextRun({ text: `${label}:`, bold: true }), new d.TextRun({ text: `\t${value}` })],
    });

  // Entri berulang dibuang kalau semua field-nya kosong.
  const entries = (arr) => (Array.isArray(arr) ? arr : []).filter((e) => e && Object.values(e).some((v) => (Array.isArray(v) ? v.some((x) => !EMPTY(x)) : !EMPTY(v))));

  const bulletsOf = (e) => (Array.isArray(e.bullets) ? e.bullets : []).map(clean).filter(Boolean);

  const work = (arr, titleKey, orgKey) =>
    entries(arr).flatMap((e) => {
      const blocks = entry(join([e[titleKey], e[orgKey]], " — ") || clean(e.kota), clean(e.periode), join([e.kota, e.jenis], " · "));
      return [...blocks, ...bulletsOf(e).map(bullet)];
    });

  // --- isi per section --------------------------------------------------
  const body = {
    ringkasan: () => (EMPTY(s.ringkasan) ? [] : [new d.Paragraph({ alignment: d.AlignmentType.JUSTIFIED, text: clean(s.ringkasan) })]),

    dataPribadi: () => {
      const vals = fieldsOf("dataPribadi").filter((f) => !EMPTY(s.dataPribadi?.[f.key]));
      // Sama seperti preview: "Indonesia" bawaan saja bukan isi.
      if (vals.every((f) => f.key === "kewarganegaraan" && clean(s.dataPribadi[f.key]) === "Indonesia")) return [];
      return vals.map((f) => row(f.label, clean(s.dataPribadi[f.key])));
    },

    pendidikan: () =>
      entries(s.pendidikan).flatMap((e) => {
        const institusi = clean(e.institusi);
        return entry(
          clean(e.jenjang) || institusi || clean(e.kota),
          clean(e.periode),
          join([clean(e.jenjang) ? join([institusi, e.kota], ", ") : "", e.catatan], " — "),
        );
      }),

    kerja: () => work(s.kerja, "jabatan", "perusahaan"),
    organisasi: () => work(s.organisasi, "peran", "organisasi"),

    keterampilan: () =>
      fieldsOf("keterampilan")
        .filter((f) => !EMPTY(s.keterampilan?.[f.key]))
        .map((f) => row(f.label, clean(s.keterampilan[f.key]))),

    sertifikasi: () =>
      entries(s.sertifikasi).flatMap((e) => {
        const title = join([e.nama, e.penerbit], " — ");
        return entry(title || clean(e.tahun), join([title ? e.tahun : "", e.berlaku], " – "));
      }),

    bahasa: () =>
      entries(s.bahasa)
        .map((e) => join([e.nama, e.level], " — "))
        .filter(Boolean)
        .map((text) => new d.Paragraph({ text })),

    referensi: () => {
      if (s.referensi?.mode === "tersedia") return [new d.Paragraph({ text: "Tersedia atas permintaan." })];
      return entries(s.referensi?.items).map(
        (e) => new d.Paragraph({ text: join([join([e.nama, e.jabatan], " — "), e.kontak ? `(${clean(e.kontak)})` : ""], " ") }),
      );
    },
  };

  // --- header -----------------------------------------------------------
  const h = s.header || {};
  const nama = new d.Paragraph({
    spacing: { after: 0 },
    children: [new d.TextRun({ text: clean(h.nama).toUpperCase(), bold: true, size: 44 })],
  });
  const posisi = new d.Paragraph({
    spacing: { after: 20 },
    children: [new d.TextRun({ text: clean(h.posisi), bold: true, size: 22 })],
  });
  const kontak = new d.Paragraph({
    spacing: { after: 120 },
    children: [new d.TextRun({ text: join([h.telp, h.email, h.linkedin, h.kota], " · "), size: 20, color: GRAY })],
  });

  let header = [nama, posisi, kontak];
  if (/^data:image\/(jpeg|jpg|png);base64,/i.test(String(h.foto || ""))) {
    const ZERO = { top: 0, bottom: 0, left: 0, right: 0 };
    const NONE = { style: d.BorderStyle.NONE, size: 0, color: "auto" };
    const cell = (widthMm, children, align) =>
      new d.TableCell({
        width: { size: twip(widthMm), type: d.WidthType.DXA },
        margins: ZERO,
        verticalAlign: d.VerticalAlign.TOP,
        children: align ? [new d.Paragraph({ alignment: align, children })] : children,
      });
    header = [
      new d.Table({
        width: { size: CONTENT, type: d.WidthType.DXA },
        layout: d.TableLayoutType.FIXED,
        borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE },
        rows: [
          new d.TableRow({
            children: [
              cell(150, [nama, posisi, kontak]),
              cell(28, [new d.ImageRun({ data: imageBytes(h.foto), transformation: { width: 106, height: 144 }, type: "jpg" })], d.AlignmentType.RIGHT),
            ],
          }),
        ],
      }),
    ];
  }

  // --- urutan & rakit ---------------------------------------------------
  const hidden = new Set(Array.isArray(s.hide) ? s.hide : []);
  const order = Array.isArray(s.order) && s.order.length ? s.order : SECTIONS.map((x) => x.id);
  const children = [...header];
  for (const id of order) {
    if (hidden.has(id) || !body[id]) continue;
    const blocks = body[id]();
    if (!blocks.length) continue;
    children.push(heading(labelOf(id)), ...blocks);
  }

  const doc = new d.Document({
    creator: "Bikin CV",
    title: `CV — ${clean(h.nama) || "Tanpa Nama"}`,
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 21, language: { value: "id-ID" } },
          paragraph: { spacing: { after: 40, line: 252 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: twip(16), bottom: twip(16), left: twip(16), right: twip(16) },
          },
        },
        children,
      },
    ],
  });

  return d.Packer.toBlob(doc);
}

export function docxFilename(state) {
  return filename(state, "docx");
}
