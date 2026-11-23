import { Cursor, FormatError, Writer } from '../../binary/cursor';

/**
 * rivalries.dat. Acuan: scripts/riv.py. Status: VERIFIED (derby Persija–Persib 200 jalan di game).
 * Header 8 + u16 jumlah. Record: u32 index, u32 UID, nama (u32+teks) + 1 byte, i32 index klub A,
 * i32 index klub B (urutan di club.dat), u8 intensitas (0–200), 14 byte (opaque).
 */
export interface RivalryRecord {
  raw: Uint8Array;
  index: number;
  uid: number;
  name: string;
  gap: number;
  clubA: number;
  clubB: number;
  intensity: number;
  tail: Uint8Array;
}

export interface RivalryDat {
  header: Uint8Array;
  records: RivalryRecord[];
}

function parseRecord(c: Cursor): RivalryRecord {
  const s = c.p;
  const index = c.u32();
  const uid = c.u32();
  const name = c.str(200);
  const gap = c.u8();
  const clubA = c.i32();
  const clubB = c.i32();
  const intensity = c.u8();
  const tail = c.bytes(14).slice();
  return { raw: c.b.slice(s, c.p), index, uid, name, gap, clubA, clubB, intensity, tail };
}

export function parseRivalryDat(bytes: Uint8Array): RivalryDat {
  const c = new Cursor(bytes);
  const header = c.bytes(8).slice();
  const n = c.u16();
  const records: RivalryRecord[] = [];
  for (let i = 0; i < n; i++) records.push(parseRecord(c));
  if (c.p !== bytes.length) throw new FormatError(`rivalries.dat tidak habis terbaca (${c.p}/${bytes.length})`, c.p);
  return { header, records };
}

export function serializeRivalryDat(m: RivalryDat): Uint8Array {
  const w = new Writer().push(m.header);
  const n = new Uint8Array(2);
  new DataView(n.buffer).setUint16(0, m.records.length, true);
  w.push(n);
  for (const r of m.records) w.push(r.raw);
  return w.finish();
}

function buildRecord(index: number, uid: number, name: string, gap: number, a: number, b: number, intensity: number, tail: Uint8Array): RivalryRecord {
  if (intensity < 0 || intensity > 255) throw new RangeError(`intensitas ${intensity} di luar 0–255`);
  const w = new Writer();
  const h = new Uint8Array(8);
  new DataView(h.buffer).setUint32(0, index, true);
  new DataView(h.buffer).setUint32(4, uid, true);
  w.push(h).str(name).u8(gap);
  const ab = new Uint8Array(9);
  const dv = new DataView(ab.buffer);
  dv.setInt32(0, a, true);
  dv.setInt32(4, b, true);
  ab[8] = intensity;
  w.push(ab).push(tail);
  return parseRecord(new Cursor(w.finish()));
}

export function withRivalry(r: RivalryRecord, patch: Partial<Pick<RivalryRecord, 'name' | 'clubA' | 'clubB' | 'intensity'>>): RivalryRecord {
  return buildRecord(r.index, r.uid, patch.name ?? r.name, r.gap, patch.clubA ?? r.clubA, patch.clubB ?? r.clubB, patch.intensity ?? r.intensity, r.tail);
}

/** Rivalitas baru di ujung; byte pemisah & 14 byte ekor diambil dari templat. */
export function appendRivalry(m: RivalryDat, f: { name: string; clubA: number; clubB: number; intensity: number }, template: RivalryRecord): RivalryDat {
  let max = 0;
  for (const r of m.records) if (r.uid > max) max = r.uid;
  const rec = buildRecord(m.records.length, max + 1, f.name, template.gap, f.clubA, f.clubB, f.intensity, template.tail);
  return { header: m.header, records: [...m.records, rec] };
}
