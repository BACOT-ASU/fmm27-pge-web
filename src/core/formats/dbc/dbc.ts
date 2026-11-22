import { FormatError } from '../../binary/cursor';

/**
 * Entri comps.dbc (aturan kompetisi). Acuan: scripts/dbc.py. Status: VERIFIED (parse→build identik).
 * Entri: magic 8 byte 03 01 "cbd." 04 00, header 4 byte, 01 + kunci, u32 jumlah field, field..., sisa.
 * Field = tag 4 byte (tersimpan terbalik) + 01 + nilai. Nilai = 1 byte kode tipe + isi.
 */
export const DBC_MAGIC = [0x03, 0x01, 0x63, 0x62, 0x64, 0x2e, 0x04, 0x00] as const;
const SIZES: Record<number, number> = { 0x00: 0, 0x01: 4, 0x02: 4, 0x03: 1, 0x05: 8, 0x0f: 8, 0x11: 1, 0x12: 2, 0x18: 8, 0x19: 4, 0x20: 4 };

export type DbcValue =
  | { t: number; raw: Uint8Array } // tipe tetap & teks (0x0c/0x1a)
  | { t: 0x0a; fields: DbcField[] }
  | { t: 0x0b; items: DbcValue[] };

export interface DbcField {
  /** Tag 4 byte apa adanya (tersimpan terbalik). */
  tag: Uint8Array;
  value: DbcValue;
}

export interface DbcEntry {
  hdr: Uint8Array;
  key: DbcValue;
  fields: DbcField[];
  tail: Uint8Array;
}

function readValue(b: Uint8Array, dv: DataView, p: number): [DbcValue, number] {
  const t = b[p];
  if (t === undefined) throw new FormatError('nilai terpotong', p);
  p++;
  const size = SIZES[t];
  if (size !== undefined) {
    if (p + size > b.length) throw new FormatError('nilai terpotong', p);
    return [{ t, raw: b.slice(p, p + size) }, p + size];
  }
  if (t === 0x0c || t === 0x1a) {
    const l = dv.getUint32(p, true);
    return [{ t, raw: b.slice(p, p + 4 + l) }, p + 4 + l];
  }
  if (t === 0x0a) {
    const n = dv.getUint32(p, true);
    p += 4;
    const fields: DbcField[] = [];
    for (let i = 0; i < n; i++) {
      const tag = b.slice(p, p + 4);
      p += 4;
      if (b[p] !== 1) throw new FormatError(`penanda field ${b[p]}`, p);
      const [v, q] = readValue(b, dv, p + 1);
      fields.push({ tag, value: v });
      p = q;
    }
    return [{ t: 0x0a, fields }, p];
  }
  if (t === 0x0b) {
    const n = dv.getUint32(p, true);
    p += 4;
    const items: DbcValue[] = [];
    for (let i = 0; i < n; i++) {
      if (b[p] !== 1) throw new FormatError(`penanda item ${b[p]}`, p);
      const [v, q] = readValue(b, dv, p + 1);
      items.push(v);
      p = q;
    }
    return [{ t: 0x0b, items }, p];
  }
  throw new FormatError(`tipe nilai 0x${t.toString(16)} tidak dikenal`, p - 1);
}

export function isDbcEntry(b: Uint8Array): boolean {
  return DBC_MAGIC.every((x, i) => b[i] === x);
}

export function parseDbcEntry(b: Uint8Array): DbcEntry {
  if (!isDbcEntry(b)) throw new FormatError('bukan entri dbc (magic)', 0);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const hdr = b.slice(8, 12);
  let p = 12;
  if (b[p] !== 1) throw new FormatError('penanda kunci', p);
  const [key, q] = readValue(b, dv, p + 1);
  p = q;
  const n = dv.getUint32(p, true);
  p += 4;
  const fields: DbcField[] = [];
  for (let i = 0; i < n; i++) {
    const tag = b.slice(p, p + 4);
    p += 4;
    if (b[p] !== 1) throw new FormatError(`penanda field ${b[p]}`, p);
    const [v, r] = readValue(b, dv, p + 1);
    fields.push({ tag, value: v });
    p = r;
  }
  return { hdr, key, fields, tail: b.slice(p) };
}

function writeValue(v: DbcValue, out: number[][] | Uint8Array[]): void {
  const o = out as Uint8Array[];
  o.push(new Uint8Array([v.t]));
  if ('raw' in v) {
    o.push(v.raw);
  } else if (v.t === 0x0a) {
    o.push(u32(v.fields.length));
    for (const f of v.fields) {
      o.push(f.tag, new Uint8Array([1]));
      writeValue(f.value, o);
    }
  } else {
    o.push(u32(v.items.length));
    for (const it of v.items) {
      o.push(new Uint8Array([1]));
      writeValue(it, o);
    }
  }
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
}

export function buildDbcEntry(e: DbcEntry): Uint8Array {
  const parts: Uint8Array[] = [new Uint8Array(DBC_MAGIC), e.hdr, new Uint8Array([1])];
  writeValue(e.key, parts);
  parts.push(u32(e.fields.length));
  for (const f of e.fields) {
    parts.push(f.tag, new Uint8Array([1]));
    writeValue(f.value, parts);
  }
  parts.push(e.tail);
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let q = 0;
  for (const p of parts) {
    out.set(p, q);
    q += p.length;
  }
  return out;
}

/** Nama tag yang bisa dibaca (dibalik), mis. "ntms". */
export function tagName(tag: Uint8Array): string {
  return String.fromCharCode(...Array.from(tag).reverse());
}

const td = new TextDecoder('utf-8', { fatal: false });

export type DbcScalar = number | bigint | boolean | string | null;

