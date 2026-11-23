import { checkRange, type ByteSource } from '../../core/binary/byteSource';
import type { FileIO, PickedFile } from '../types';
import { mimeForFileName } from '../mime';

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

/**
 * Seperti saveOutputParts, tapi rentang boleh dari beberapa file sumber (mis. gabung wajah:
 * sumber 0 = pictures_logos kita, sumber 1 = pictures_logos modder). Tidak ada yang dimuat utuh ke memori.
 */
export async function saveSourcedParts(
  name: string,
  parts: readonly (Uint8Array | { source: number; start: number; end: number })[],
  sources: readonly Blob[],
): Promise<void> {
  const blobParts: BlobPart[] = parts.map((p) => {
    if (p instanceof Uint8Array) return p as BlobPart;
    const src = sources[p.source];
    if (!src) throw new Error(`Sumber ${p.source} tidak ada`);
    return src.slice(p.start, p.end);
  });
  triggerDownload(name, new Blob(blobParts, { type: mimeForFileName(name) }), 300_000);
}
