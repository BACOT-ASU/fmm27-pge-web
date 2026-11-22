import type { ByteSource } from '../binary/byteSource';

/** Satu entri file di daftar isi (TOC). Offset relatif terhadap byte 26 (awal data). */
export interface FmfEntry {
  name: string;
  ext: string;
  /** Offset relatif terhadap awal data (byte 26). */
  offset: number;
  /** Ukuran tersimpan di arsip (terkompresi untuk flag 3). */
  storedSize: number;
  /** Ukuran asli setelah dekompresi. */
  rawSize: number;
  /**
   * Dua u64 waktu, disimpan sebagai bigint apa adanya. Satuannya berbeda antar arsip:
   * pictures_logos memakai detik Unix, sicomps memakai nilai > 2^53 (diduga FILETIME Windows).
   */
  time1: bigint;
  time2: bigint;
}

export interface FmfFolder {
  name: string;
  files: FmfEntry[];
  subs: FmfFolder[];
}

/**
 * Arsip .fmf yang sudah dibuka: hanya header dan TOC yang dibaca.
 * flag 0 = isi tidak dikompresi, TOC = rangkaian [u32 + frame zstd].
 * flag 3 = tiap entri satu frame zstd, TOC = frame zstd langsung setelah magic.
 */
export interface FmfArchive {
  source: ByteSource;
  /** 26 byte header asli. */
  header: Uint8Array;
  flag: number;
  /** Nilai X di header: TOC ada di offset 9 + X. */
  x: number;
  /** Panjang area data (X − 17). */
  dataLength: number;
  root: FmfFolder;
  /** Byte TOC mentah (setelah dekompresi), untuk perbandingan/debug. */
  tocRaw: Uint8Array;
}

/** Bagian keluaran: byte baru, atau rentang dari sumber asli (tidak disalin ke memori). */
export type OutputPart = Uint8Array | { start: number; end: number };

export interface FmfOutput {
  parts: OutputPart[];
  size: number;
}
