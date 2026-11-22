import { Cursor, FormatError, Writer } from '../../binary/cursor';
import type { FormatAdapter, Issue } from '../types';

/**
 * club.dat (db_archive_2706.fmf). Spesifikasi: research/format_specs/club_dat.md
 * Acuan: scripts/club.py (batas kewajaran sama: teks ≤ 120, k ≤ 64, daftar x ≤ 60, skuad ≤ 400).
 * Status: VERIFIED (struktur & field bernama), blok keuangan 68 byte HYPOTHESIS, sisanya opaque.
 */
export const CLUB_STATUS: Record<number, string> = { 1: 'profesional', 2: 'semi-pro', 3: 'amatir' };
export const NO_STADIUM = 65535;
export const FINANCE_BLOCK_SIZE = 68;

/** Offset field (relatif terhadap awal record) untuk penulisan di tempat. */
export interface ClubLayout {
  /** Akhir blok nama (awal i16 negara). */
  afterNames: number;
  misc: number;
  div: number;
  /** Awal blok 23 byte (u8, u16 reputasi, ...). */
  repBlock: number;
}

export interface ClubRecord {
  raw: Uint8Array;
  pre: number;
  uid: number;
  longName: string;
  shortName: string;
  name6: string;
  code4: string;
  code3: string;
  /** Byte setelah nama panjang / pendek (0, 1, 2, atau 0xff). */
  gap1: number;
  gap2: number;
  /** Negara liga tempat bermain (index). */
  nation: number;
  /** Negara asal (index). */
  basedNation: number;
  status: number;
  trainingFacilities: number;
  youthFacilities: number;
  /** Penonton dalam satuan 10 orang (nilai mentah). */
  attendanceAvg: number;
  attendanceMin: number;
  attendanceMax: number;
  miscLast: number;
  /** Index kompetisi; −1 = tanpa liga. */
  division: number;
  division2: number;
  /** Index stadion; 65535 = tidak punya. */
  stadium: number;
  lastDivision: number;
  hasFinance: boolean;
  /** Blok keuangan 68 byte (HYPOTHESIS), null kalau tidak ada. */
  finance: Uint8Array | null;
  /** Panjang daftar byte (u32 k). */
  k: number;
  /** u8 sebelum reputasi (peringkat musim lalu? UNKNOWN). */
  repPrefix: number;
  /** Reputasi 0–10.000. */
  reputation: number;
  a1: number;
  capt: number;
  /** Jumlah item daftar 21 byte (UNKNOWN). */
  xCount: number;
  squad: number[];
  staff: number[];
  t0: number;
  tailN: number;
  layout: ClubLayout;
}

export interface ClubDat {
  header: Uint8Array;
  records: ClubRecord[];
}

const HEADER = 8;
const MAX_STR = 120;

function gap(c: Cursor): number {
  const at = c.p;
  const g = c.u8();
  if (g !== 0 && g !== 1 && g !== 2 && g !== 0xff) throw new FormatError(`Byte pemisah nama ${g} tidak dikenal`, at);
  return g;
}

