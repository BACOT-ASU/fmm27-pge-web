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
    out.push({ index: i, uid: dv.getUint32(found, true), name: td.decode(b.subarray(found + 10, found + 10 + l)) });
    p = found + 11 + l;
  }
  return out;
}
