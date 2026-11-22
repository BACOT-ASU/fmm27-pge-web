import { Cursor, FormatError, Writer } from '../../binary/cursor';
import type { Issue } from '../types';

/**
 * stadium.dat (db_archive_2706.fmf). Spesifikasi: research/format_specs/db_archive_lainnya.md
 * Acuan: scripts/stadium.py, scripts/build_b7_db.py (stadion baru B7a). Status: VERIFIED.
 * Header 8 byte + u16 jumlah. Record: u32 index, u32 UID, u16 index kota, u32 kapasitas,
 * u32 kapasitas maks, nama (u32+teks), nama alternatif (u32+teks), 8 byte (opaque).
 */
export interface StadiumRecord {
  raw: Uint8Array;
  index: number;
  uid: number;
  city: number;
  capacity: number;
  maxCapacity: number;
  name: string;
  altName: string;
  tail: Uint8Array;
}

export interface StadiumDat {
  header: Uint8Array;
  records: StadiumRecord[];
}

function parseRecord(c: Cursor): StadiumRecord {
  const s = c.p;
  const index = c.u32();
  const uid = c.u32();
  const city = c.u16();
  const capacity = c.u32();
  const maxCapacity = c.u32();
  const name = c.str(200);
  const altName = c.str(200);
  const tail = c.bytes(8).slice();
  return { raw: c.b.slice(s, c.p), index, uid, city, capacity, maxCapacity, name, altName, tail };
}

export function parseStadiumDat(bytes: Uint8Array): StadiumDat {
  const c = new Cursor(bytes);
  const header = c.bytes(8).slice();
  const n = c.u16();
  const records: StadiumRecord[] = [];
  for (let i = 0; i < n; i++) records.push(parseRecord(c));
  if (c.p !== bytes.length) throw new FormatError(`stadium.dat tidak habis terbaca (${c.p}/${bytes.length})`, c.p);
  return { header, records };
}

export function serializeStadiumDat(m: StadiumDat): Uint8Array {
  if (m.records.length > 0xffff) throw new RangeError('stadium.dat maksimal 65.535 stadion (jumlah u16)');
  const w = new Writer().push(m.header);
  const n = new Uint8Array(2);
  new DataView(n.buffer).setUint16(0, m.records.length, true);
  w.push(n);
  for (const r of m.records) w.push(r.raw);
  return w.finish();
}

export interface StadiumFields {
  uid: number;
  city: number;
  capacity: number;
  maxCapacity: number;
  name: string;
  altName: string;
}

/** Susun record dari field (tail diambil dari record asal/templat). */
export function buildStadiumRecord(index: number, f: StadiumFields, tail: Uint8Array): StadiumRecord {
  const head = new Uint8Array(18);
  const dv = new DataView(head.buffer);
  dv.setUint32(0, index, true);
  dv.setUint32(4, f.uid, true);
  if (f.city < 0 || f.city > 0xffff) throw new RangeError(`index kota ${f.city} di luar u16`);
  dv.setUint16(8, f.city, true);
  dv.setUint32(10, f.capacity, true);
  dv.setUint32(14, f.maxCapacity, true);
  const raw = new Writer().push(head).str(f.name).str(f.altName).push(tail).finish();
  return parseRecord(new Cursor(raw));
}

export function withStadium(r: StadiumRecord, patch: Partial<Omit<StadiumFields, 'uid'>>): StadiumRecord {
  return buildStadiumRecord(r.index, { uid: r.uid, city: r.city, capacity: r.capacity, maxCapacity: r.maxCapacity, name: r.name, altName: r.altName, ...patch }, r.tail);
}

/**
 * Stadion baru di ujung (pola B7a): kota dipinjam dari stadion lain, tail dari templat.
 * Ingat: UID baru juga harus didaftarkan di sicomps 2700/fmm_stadiums.dat (IDN-0/1/2).
 */
export function appendStadium(m: StadiumDat, f: StadiumFields, template: StadiumRecord): StadiumDat {
  if (m.records.some((r) => r.uid === f.uid)) throw new Error(`UID stadion ${f.uid} sudah dipakai`);
  return { header: m.header, records: [...m.records, buildStadiumRecord(m.records.length, f, template.tail)] };
}

/** UID baru: lanjut dari UID terbesar di rentang buatan mod (2000700201 dst., pola B7a). */
export function nextStadiumUid(m: StadiumDat, base = 2000700201): number {
  let max = base - 1;
  for (const r of m.records) if (r.uid >= base && r.uid > max) max = r.uid;
  return max + 1;
}

export function validateStadiumDat(m: StadiumDat): Issue[] {
  const issues: Issue[] = [];
  const seen = new Map<number, number>();
  m.records.forEach((r, i) => {
    const where = `stadium.dat#${i} (${r.name})`;
    if (r.index !== i) issues.push({ level: 'error', message: `index ${r.index} tidak urut`, where });
    const d = seen.get(r.uid);
    if (d !== undefined) issues.push({ level: 'error', message: `UID ${r.uid} ganda (juga #${d})`, where });
    seen.set(r.uid, i);
    if (r.maxCapacity < r.capacity) issues.push({ level: 'warning', message: 'kapasitas maks lebih kecil dari kapasitas', where });
  });
  return issues;
}