function parseRecord(c: Cursor): ClubRecord {
  const s = c.p;
  const pre = c.i32();
  const uid = c.u32();
  const longName = c.str(MAX_STR);
  const gap1 = gap(c);
  const shortName = c.str(MAX_STR);
  const gap2 = gap(c);
  const name6 = c.str(MAX_STR);
  const code4 = c.str(MAX_STR);
  const code3 = c.str(MAX_STR);
  const afterNames = c.p - s;
  const nation = c.i16();
  const basedNation = c.i16();
  c.skip(12 + 132); // warna + kit (opaque)
  const misc = c.p - s;
  const status = c.u8();
  const trainingFacilities = c.u8();
  const youthFacilities = c.u8();
  const attendanceAvg = c.i16();
  const attendanceMin = c.i16();
  const attendanceMax = c.i16();
  const miscLast = c.u8();
  const div = c.p - s;
  const division = c.i16();
  const division2 = c.i16();
  c.skip(1);
  const stadium = c.u16();
  const lastDivision = c.i16();
  const flagAt = c.p;
  const flag = c.u8();
  if (flag !== 0 && flag !== 1) throw new FormatError(`Flag keuangan ${flag} tidak dikenal`, flagAt);
  const finance = flag ? c.bytes(FINANCE_BLOCK_SIZE).slice() : null;
  const kAt = c.p;
  const k = c.u32();
  if (k > 64) throw new FormatError(`Daftar byte k=${k} terlalu panjang`, kAt);
  c.skip(k);
  const repBlock = c.p - s;
  const repPrefix = c.u8();
  const reputation = c.u16();
  const a1 = c.i32();
  const capt = c.i32();
  c.skip(12);
  const xAt = c.p;
  const xCount = c.u16();
  if (xCount > 60) throw new FormatError(`Daftar 21 byte x=${xCount} terlalu panjang`, xAt);
  c.skip(21 * xCount);
  const mAt = c.p;
  const m = c.u16();
  if (m > 400) throw new FormatError(`Skuad ${m} pemain terlalu banyak`, mAt);
  const squad: number[] = [];
  for (let i = 0; i < m; i++) squad.push(c.i32());
  const staff: number[] = [];
  for (let i = 0; i < 12; i++) staff.push(c.i32());
  const t0 = c.u32();
  c.skip(27 + 44);
  const tailN = c.u16();
  return {
    raw: c.b.slice(s, c.p),
    pre,
    uid,
    longName,
    shortName,
    name6,
    code4,
    code3,
    gap1,
    gap2,
    nation,
    basedNation,
    status,
    trainingFacilities,
    youthFacilities,
    attendanceAvg,
    attendanceMin,
    attendanceMax,
    miscLast,
    division,
    division2,
    stadium,
    lastDivision,
    hasFinance: flag === 1,
    finance,
    k,
    repPrefix,
    reputation,
    a1,
    capt,
    xCount,
    squad,
    staff,
    t0,
    tailN,
    layout: { afterNames, misc, div, repBlock },
  };
}

export function parseClubDat(bytes: Uint8Array): ClubDat {
  const c = new Cursor(bytes);
  const header = c.bytes(HEADER).slice();
  const n = c.u32();
  const records: ClubRecord[] = [];
  for (let i = 0; i < n; i++) {
    try {
      records.push(parseRecord(c));
    } catch (e) {
      throw new FormatError(`club.dat record #${i}: ${e instanceof Error ? e.message : String(e)}`, c.p);
    }
  }
  if (c.p !== bytes.length) throw new FormatError(`club.dat tidak habis terbaca (${c.p}/${bytes.length})`, c.p);
  return { header, records };
}

export function serializeClubDat(model: ClubDat): Uint8Array {
  const w = new Writer().push(model.header).u32(model.records.length);
  for (const r of model.records) w.push(r.raw);
  return w.finish();
}

/** Field berukuran tetap yang boleh diubah di tempat (VERIFIED lewat B7b). */
export type ClubFixedField =
  | 'nation'
  | 'basedNation'
  | 'status'
  | 'trainingFacilities'
  | 'youthFacilities'
  | 'attendanceAvg'
  | 'attendanceMin'
  | 'attendanceMax'
  | 'division'
  | 'division2'
  | 'stadium'
  | 'lastDivision'
  | 'reputation';

type Kind = 'u8' | 'u16' | 'i16';
function fieldLocation(r: ClubRecord, f: ClubFixedField): { at: number; kind: Kind } {
  const L = r.layout;
  switch (f) {
    case 'nation': return { at: L.afterNames, kind: 'i16' };
    case 'basedNation': return { at: L.afterNames + 2, kind: 'i16' };
    case 'status': return { at: L.misc, kind: 'u8' };
    case 'trainingFacilities': return { at: L.misc + 1, kind: 'u8' };
    case 'youthFacilities': return { at: L.misc + 2, kind: 'u8' };
    case 'attendanceAvg': return { at: L.misc + 3, kind: 'i16' };
    case 'attendanceMin': return { at: L.misc + 5, kind: 'i16' };
    case 'attendanceMax': return { at: L.misc + 7, kind: 'i16' };
    case 'division': return { at: L.div, kind: 'i16' };
    case 'division2': return { at: L.div + 2, kind: 'i16' };
    case 'stadium': return { at: L.div + 5, kind: 'u16' };
    case 'lastDivision': return { at: L.div + 7, kind: 'i16' };
    case 'reputation': return { at: L.repBlock + 1, kind: 'u16' };
  }
}

