/** Ukuran file yang mudah dibaca, format Indonesia (koma desimal). */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) throw new RangeError(`Ukuran tidak sah: ${n}`);
  const units = ['byte', 'KB', 'MB', 'GB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const text = i === 0 ? String(v) : v.toFixed(v >= 100 ? 0 : 1).replace('.', ',');
  return `${text} ${units[i]}`;
}

/** Angka dengan pemisah ribuan titik, mis. 149.841.844. */
export function formatInt(n: number): string {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
