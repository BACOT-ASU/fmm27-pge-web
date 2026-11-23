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

export type WriteProgress = (written: number, total: number) => void;

interface SaveFilePickerWindow {
  showSaveFilePicker?: (opts: { suggestedName?: string }) => Promise<FileSystemFileHandle>;
}

/**
 * Tulis keluaran multi-sumber dengan progres byte. Kalau browser punya showSaveFilePicker (File System Access),
 * data ditulis bertahap (potongan 8 MB) ke file pilihan pengguna dan progres dilaporkan. Kalau tidak ada,
 * jatuh ke unduhan Blob biasa (progres hanya terlihat di pengelola unduhan browser) → mengembalikan 'download'.
 */
export async function saveSourcedPartsWithProgress(
  name: string,
  parts: readonly (Uint8Array | { source: number; start: number; end: number })[],
  sources: readonly Blob[],
  onProgress: WriteProgress,
): Promise<'file' | 'download'> {
  const picker = (globalThis as unknown as SaveFilePickerWindow).showSaveFilePicker;
  const total = parts.reduce((n, p) => n + (p instanceof Uint8Array ? p.length : p.end - p.start), 0);
  if (!picker) {
    await saveSourcedParts(name, parts, sources);
    return 'download';
  }
  const handle = await picker({ suggestedName: name });
  const w = await handle.createWritable();
  let written = 0;
  const CHUNK = 8 * 1024 * 1024;
  let pending: BlobPart[] = [];
  let pendingSize = 0;
  const flush = async () => {
    if (!pendingSize) return;
    await w.write(new Blob(pending));
    written += pendingSize;
    pending = [];
    pendingSize = 0;
    onProgress(written, total);
  };
  try {
    for (const p of parts) {
      if (p instanceof Uint8Array) {
        pending.push(p as BlobPart);
        pendingSize += p.length;
      } else {
        const src = sources[p.source];
        if (!src) throw new Error(`Sumber ${p.source} tidak ada`);
        for (let s = p.start; s < p.end; s += CHUNK) {
          const e = Math.min(p.end, s + CHUNK);
          pending.push(src.slice(s, e));
          pendingSize += e - s;
          if (pendingSize >= CHUNK) await flush();
        }
      }
      if (pendingSize >= CHUNK) await flush();
    }
    await flush();
    await w.close();
  } catch (e) {
    await w.abort().catch(() => undefined);
    throw e;
  }
  return 'file';
}