/** Ubah satu field berukuran tetap; mengembalikan record baru (yang lama tidak diubah). */
export function withClubField(r: ClubRecord, f: ClubFixedField, value: number): ClubRecord {
  if (!Number.isInteger(value)) throw new RangeError(`${f}: nilai harus bilangan bulat`);
  const { at, kind } = fieldLocation(r, f);
  const raw = r.raw.slice();
  const dv = new DataView(raw.buffer);
  if (kind === 'u8') {
    if (value < 0 || value > 255) throw new RangeError(`${f} di luar rentang u8: ${value}`);
    raw[at] = value;
  } else if (kind === 'u16') {
    if (value < 0 || value > 65535) throw new RangeError(`${f} di luar rentang u16: ${value}`);
    dv.setUint16(at, value, true);
  } else {
    if (value < -32768 || value > 32767) throw new RangeError(`${f} di luar rentang i16: ${value}`);
    dv.setInt16(at, value, true);
  }
  return parseRecord(new Cursor(raw));
}

/** Ganti nama klub. Byte lain record tetap. */
export function withClubNames(
  r: ClubRecord,
  names: Partial<Pick<ClubRecord, 'longName' | 'shortName' | 'name6' | 'code4' | 'code3'>>,
): ClubRecord {
  const w = new Writer()
    .push(r.raw.subarray(0, 8))
    .str(names.longName ?? r.longName)
    .u8(r.gap1)
    .str(names.shortName ?? r.shortName)
    .u8(r.gap2)
    .str(names.name6 ?? r.name6)
    .str(names.code4 ?? r.code4)
    .str(names.code3 ?? r.code3)
    .push(r.raw.subarray(r.layout.afterNames));
  return parseRecord(new Cursor(w.finish()));
}

export function validateClubDat(model: ClubDat, ctx?: { competitionCount?: number; stadiumCount?: number }): Issue[] {
  const issues: Issue[] = [];
  const seen = new Map<number, number>();
  model.records.forEach((r, i) => {
    const where = `club.dat#${i} (${r.longName})`;
    const dup = seen.get(r.uid);
    if (dup !== undefined) issues.push({ level: 'error', message: `UID ${r.uid} ganda (juga di #${dup})`, where });
    seen.set(r.uid, i);
    if (!(r.status in CLUB_STATUS)) issues.push({ level: 'warning', message: `status ${r.status} tidak dikenal`, where });
    if (r.trainingFacilities > 20 || r.youthFacilities > 20) issues.push({ level: 'warning', message: 'fasilitas di atas 20', where });
    if (r.reputation > 10000) issues.push({ level: 'warning', message: `reputasi ${r.reputation} di atas 10.000`, where });
    if (ctx?.competitionCount !== undefined && r.division >= ctx.competitionCount)
      issues.push({ level: 'error', message: `divisi ${r.division} tidak ada di competition.dat`, where });
    if (r.division >= 0 && r.stadium === NO_STADIUM)
      issues.push({ level: 'info', message: 'klub liga tanpa stadion → penonton bisa 0', where });
    else if (ctx?.stadiumCount !== undefined && r.stadium !== NO_STADIUM && r.stadium >= ctx.stadiumCount)
      issues.push({ level: 'error', message: `stadion ${r.stadium} tidak ada di stadium.dat`, where });
  });
  return issues;
}

export const clubDatAdapter: FormatAdapter<ClubDat> = {
  id: 'club-dat',
  entryName: 'club.dat',
  parse: parseClubDat,
  serialize: serializeClubDat,
  validate: (m) => validateClubDat(m),
};
