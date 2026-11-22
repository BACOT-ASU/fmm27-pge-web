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
    const url = URL.createObjectURL(new Blob(parts as BlobPart[]));
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  },
};