/** Nilai skalar untuk tampilan (mirip dbc.show). Record/daftar → null. */
export function scalarOf(v: DbcValue): DbcScalar {
  if (!('raw' in v)) return null;
  const dv = new DataView(v.raw.buffer, v.raw.byteOffset, v.raw.byteLength);
  switch (v.t) {
    case 0x00: return null;
    case 0x01: return dv.getInt32(0, true);
    case 0x02: {
      const s = Array.from(v.raw).reverse();
      return s.every((c) => c >= 32 && c < 127) ? `'${String.fromCharCode(...s)}'` : dv.getUint32(0, true);
    }
    case 0x03: return v.raw[0] !== 0;
    case 0x05: return dv.getFloat64(0, true);
    case 0x0f:
    case 0x18: return dv.getBigInt64(0, true);
    case 0x11: return v.raw[0] ?? 0;
    case 0x12: return dv.getUint16(0, true);
    case 0x19: return dv.getFloat32(0, true);
    case 0x20: return `tanggal:${Array.from(v.raw, (x) => x.toString(16).padStart(2, '0')).join('')}`;
    case 0x0c:
    case 0x1a: return td.decode(v.raw.subarray(4));
    default: return null;
  }
}

/** Apakah nilai ini bisa diedit sebagai angka/bool/teks dari UI. */
export function isEditableScalar(v: DbcValue): boolean {
  return 'raw' in v && [0x01, 0x02, 0x03, 0x05, 0x11, 0x12, 0x19, 0x0c, 0x1a].includes(v.t);
}

const te = new TextEncoder();

/** Nilai baru dengan tipe sama. Teks: string; bool: boolean; lainnya: number. */
export function withScalar(v: DbcValue, x: number | boolean | string): DbcValue {
  if (!('raw' in v)) throw new Error('bukan nilai skalar');
  const raw = new Uint8Array(v.raw.length);
  const dv = new DataView(raw.buffer);
  const num = (lo: number, hi: number) => {
    if (typeof x !== 'number' || !Number.isFinite(x) || x < lo || x > hi || !Number.isInteger(x)) throw new RangeError(`nilai ${String(x)} di luar ${lo}–${hi}`);
    return x;
  };
  switch (v.t) {
    case 0x01: dv.setInt32(0, num(-2147483648, 2147483647), true); break;
    case 0x02: dv.setUint32(0, num(0, 4294967295), true); break;
    case 0x03: raw[0] = x ? 1 : 0; break;
    case 0x05: if (typeof x !== 'number') throw new RangeError('harus angka'); dv.setFloat64(0, x, true); break;
    case 0x11: raw[0] = num(0, 255); break;
    case 0x12: dv.setUint16(0, num(0, 65535), true); break;
    case 0x19: if (typeof x !== 'number') throw new RangeError('harus angka'); dv.setFloat32(0, x, true); break;
    case 0x0c:
    case 0x1a: {
      const b = te.encode(String(x));
      const out = new Uint8Array(4 + b.length);
      new DataView(out.buffer).setUint32(0, b.length, true);
      out.set(b, 4);
      return { t: v.t, raw: out };
    }
    default: throw new Error(`tipe 0x${v.t.toString(16)} tidak bisa diedit`);
  }
  return { t: v.t, raw };
}

/** Jalur ke sebuah nilai: [indeks field top-level, lalu indeks field/item di dalamnya...]. */
export type DbcPath = number[];

export function getAt(e: DbcEntry, path: DbcPath): DbcValue {
  let v: DbcValue | undefined = e.fields[path[0]!]?.value;
  for (const i of path.slice(1)) {
    if (!v) break;
    v = v.t === 0x0a && 'fields' in v ? v.fields[i]?.value : v.t === 0x0b && 'items' in v ? v.items[i] : undefined;
  }
  if (!v) throw new Error('jalur tidak ada');
  return v;
}

function setIn(v: DbcValue, path: DbcPath, nv: DbcValue): DbcValue {
  if (path.length === 0) return nv;
  const [i, ...rest] = path as [number, ...number[]];
  if (v.t === 0x0a && 'fields' in v) return { t: 0x0a, fields: v.fields.map((f, k) => (k === i ? { tag: f.tag, value: setIn(f.value, rest, nv) } : f)) };
  if (v.t === 0x0b && 'items' in v) return { t: 0x0b, items: v.items.map((it, k) => (k === i ? setIn(it, rest, nv) : it)) };
  throw new Error('jalur tidak ada');
}

/** Entri baru dengan nilai di jalur diganti (entri lama tidak diubah). */
export function setAt(e: DbcEntry, path: DbcPath, nv: DbcValue): DbcEntry {
  const [i, ...rest] = path as [number, ...number[]];
  return { ...e, fields: e.fields.map((f, k) => (k === i ? { tag: f.tag, value: setIn(f.value, rest, nv) } : f)) };
}

/**
 * Naikkan versi entri di comps.txt (baris "nama(branch),versi", urutan alfabet dijaga).
 * Nama entri "comp_idn_cup_1438.dbc" → kunci "idn_cup(1438)". Mengembalikan teks baru dan apakah ketemu.
 */
export function bumpCompsTxt(text: string, entryName: string): { text: string; found: boolean } {
  const m = /^(?:comp|nation|continent)_(.+)_(\d+)(?:\.dbc)?$/.exec(entryName);
  if (!m) return { text, found: false };
  const key = `${m[1]}(${m[2]})`;
  let found = false;
  const out = text.replace(/^([^\r\n,]+),(\d+)/gm, (line, name: string, ver: string) => {
    if (name !== key) return line;
    found = true;
    return `${name},${Number(ver) + 1}`;
  });
  return { text: out, found };
}
