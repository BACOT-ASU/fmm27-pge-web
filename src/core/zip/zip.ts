/**
 * Zip sederhana tanpa kompresi (metode "stored"). Port dari legacy/app/fmmcore.js (makeZip),
 * dengan tanggal DOS yang sah dan nama file UTF-8 (flag bit 11).
 */
const te = new TextEncoder();

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(b: Uint8Array, crc = 0): number {
  let c = (crc ^ 0xffffffff) >>> 0;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  /** Jalur di dalam zip, pakai '/'. */
  name: string;
  data: Uint8Array;
}

/** Tanggal DOS tetap (1 Jan 2026 00:00) supaya keluaran deterministik. */
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

export function makeZip(entries: readonly ZipEntry[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let off = 0;
  for (const e of entries) {
    const nm = te.encode(e.name);
    const crc = crc32(e.data);
    const h = new Uint8Array(30);
    const dv = new DataView(h.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0x0800, true); // UTF-8
    dv.setUint16(8, 0, true); // stored
    dv.setUint16(10, DOS_TIME, true);
    dv.setUint16(12, DOS_DATE, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, e.data.length, true);
    dv.setUint32(22, e.data.length, true);
    dv.setUint16(26, nm.length, true);
    parts.push(h, nm, e.data);
    const c = new Uint8Array(46);
    const cv = new DataView(c.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(12, DOS_TIME, true);
    cv.setUint16(14, DOS_DATE, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, e.data.length, true);
    cv.setUint32(24, e.data.length, true);
    cv.setUint16(28, nm.length, true);
    cv.setUint32(42, off, true);
    central.push(c, nm);
    off += 30 + nm.length + e.data.length;
  }
  let cs = 0;
  for (const x of central) cs += x.length;
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cs, true);
  ev.setUint32(16, off, true);
  const all = [...parts, ...central, end];
  let total = 0;
  for (const x of all) total += x.length;
  const out = new Uint8Array(total);
  let q = 0;
  for (const x of all) {
    out.set(x, q);
    q += x.length;
  }
  return out;
}
