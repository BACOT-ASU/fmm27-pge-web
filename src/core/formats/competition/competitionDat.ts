import { Cursor, FormatError, Writer } from '../../binary/cursor';
import type { FormatAdapter, Issue } from '../types';

/**
 * competition.dat (db_archive_2706.fmf). Spesifikasi: research/format_specs/competition_dat.md
 * Acuan: scripts/comp.py. Status: VERIFIED (baca/tulis), port TS Sesi 03.
 *
 * Header 8 byte + u16 jumlah. Record berurutan, panjang bervariasi.
 * Setiap record menyimpan byte aslinya (raw) supaya bagian yang tidak dikenal tidak hilang.
 */
export const COMPETITION_TYPE: Record<number, string> = {
  0: 'liga utama',
  1: 'liga bawah',
  2: 'piala utama',
  3: 'piala liga',
  4: 'piala lain',
  5: 'piala super',
  8: 'liga cadangan',
  21: 'kontinental',
  22: 'kontinental',
  28: 'amatir',
};

export interface CompetitionEntrant {
  clubUid: number;
  year: number;
  slot: number;
}

export interface CompetitionRecord {
  /** Byte asli record (salinan milik record ini). */
  raw: Uint8Array;
  index: number;
  uid: number;
  longName: string;
  shortName: string;
  abbr: string;
  /** Byte setelah nama panjang / pendek (arti belum diketahui). */
  gap1: number;
  gap2: number;
  type: number;
  continent: number;
  /** Index negara; −1 = lintas negara. */
  nation: number;
  colour: string;
  reputation: number;
  /** Tingkat divisi; 100 untuk piala. */
  level: number;
  /** Index kompetisi induk; −1 = tidak ada. */
  parent: number;
  entrants: CompetitionEntrant[];
  winners: [number, number, number];
  winnerYears: [number, number, number];
  tail: number;
  /** Offset (relatif record) awal blok tetap setelah singkatan. */
  fixedOffset: number;
}

export interface CompetitionDat {
  header: Uint8Array;
  records: CompetitionRecord[];
}

const HEADER = 8;

function parseRecord(c: Cursor): CompetitionRecord {
  const start = c.p;
  const index = c.u16();
  const uid = c.u32();
  const longName = c.str(1000);
  const gap1 = c.u8();
  const shortName = c.str(1000);
  const gap2 = c.u8();
  const abbr = c.str(1000);
  const fixedOffset = c.p - start;
  const type = c.u8();
  const continent = c.u16();
  const nation = c.i16();
  const colour = Array.from(c.bytes(4), (x) => x.toString(16).padStart(2, '0')).join('');
  const reputation = c.u16();
  const level = c.u8();
  const parent = c.i16();
  const n = c.u32();
  if (n > 10000) throw new FormatError(`Jumlah peserta ${n} tidak masuk akal`, c.p - 4);
  const entrants: CompetitionEntrant[] = [];
  for (let i = 0; i < n; i++) entrants.push({ clubUid: c.i32(), year: c.u16(), slot: c.u16() });
  const winners: [number, number, number] = [c.i32(), c.i32(), c.i32()];
  const winnerYears: [number, number, number] = [c.u16(), c.u16(), c.u16()];
  const tail = c.u16();
  return {
    raw: c.b.slice(start, c.p),
    index,
    uid,
    longName,
    shortName,
    abbr,
    gap1,
    gap2,
    type,
    continent,
    nation,
    colour,
    reputation,
    level,
    parent,
    entrants,
    winners,
    winnerYears,
    tail,
    fixedOffset,
  };
}

export function parseCompetitionDat(bytes: Uint8Array): CompetitionDat {
  const c = new Cursor(bytes);
  const header = c.bytes(HEADER).slice();
  const n = c.u16();
  const records: CompetitionRecord[] = [];
  for (let i = 0; i < n; i++) records.push(parseRecord(c));
  if (c.p !== bytes.length) throw new FormatError(`competition.dat tidak habis terbaca (${c.p}/${bytes.length})`, c.p);
  return { header, records };
}

