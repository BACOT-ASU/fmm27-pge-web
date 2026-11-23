import { checkRange, type ByteSource } from '../../core/binary/byteSource';
import type { FileIO, PickedFile } from '../types';
import { mimeForFileName } from '../mime';
import { totalSize, writeSourcedParts, type OutputPart, type WriteProgress } from '../sourcedWriter';

export type { WriteProgress };

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

interface SaveFilePickerWindow {
  showSaveFilePicker?: (opts: { suggestedName?: string }) => Promise<FileSystemFileHandle>;
}

/**
 * 4a: tulis langsung ke file pilihan pengguna (showSaveFilePicker), progres byte. Tanpa showSaveFilePicker →
 * jatuh ke unduhan Blob biasa ('download'). Penulisan lewat writeSourcedParts (baca sumber per jendela besar).
 */
export async function saveSourcedPartsWithProgress(
  name: string,
  parts: readonly OutputPart[],
  sources: readonly Blob[],
  onProgress: WriteProgress,
): Promise<'file' | 'download'> {
  const picker = (globalThis as unknown as SaveFilePickerWindow).showSaveFilePicker;
  if (!picker) {
    await saveSourcedParts(name, parts, sources);
    return 'download';
  }
  const handle = await picker({ suggestedName: name });
  const w = await handle.createWritable();
  try {
    await writeSourcedParts(parts, sources, { write: (c) => w.write(c as BufferSource) }, onProgress);
    await w.close();
  } catch (e) {
    await w.abort().catch(() => undefined);
    throw e;
  }
  return 'file';
}

/**
 * 4b langkah 1: susun file utuh di penyimpanan internal browser (OPFS), progres byte. Hasilnya satu File biasa,
 * sehingga unduhan Chrome (langkah 2) cukup menyalin satu file — tidak merangkai ratusan ribu potongan.
 */
export async function prepareSourcedPartsInBrowserStorage(
  name: string,
  parts: readonly OutputPart[],
  sources: readonly Blob[],
  onProgress: WriteProgress,
): Promise<File> {
  const storage = navigator.storage as StorageManager | undefined;
  if (!storage?.getDirectory) throw new Error('Browser ini tidak punya penyimpanan internal (OPFS). Pakai 4a.');
  const need = totalSize(parts);
  try {
    const est = await storage.estimate();
    if (est.quota !== undefined && est.usage !== undefined && est.quota - est.usage < need + 64 * 1024 * 1024) {
      throw new Error(`Ruang penyimpanan browser kurang: butuh ${Math.ceil(need / 1e9 * 10) / 10} GB, tersedia ${Math.floor((est.quota - est.usage) / 1e9 * 10) / 10} GB. Kosongkan memori HP lalu coba lagi.`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Ruang penyimpanan')) throw e;
  }
  const dir = await storage.getDirectory();
  await dir.removeEntry(name).catch(() => undefined);
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  try {
    await writeSourcedParts(parts, sources, { write: (c) => w.write(c as BufferSource) }, onProgress);
    await w.close();
  } catch (e) {
    await w.abort().catch(() => undefined);
    await dir.removeEntry(name).catch(() => undefined);
    throw e;
  }
  return fh.getFile();
}

/** 4b langkah 2: serahkan file yang sudah disusun ke pengelola unduhan Chrome (dipanggil dari ketukan tombol). */
export function downloadPreparedFile(file: File): void {
  triggerDownload(file.name, file, 30 * 60_000);
}
