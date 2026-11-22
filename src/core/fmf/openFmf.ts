import { byteSourceFromBytes, type ByteSource } from '../binary/byteSource';
import { readU64, view } from '../binary/le';
import { decodeLengthPrefixedFrames, zstdDecompress } from '../zstd/zstd';
import { parseToc } from './toc';
import type { FmfArchive, FmfEntry } from './types';

/** Magic 9 byte kontainer .fmf: 02 01 "fmf." 08 00 00. Status: VERIFIED. */
export const FMF_MAGIC = [0x02, 0x01, 0x66, 0x6d, 0x66, 0x2e, 0x08, 0x00, 0x00] as const;
export const FMF_HEADER_SIZE = 26;

export function hasFmfMagic(b: Uint8Array, p = 0): boolean {
  for (let i = 0; i < FMF_MAGIC.length; i++) if (b[p + i] !== FMF_MAGIC[i]) return false;
  return true;
}

/**
 * Buka arsip .fmf: hanya header (26 byte) dan TOC yang dibaca, cocok untuk file 1,8 GB.
 * Header: magic 9 byte, u64 X, u64 17, 1 byte flag. TOC di offset 9 + X, diawali magic lagi.
 */
export async function openFmf(source: ByteSource): Promise<FmfArchive> {
  if (source.size < FMF_HEADER_SIZE) throw new Error('File terlalu kecil untuk arsip .fmf');
  const header = await source.read(0, FMF_HEADER_SIZE);
  if (!hasFmfMagic(header)) throw new Error('Bukan arsip .fmf FMM (magic tidak cocok)');
  const dv = view(header);
  const x = readU64(dv, 9);
  const seventeen = readU64(dv, 17);
  if (seventeen !== 17) throw new Error(`Header .fmf tidak dikenal: nilai kedua ${seventeen}, seharusnya 17`);
  const flag = header[25] ?? -1;
  if (flag !== 0 && flag !== 3) throw new Error(`Flag arsip ${flag} belum dikenal (yang dikenal: 0 dan 3)`);
  const tocStart = 9 + x;
  if (tocStart + 9 > source.size) throw new Error('Posisi daftar isi di luar file');
  const tail = await source.read(tocStart, source.size);
  if (!hasFmfMagic(tail)) throw new Error('Daftar isi tidak ditemukan (magic kedua tidak cocok)');
  const body = tail.subarray(9);
  const tocRaw = flag === 0 ? decodeLengthPrefixedFrames(body) : zstdDecompress(body);
  return { source, header, flag, x, dataLength: x - 17, root: parseToc(tocRaw), tocRaw };
}

/** Buka arsip dari byte di memori (arsip bersarang, tes). */
export function openFmfBytes(bytes: Uint8Array): Promise<FmfArchive> {
  return openFmf(byteSourceFromBytes(bytes));
}

/** Byte tersimpan sebuah entri, apa adanya. */
export function readStoredEntry(arc: FmfArchive, e: FmfEntry): Promise<Uint8Array> {
  const start = FMF_HEADER_SIZE + e.offset;
  return arc.source.read(start, start + e.storedSize);
}

/** Isi asli entri (didekompresi untuk flag 3). */
export async function readEntry(arc: FmfArchive, e: FmfEntry): Promise<Uint8Array> {
  const stored = await readStoredEntry(arc, e);
  if (arc.flag === 0) {
    if (e.storedSize !== e.rawSize) throw new Error(`Entri ${e.name}${e.ext}: ukuran tidak sama pada arsip flag 0`);
    return stored;
  }
  return zstdDecompress(stored, e.rawSize);
}
