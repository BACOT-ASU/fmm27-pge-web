import { FormatError } from '../../binary/cursor';

/**
 * first_names.dat / second_names.dat / common_names.dat (acuan: scripts/names.py, NameFile di build_people_v2710.py).
 * header 12 (u32 jumlah di 8); record: u32 0, u32 index, u8, u32 UID negara, u16, u8 flag, u32 panjang, teks UTF-8.
 * Nama baru ditambah di UJUNG (index = jumlah lama), memakai 20 byte kepala dari record templat.
 */
const td = new TextDecoder('utf-8', { fatal: false });
const te = new TextEncoder();

export interface NameRecord {
  raw: Uint8Array;
  name: string;
  nationUid: number;
}

export interface NamesDat {
  header: Uint8Array;
  records: NameRecord[];
}

export function parseNamesDat(b: Uint8Array): NamesDat {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const n = dv.getUint32(8, true);
  const records: NameRecord[] = [];
  let p = 12;
  for (let i = 0; i < n; i++) {
    const len = dv.getUint32(p + 16, true);
    if (len > 400 || p + 20 + len > b.length) throw new FormatError(`Nama #${i}: panjang ${len}`, p);
    records.push({ raw: b.subarray(p, p + 20 + len), name: td.decode(b.subarray(p + 20, p + 20 + len)), nationUid: dv.getUint32(p + 9, true) });
    p += 20 + len;
  }
  if (p !== b.length) throw new FormatError(`Sisa ${b.length - p} byte`, p);
  return { header: b.subarray(0, 12), records };
}

export function serializeNamesDat(m: NamesDat): Uint8Array {
  const len = 12 + m.records.reduce((s, r) => s + r.raw.length, 0);
  const out = new Uint8Array(len);
  out.set(m.header, 0);
  new DataView(out.buffer).setUint32(8, m.records.length, true);
  let p = 12;
  for (const r of m.records) {
    out.set(r.raw, p);
    p += r.raw.length;
  }
  return out;
}

export function nameAt(m: NamesDat | undefined, index: number): string {
  if (!m || index < 0 || index >= m.records.length) return '';
  return m.records[index]!.name;
}

/** Cari nama yang sama (utamakan negara sama); kalau tidak ada, tambah di ujung. Mengembalikan [model, index]. */
export function findOrAddName(m: NamesDat, name: string, nationUid: number): [NamesDat, number] {
  let any = -1;
  for (let i = 0; i < m.records.length; i++) {
    const r = m.records[i]!;
    if (r.name !== name) continue;
    if (r.nationUid === nationUid) return [m, i];
    if (any < 0) any = i;
  }
  if (any >= 0) return [m, any];
  const tpl = m.records[0];
  if (!tpl) throw new Error('File nama kosong');
  const body = te.encode(name);
  const raw = new Uint8Array(20 + body.length);
  raw.set(tpl.raw.subarray(0, 20), 0);
  const dv = new DataView(raw.buffer);
  const idx = m.records.length;
  dv.setUint32(4, idx, true);
  dv.setUint32(9, nationUid, true);
  dv.setUint32(16, body.length, true);
  raw.set(body, 20);
  return [{ header: m.header, records: [...m.records, { raw, name, nationUid }] }, idx];
}
