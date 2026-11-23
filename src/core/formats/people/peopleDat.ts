import { Cursor, FormatError } from '../../binary/cursor';
import type { FormatAdapter, Issue } from '../types';

/**
 * people.dat (db_archive 27.1.0). Spesifikasi: research/format_specs/people_players.md, acuan Python: scripts/people.py.
 * Struktur record VERIFIED (round-trip identik). Setiap record menyimpan byte aslinya (`raw`); field tetap-ukuran
 * diedit dengan menambal salinan `raw` (ukuran record tidak berubah). Bagian yang tidak dimengerti tetap opaque.
 */
export const PEOPLE_HEADER_LEN = 13;
export const PERSONALITY = ['adaptability', 'ambition', 'determination', 'loyalty', 'pressure', 'professionalism', 'sportsmanship', 'temperament'] as const;

export interface PersonRecord {
  raw: Uint8Array;
  uid: number;
  /** Index nama di first/second/common_names.dat (first/common boleh -1 / 0xFFFFFFFF = kosong). */
  first: number;
  second: number;
  common: number;
  dobDay: number;
  dobYear: number;
  nation: number;
  otherNations: number[];
  clubIndex: number;
  joinedDay: number;
  joinedYear: number;
  personality: number[];
  playerIndex: number;
  nonPlayerIndex: number;
  coachIndex: number;
  scoutIndex: number;
  physioIndex: number;
  /** Offset field mulai caps (setelah daftar negara lain), relatif awal record. */
  q: number;
}

export interface PeopleDat {
  header: Uint8Array;
  records: PersonRecord[];
}

function parsePerson(b: Uint8Array, start: number): PersonRecord {
  const c = new Cursor(b, start);
  const pre = c.i32();
  if (pre !== -1) throw new FormatError('Awal record orang bukan -1', start);
  const uid = c.u32();
  const first = c.u32();
  const second = c.u32();
  const common = c.i32();
  const dobDay = c.u16();
  const dobYear = c.u16();
  const nation = c.u16();
  const n = c.u16();
  if (n > 8) throw new FormatError(`Jumlah negara lain ${n}`, c.p);
  const otherNations: number[] = [];
  for (let i = 0; i < n; i++) otherNations.push(c.u16());
  const q = c.p - start;
  c.skip(1 + 4 + 1 + 4 + 4 + 2); // intl a,b,c, tanggal, caps+gol, intl_x
  const clubIndex = c.i32();
  const joinedDay = c.u16();
  const joinedYear = c.u16();
  c.skip(2);
  const personality = [...c.bytes(8)];
  const playerIndex = c.i32();
  const nonPlayerIndex = c.i32();
  const coachIndex = c.i32();
  const scoutIndex = c.i32();
  const physioIndex = c.i32();
  if (nonPlayerIndex >= 0 || coachIndex >= 0 || scoutIndex >= 0 || physioIndex >= 0) c.skip(2);
  c.skip(4);
  const flags = c.bytes(3);
  if (flags[2]! > 1) throw new FormatError(`Flag bahasa ${flags[2]}`, c.p);
  if (flags[2]) c.skip(3);
  c.skip(3 * c.u8());
  const rel = c.u16();
  if (rel > 500) throw new FormatError(`Jumlah relasi ${rel}`, c.p);
  c.skip(8 * rel);
  return {
    raw: b.subarray(start, c.p), uid, first, second, common, dobDay, dobYear, nation, otherNations, clubIndex,
    joinedDay, joinedYear, personality, playerIndex, nonPlayerIndex, coachIndex, scoutIndex, physioIndex, q,
  };
}

export function parsePeopleDat(b: Uint8Array): PeopleDat {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const n = dv.getUint32(8, true);
  const records: PersonRecord[] = [];
  let p = PEOPLE_HEADER_LEN;
  for (let i = 0; i < n; i++) {
    const r = parsePerson(b, p);
    records.push(r);
    p += r.raw.length;
  }
  if (p !== b.length) throw new FormatError(`people.dat berhenti di ${p}, panjang ${b.length}`, p);
  return { header: b.subarray(0, PEOPLE_HEADER_LEN), records };
}

export function serializePeopleDat(m: PeopleDat): Uint8Array {
  const len = PEOPLE_HEADER_LEN + m.records.reduce((s, r) => s + r.raw.length, 0);
  const out = new Uint8Array(len);
  out.set(m.header, 0);
  new DataView(out.buffer).setUint32(8, m.records.length, true);
  let p = PEOPLE_HEADER_LEN;
  for (const r of m.records) {
    out.set(r.raw, p);
    p += r.raw.length;
  }
  return out;
}

export interface PersonPatch {
  first?: number;
  second?: number;
  common?: number;
  dobDay?: number;
  dobYear?: number;
  nation?: number;
  personality?: number[];
}

/** Salinan record dengan field tetap-ukuran diganti (raw ditambal, panjang sama). */
export function withPerson(r: PersonRecord, patch: PersonPatch): PersonRecord {
  const raw = r.raw.slice();
  const dv = new DataView(raw.buffer);
  const out: PersonRecord = { ...r, raw };
  if (patch.first !== undefined) { dv.setUint32(8, patch.first >>> 0, true); out.first = patch.first >>> 0; }
  if (patch.second !== undefined) { dv.setUint32(12, patch.second >>> 0, true); out.second = patch.second >>> 0; }
  if (patch.common !== undefined) { dv.setInt32(16, patch.common, true); out.common = patch.common; }
  if (patch.dobDay !== undefined) { dv.setUint16(20, patch.dobDay, true); out.dobDay = patch.dobDay; }
  if (patch.dobYear !== undefined) { dv.setUint16(22, patch.dobYear, true); out.dobYear = patch.dobYear; }
  if (patch.nation !== undefined) { dv.setUint16(24, patch.nation, true); out.nation = patch.nation; }
  if (patch.personality) {
    if (patch.personality.length !== 8) throw new Error('Kepribadian harus 8 nilai');
    raw.set(patch.personality.map((v) => Math.max(1, Math.min(20, v))), r.q + 26);
    out.personality = [...raw.subarray(r.q + 26, r.q + 34)];
  }
  return out;
}

export function validatePeopleDat(m: PeopleDat): Issue[] {
  const issues: Issue[] = [];
  const seen = new Set<number>();
  let prev = -1;
  for (const r of m.records) {
    if (seen.has(r.uid)) issues.push({ level: 'error', message: `UID ganda ${r.uid}`, where: 'people.dat' });
    seen.add(r.uid);
    if (r.uid < prev) issues.push({ level: 'warning', message: `UID tidak urut di ${r.uid}`, where: 'people.dat' });
    prev = r.uid;
  }
  return issues;
}

export const peopleDatAdapter: FormatAdapter<PeopleDat> = {
  id: 'people.dat',
  entryName: 'people.dat',
  parse: parsePeopleDat,
  serialize: serializePeopleDat,
  validate: validatePeopleDat,
};
