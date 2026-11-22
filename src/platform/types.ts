import type { ByteSource } from '../core/binary/byteSource';

/** File yang dipilih pengguna. Isinya dibaca bertahap lewat ByteSource. */
export interface PickedFile {
  name: string;
  size: number;
  source: ByteSource;
  /** Objek file asli platform (web: File), untuk Worker. */
  blob?: Blob;
  /** Ada di platform yang bisa menyimpan ulang ke lokasi asal (desktop). */
  handle?: unknown;
}

export interface FileIO {
  capabilities: { saveInPlace: boolean; folderAccess: boolean };
  pickFile(opts?: { accept?: string[] }): Promise<PickedFile | null>;
  /** Simpan file baru. parts boleh banyak supaya file besar tidak dirakit di memori. */
  saveFile(name: string, parts: Uint8Array[]): Promise<void>;
  saveInPlace?(file: PickedFile, parts: Uint8Array[]): Promise<void>;
}

/** Penyimpanan working copy, undo, backup. Implementasi web menyusul (IndexedDB/OPFS). */
export interface Store {
  get(key: string): Promise<Uint8Array | undefined>;
  put(key: string, data: Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}
