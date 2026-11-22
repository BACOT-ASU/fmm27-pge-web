import { decompress as fzstdDecompress } from 'fzstd';
import { concatBytes } from '../binary/le';

/** Magic frame zstd: 28 B5 2F FD. */
export const ZSTD_MAGIC = [0x28, 0xb5, 0x2f, 0xfd] as const;

/** Ukuran blok maksimum zstd (Block_Maximum_Size = 128 KiB). */
export const ZSTD_MAX_BLOCK = 131072;

export function isZstdFrame(b: Uint8Array, p = 0): boolean {
  return b[p] === 0x28 && b[p + 1] === 0xb5 && b[p + 2] === 0x2f && b[p + 3] === 0xfd;
}

/** Dekompresi zstd (satu frame atau beberapa frame berurutan). */
export function zstdDecompress(data: Uint8Array, expectedSize?: number): Uint8Array {
  const out = expectedSize !== undefined ? fzstdDecompress(data, new Uint8Array(expectedSize)) : fzstdDecompress(data);
  if (expectedSize !== undefined && out.length !== expectedSize) {
    throw new Error(`Hasil dekompresi ${out.length} byte, seharusnya ${expectedSize}`);
  }
  return out;
}

/**
 * Frame zstd sah tanpa kompresi: header single-segment + content size 4 byte,
 * lalu blok "raw" (maks 128 KiB per blok). Tanpa checksum.
 * Status: VERIFIED diterima game untuk TOC pictures_logos.fmf (B6, B7b).
 */
export function zstdRawFrame(data: Uint8Array): Uint8Array {
  if (data.length > 0xffff_ffff) throw new RangeError('Data terlalu besar untuk satu frame');
  const nBlocks = Math.max(1, Math.ceil(data.length / ZSTD_MAX_BLOCK));
  const out = new Uint8Array(4 + 1 + 4 + nBlocks * 3 + data.length);
  out.set(ZSTD_MAGIC, 0);
  out[4] = 0xa0; // FCS_Field_Size=4 byte (flag 2), Single_Segment=1, tanpa checksum, tanpa dict
  new DataView(out.buffer).setUint32(5, data.length, true);
  let p = 9;
  for (let i = 0; i < nBlocks; i++) {
    const start = i * ZSTD_MAX_BLOCK;
    const size = Math.min(ZSTD_MAX_BLOCK, data.length - start);
    const last = i === nBlocks - 1 ? 1 : 0;
    const h = last | (0 << 1) | (size << 3); // Block_Type 0 = raw
    out[p] = h & 0xff;
    out[p + 1] = (h >>> 8) & 0xff;
    out[p + 2] = (h >>> 16) & 0xff;
    out.set(data.subarray(start, start + size), p + 3);
    p += 3 + size;
  }
  return out;
}

/**
 * Rangkaian [u32 panjang + frame] dengan potongan mentah 131.072 byte per frame.
 * Dipakai untuk TOC arsip flag 0 (pola fmmcore.js / B6, VERIFIED untuk logo).
 */
export function encodeLengthPrefixedRawFrames(raw: Uint8Array, chunk = ZSTD_MAX_BLOCK): Uint8Array {
  const parts: Uint8Array[] = [];
  const n = Math.max(1, Math.ceil(raw.length / chunk));
  for (let i = 0; i < n; i++) {
    const fr = zstdRawFrame(raw.subarray(i * chunk, Math.min(raw.length, (i + 1) * chunk)));
    const hdr = new Uint8Array(4);
    new DataView(hdr.buffer).setUint32(0, fr.length, true);
    parts.push(hdr, fr);
  }
  return concatBytes(parts);
}

/** Kebalikan dari encodeLengthPrefixedRawFrames: baca [u32 + frame] sampai habis. */
export function decodeLengthPrefixedFrames(t: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [];
  const dv = new DataView(t.buffer, t.byteOffset, t.byteLength);
  let p = 0;
  while (p + 4 <= t.length) {
    const len = dv.getUint32(p, true);
    p += 4;
    if (len === 0 || p + len > t.length) throw new Error(`Rangkaian frame rusak di posisi ${p - 4}`);
    parts.push(zstdDecompress(t.subarray(p, p + len)));
    p += len;
  }
  if (p !== t.length) throw new Error('Sisa byte setelah rangkaian frame');
  return concatBytes(parts);
}
