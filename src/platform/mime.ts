/**
 * Tipe MIME untuk unduhan. Blob tanpa tipe membuat Chrome Android menganggapnya teks dan
 * menambah ".txt" ke nama file (laporan Bacad 23 Nov: people.dat → people.dat.txt).
 * File biner (.dat, .fmf, dll.) memakai application/octet-stream agar nama tidak diubah.
 */
export function mimeForFileName(name: string): string {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  if (ext === 'txt') return 'text/plain;charset=utf-8';
  if (ext === 'zip') return 'application/zip';
  if (ext === 'xml') return 'application/xml';
  if (ext === 'png') return 'image/png';
  return 'application/octet-stream';
}