export function serializeCompetitionDat(model: CompetitionDat): Uint8Array {
  const w = new Writer().push(model.header);
  const n = new Uint8Array(2);
  new DataView(n.buffer).setUint16(0, model.records.length, true);
  w.push(n);
  for (const r of model.records) w.push(r.raw);
  return w.finish();
}

/** Ganti nama (panjang/pendek/singkatan). Byte lain record tetap. */
export function withCompetitionNames(
  rec: CompetitionRecord,
  names: Partial<Pick<CompetitionRecord, 'longName' | 'shortName' | 'abbr'>>,
): CompetitionRecord {
  const w = new Writer()
    .push(rec.raw.subarray(0, 6))
    .str(names.longName ?? rec.longName)
    .u8(rec.gap1)
    .str(names.shortName ?? rec.shortName)
    .u8(rec.gap2)
    .str(names.abbr ?? rec.abbr)
    .push(rec.raw.subarray(rec.fixedOffset));
  return parseRecord(new Cursor(w.finish()));
}

type FixedField = 'type' | 'continent' | 'nation' | 'reputation' | 'level' | 'parent';
const FIXED: Record<FixedField, { at: number; kind: 'u8' | 'u16' | 'i16' }> = {
  type: { at: 0, kind: 'u8' },
  continent: { at: 1, kind: 'u16' },
  nation: { at: 3, kind: 'i16' },
  reputation: { at: 9, kind: 'u16' },
  level: { at: 11, kind: 'u8' },
  parent: { at: 12, kind: 'i16' },
};

/** Ubah satu field berukuran tetap (ukuran record tidak berubah). */
export function withCompetitionField(rec: CompetitionRecord, field: FixedField, value: number): CompetitionRecord {
  const raw = rec.raw.slice();
  const dv = new DataView(raw.buffer);
  const { at, kind } = FIXED[field];
  const o = rec.fixedOffset + at;
  if (kind === 'u8') {
    if (value < 0 || value > 255) throw new RangeError(`${field} di luar rentang u8: ${value}`);
    raw[o] = value;
  } else if (kind === 'u16') {
    if (value < 0 || value > 65535) throw new RangeError(`${field} di luar rentang u16: ${value}`);
    dv.setUint16(o, value, true);
  } else {
    if (value < -32768 || value > 32767) throw new RangeError(`${field} di luar rentang i16: ${value}`);
    dv.setInt16(o, value, true);
  }
  return parseRecord(new Cursor(raw));
}

export function validateCompetitionDat(model: CompetitionDat): Issue[] {
  const issues: Issue[] = [];
  const seen = new Map<number, number>();
  model.records.forEach((r, i) => {
    if (r.index !== i) issues.push({ level: 'error', message: `index ${r.index} tidak urut (seharusnya ${i})`, where: `competition.dat#${i}` });
    const dup = seen.get(r.uid);
    if (dup !== undefined) issues.push({ level: 'error', message: `UID ${r.uid} ganda (juga di #${dup})`, where: `competition.dat#${i}` });
    seen.set(r.uid, i);
    if (r.parent >= model.records.length) issues.push({ level: 'error', message: `induk ${r.parent} tidak ada`, where: `competition.dat#${i}` });
    if ([...r.longName].length > 21 && [...r.shortName].length > 21)
      issues.push({ level: 'warning', message: `nama panjang dan pendek sama-sama lebih dari 21 huruf ("${r.shortName}"); bisa terpotong di layar`, where: `competition.dat#${i}` });
  });
  return issues;
}

export const competitionDatAdapter: FormatAdapter<CompetitionDat> = {
  id: 'competition-dat',
  entryName: 'competition.dat',
  parse: parseCompetitionDat,
  serialize: serializeCompetitionDat,
  validate: validateCompetitionDat,
};
