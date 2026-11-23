/**
 * Nama negara dari nation.dat. Status: LIKELY — record panjangnya bervariasi dan belum
 * dibongkar penuh; pembacaan memakai pencarian berurutan seperti legacy/app/fmmcore.js
 * (parseNations): u32 UID, u16 index, u32 panjang + nama, lalu byte 0xFF.
 * Hanya untuk tampilan; jangan dipakai untuk menulis.
 */
export interface NationName {
  index: number;
  uid: number;
  name: string;
  /** Offset awal record (u32 UID) di nation.dat. */
  offset: number;
}

const td = new TextDecoder('utf-8', { fatal: false });

export function parseNationNames(b: Uint8Array): NationName[] {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b.length < 10) return [];
  const n = dv.getUint16(8, true);
  const out: NationName[] = [];
  let p = 10;
  for (let i = 0; i < n; i++) {
    let found = -1;
    for (let q = p; q < b.length - 12; q++) {
      if (dv.getUint16(q + 4, true) !== i) continue;
      const l = dv.getUint32(q + 6, true);
      if (l < 2 || l > 60 || q + 10 + l >= b.length) continue;
      if (b[q + 10 + l] !== 0xff) continue;
      let ok = true;
      for (let z = 0; z < l; z++) {
        if (b[q + 10 + z]! < 0x20) {
          ok = false;
          break;
        }
      }
      if (ok) {
        found = q;
        break;
      }
    }
    if (found < 0) break;
    const l = dv.getUint32(found + 6, true);
    out.push({ index: i, uid: dv.getUint32(found, true), name: td.decode(b.subarray(found + 10, found + 10 + l)), offset: found });
    p = found + 11 + l;
  }
  return out;
}

/** Penanda sebelum blok youth rating (panduan induk 4.7). */
const YOUTH_MARKER = [0xff, 0x7f, 0xd4, 0x00, 0x00, 0x00, 0xff, 0x7f];

/**
 * Offset byte "kandidat youth rating" sebuah negara: penanda + 8 + 3 (pola build_b7_db.py).
 * Status: HYPOTHESIS (B7b mengubah IDN ke 19, efek youth intake belum terbukti).
 * Mengembalikan -1 kalau penanda tidak ditemukan dalam 120 byte setelah awal record.
 */
export function youthRatingOffset(b: Uint8Array, nation: NationName): number {
  for (let k = nation.offset; k < Math.min(b.length - 12, nation.offset + 120); k++) {
    let ok = true;
    for (let j = 0; j < YOUTH_MARKER.length; j++) {
      if (b[k + j] !== YOUTH_MARKER[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return k + 8 + 3;
  }
  return -1;
}

export function withYouthRating(b: Uint8Array, nation: NationName, value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 1 || value > 20) throw new RangeError(`youth rating ${value} di luar 1–20`);
  const o = youthRatingOffset(b, nation);
  if (o < 0) throw new Error(`Penanda youth rating untuk ${nation.name} tidak ditemukan`);
  const out = b.slice();
  out[o] = value;
  return out;
}
