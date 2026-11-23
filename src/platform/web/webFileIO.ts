import { checkRange, type ByteSource } from '../../core/binary/byteSource';
import type { FileIO, PickedFile } from '../types';

/** ByteSource dari Blob/File browser: hanya potongan yang diminta yang dibaca. */
export function byteSourceFromBlob(blob: Blob): ByteSource {
  return {
    size: blob.size,
    async read(start, end) {
      checkRange(start, end, blob.size);
      return new Uint8Array(await blob.slice(start, end).arrayBuffer());
    },
  };
}

export function pickedFileFromFile(file: File): PickedFile {
  return { name: file.name, size: file.size, source: byteSourceFromBlob(file), blob: file };
}

/** Implementasi web: <input type="file"> untuk impor, Blob + unduhan untuk ekspor. */
export const webFileIO: FileIO = {
  capabilities: { saveInPlace: false, folderAccess: false },

  pickFile(opts) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      if (opts?.accept?.length) input.accept = opts.accept.join(',');
      input.onchange = () => {
        const file = input.files?.[0];
        resolve(file ? pickedFileFromFile(file) : null);
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  },

  async saveFile(name, parts) {
    triggerDownload(name, new Blob(parts as BlobPart[], { type: mimeForFileName(name) }), 60_000);
  },
};

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

function triggerDownload(name: string, blob: Blob, revokeAfterMs: number): void {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), revokeAfterMs);
  }
}

/**
 * Simpan keluaran yang sebagian besar merujuk ke file sumber (rentang) tanpa menyalinnya ke memori:
 * Blob dari potongan Blob.slice. Cocok untuk arsip ratusan MB sampai GB.
 */
export async function saveOutputParts(
  name: string,
  parts: readonly (Uint8Array | { start: number; end: number })[],
  source: Blob,
): Promise<void> {
  const blobParts: BlobPart[] = parts.map((p) => (p instanceof Uint8Array ? (p as BlobPart) : source.slice(p.start, p.end)));
  triggerDownload(name, new Blob(blobParts, { type: mimeForFileName(name) }), 120_000);
}
