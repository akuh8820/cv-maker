export function slug(s) {
  return String(s ?? "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

export function filename(state, ext) {
  const nama = slug(state.header?.nama) || "Nama";
  const posisi = slug(state.header?.posisi);
  return `CV-${nama}${posisi ? `-${posisi}` : ""}.${ext}`;
}

// Judul dokumen menentukan nama default saat "Save as PDF".
export function setPrintTitle(title) {
  const prev = document.title;
  document.title = title;
  return () => {
    document.title = prev;
  };
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function debounce(fn, ms = 300) {
  let t;
  const wrapped = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  wrapped.flush = (...args) => {
    clearTimeout(t);
    fn(...args);
  };
  return wrapped;
}
