import { FormatError } from '../../binary/cursor';

/**
 * File record tetap-ukuran di db_archive 27.1.0 (acuan: scripts/people.py, split_fixed/join_fixed):
 * header 12 byte (u32 jumlah di offset 8) + N × record. Record disimpan mentah; field diedit dengan menambal salinan.
 *   players.dat 82 · non_players.dat 39 · starting_contracts.dat 54 · coaches/scouts/physios.dat 7
 */
export const PLAYER_LEN = 82;
export const NON_PLAYER_LEN = 39;
export const CONTRACT_LEN = 54;

export interface FixedDat {
  header: Uint8Array;
  recLen: number;
  records: Uint8Array[];
}

export function parseFixedDat(b: Uint8Array, recLen: number, name: string): FixedDat {
  const n = new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(8, true);
  if (12 + n * recLen !== b.length) throw new FormatError(`${name}: 12 + ${n} × ${recLen} ≠ ${b.length}`, 8);
  const records: Uint8Array[] = [];
  for (let i = 0; i < n; i++) records.push(b.subarray(12 + i * recLen, 12 + (i + 1) * recLen));
  return { header: b.subarray(0, 12), recLen, records };
}

export function serializeFixedDat(m: FixedDat): Uint8Array {
  const out = new Uint8Array(12 + m.records.length * m.recLen);
  out.set(m.header, 0);
  new DataView(out.buffer).setUint32(8, m.records.length, true);
  m.records.forEach((r, i) => out.set(r, 12 + i * m.recLen));
  return out;
}

const dvOf = (r: Uint8Array) => new DataView(r.buffer, r.byteOffset, r.byteLength);

// ---------------------------------------------------------------- players.dat (82 byte) — people_players.md
/** Urutan 34 atribut (offset 8..41). Sumber nyongrand/fmm-editor + data 27.1.0: LIKELY. */
export const PLAYER_ATTRS = ['crossing', 'dribbling', 'tackling', 'finishing', 'long_shots', 'heading', 'jumping', 'passing', 'decisions',
  'unselfishness', 'pace', 'strength', 'stamina', 'technique', 'consistency', 'aggression', 'big_matches', 'injury_proneness', 'leadership',
  'versatility', 'set_pieces', 'penalties', 'creativity', 'movement', 'positioning', 'work_rate', 'flair', 'handling', 'kicking', 'agility',
  'aerial_ability', 'reflexes', 'communication', 'throwing'] as const;
/** Atribut bertanda −100..100 (bukan 1–20); tampilan di game ≈ dasar + nilai/10 (UNKNOWN pasti). */
export const PLAYER_SIGNED_ATTRS = new Set<string>(['crossing', 'dribbling', 'tackling', 'finishing', 'long_shots', 'passing', 'decisions',
  'creativity', 'movement', 'positioning', 'handling', 'kicking', 'aerial_ability', 'reflexes', 'communication', 'throwing']);
export const PLAYER_POSITIONS = ['GK', 'LIB', 'DL', 'DC', 'DR', 'DM', 'ML', 'MC', 'MR', 'AML', 'AMC', 'AMR', 'ST', 'WBL', 'WBR'] as const;

export interface PlayerView {
  attrs: Record<string, number>;
  positions: number[];
  leftFoot: number;
  rightFoot: number;
  ca: number;
  pa: number;
  repHome: number;
  repCurrent: number;
  repWorld: number;
  squadNumber: number;
  height: number;
  weight: number;
}

export function readPlayer(r: Uint8Array): PlayerView {
  const dv = dvOf(r);
  const attrs: Record<string, number> = {};
  PLAYER_ATTRS.forEach((k, i) => {
    const v = r[8 + i]!;
    attrs[k] = PLAYER_SIGNED_ATTRS.has(k) && v > 127 ? v - 256 : v;
  });
  return {
    attrs,
    positions: [...r.subarray(42, 57)],
    leftFoot: r[57]!, rightFoot: r[58]!,
    ca: dv.getInt16(59, true), pa: dv.getInt16(61, true),
    repHome: dv.getInt16(63, true), repCurrent: dv.getInt16(65, true), repWorld: dv.getInt16(67, true),
    squadNumber: r[72]!, height: dv.getInt16(74, true), weight: dv.getInt16(76, true),
  };
}

export function writePlayer(r: Uint8Array, v: Partial<PlayerView>): Uint8Array {
  const out = r.slice();
  const dv = dvOf(out);
  if (v.attrs) PLAYER_ATTRS.forEach((k, i) => {
    const x = v.attrs![k];
    if (x === undefined) return;
    const signed = PLAYER_SIGNED_ATTRS.has(k);
    const c = signed ? Math.max(-100, Math.min(100, x)) : Math.max(1, Math.min(20, x));
    out[8 + i] = c & 0xff;
  });
  if (v.positions) v.positions.forEach((p, i) => { if (i < 15) out[42 + i] = Math.max(1, Math.min(20, p)); });
  if (v.leftFoot !== undefined) out[57] = Math.max(1, Math.min(20, v.leftFoot));
  if (v.rightFoot !== undefined) out[58] = Math.max(1, Math.min(20, v.rightFoot));
  if (v.ca !== undefined) dv.setInt16(59, Math.max(1, Math.min(200, v.ca)), true);
  if (v.pa !== undefined) dv.setInt16(61, Math.max(1, Math.min(200, v.pa)), true);
  if (v.repHome !== undefined) dv.setInt16(63, Math.max(0, Math.min(10000, v.repHome)), true);
  if (v.repCurrent !== undefined) dv.setInt16(65, Math.max(0, Math.min(10000, v.repCurrent)), true);
  if (v.repWorld !== undefined) dv.setInt16(67, Math.max(0, Math.min(10000, v.repWorld)), true);
  if (v.squadNumber !== undefined) out[72] = Math.max(0, Math.min(99, v.squadNumber));
  if (v.height !== undefined) dv.setInt16(74, Math.max(140, Math.min(220, v.height)), true);
  if (v.weight !== undefined) dv.setInt16(76, Math.max(40, Math.min(130, v.weight)), true);
  return out;
}

// ---------------------------------------------------------------- non_players.dat (39 byte)
/** Atribut staf bernama (VERIFIED dengan layar game: Mourinho, Bento, Maresca, Okiwa, Jansen); offset lain = 'a<offset>'. 31–33 = formasi. */
export const STAFF_NAMED: Record<number, string> = { 15: 'financial_control', 19: 'discipline', 21: 'judging_ability', 22: 'judging_potential', 23: 'people_management', 25: 'motivating', 29: 'tactical_knowledge' };

export interface NonPlayerView {
  ca: number;
  pa: number;
  attrs: Record<number, number>;
  /** Formasi (kode) di offset 31/32/33. */
  formations: { preferred: number; attacking: number; defensive: number };
}

export function readNonPlayer(r: Uint8Array): NonPlayerView {
  const dv = dvOf(r);
  const attrs: Record<number, number> = {};
  for (let o = 14; o < 31; o++) attrs[o] = r[o]!;
  for (let o = 34; o < 39; o++) attrs[o] = r[o]!;
  return { ca: dv.getInt16(4, true), pa: dv.getInt16(6, true), attrs, formations: { preferred: r[31]!, attacking: r[32]!, defensive: r[33]! } };
}

export function writeNonPlayer(r: Uint8Array, v: Partial<NonPlayerView>): Uint8Array {
  const out = r.slice();
  const dv = dvOf(out);
  if (v.ca !== undefined) dv.setInt16(4, Math.max(1, Math.min(200, v.ca)), true);
  if (v.pa !== undefined) dv.setInt16(6, Math.max(1, Math.min(200, v.pa)), true);
  if (v.attrs) for (const [o, x] of Object.entries(v.attrs)) {
    const off = Number(o);
    if (off >= 14 && off < 39 && (off < 31 || off > 33)) out[off] = Math.max(0, Math.min(20, x));
  }
  if (v.formations) {
    out[31] = v.formations.preferred;
    out[32] = v.formations.attacking;
    out[33] = v.formations.defensive;
  }
  return out;
}

// ---------------------------------------------------------------- starting_contracts.dat (54 byte)
export const JOB_NAMES: Record<number, string> = { 1: 'Pemain', 2: 'Pelatih', 12: 'Physio', 14: 'Scout', 16: 'Manajer', 20: 'Asisten manajer' };

export interface ContractView {
  personUid: number;
  clubUid: number;
  startDay: number;
  startYear: number;
  endDay: number;
  endYear: number;
  job: number;
  wage: number;
}

export function readContract(r: Uint8Array): ContractView {
  const dv = dvOf(r);
  return {
    personUid: dv.getUint32(0, true), clubUid: dv.getUint32(4, true),
    startDay: dv.getUint16(16, true), startYear: dv.getUint16(18, true),
    endDay: dv.getUint16(20, true), endYear: dv.getUint16(22, true),
    job: dv.getUint16(24, true), wage: dv.getUint32(26, true),
  };
}

export function writeContract(r: Uint8Array, v: Partial<Pick<ContractView, 'endDay' | 'endYear' | 'wage'>>): Uint8Array {
  const out = r.slice();
  const dv = dvOf(out);
  if (v.endDay !== undefined) dv.setUint16(20, v.endDay, true);
  if (v.endYear !== undefined) dv.setUint16(22, v.endYear, true);
  if (v.wage !== undefined) dv.setUint32(26, Math.max(0, Math.round(v.wage)), true);
  return out;
}

/** Hari ke-n dalam tahun (0 = 1 Jan, pola people.dat/kontrak) ↔ tanggal ISO. */
export function dayYearToIso(day: number, year: number): string {
  const d = new Date(Date.UTC(year, 0, 1) + day * 86400000);
  return d.toISOString().slice(0, 10);
}
export function isoToDayYear(iso: string): { day: number; year: number } {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const t = Date.UTC(y, m - 1, d);
  return { day: Math.round((t - Date.UTC(y, 0, 1)) / 86400000), year: y };
}

// ---------------------------------------------------------------- coaches/scouts/physios.dat (7 byte) — log 67
// u32 nomor urut (−1 = slot kosong) + 3 byte. Dicocokkan dengan 12 staf di layar game (Man City, Kashima, Bali):
//   byte 4 = gaya/spesialisasi, byte 5 = badge (1 Bronze, 2 Silver, 3 Gold), byte 6 = aptitude (1 Poor, 2 Normal, 3 Natural).
export const ROLE_LEN = 7;
export type RoleKind = 'coaches' | 'scouts' | 'physios';
export const ROLE_STYLE: Record<RoleKind, Record<number, string>> = {
  coaches: { 2: 'Defensive', 3: 'Attacking', 5: 'Goalkeeping (dugaan)', 6: 'Youth', 7: 'Fitness' },
  scouts: { 1: 'First Team Scout', 3: 'Youth Scout' },
  physios: { 1: 'Rehabilitation', 2: 'Prevention' },
};
export const ROLE_STYLE_MAX: Record<RoleKind, number> = { coaches: 7, scouts: 4, physios: 2 };
export const BADGE: Record<number, string> = { 1: 'Bronze', 2: 'Silver', 3: 'Gold' };
export const APTITUDE: Record<number, string> = { 1: 'Poor', 2: 'Normal', 3: 'Natural' };

export interface RoleView {
  style: number;
  badge: number;
  aptitude: number;
}
export function readRole(r: Uint8Array): RoleView {
  return { style: r[4]!, badge: r[5]!, aptitude: r[6]! };
}
export function writeRole(r: Uint8Array, v: Partial<RoleView>): Uint8Array {
  const out = r.slice();
  if (v.style !== undefined) out[4] = v.style;
  if (v.badge !== undefined) out[5] = Math.max(1, Math.min(3, v.badge));
  if (v.aptitude !== undefined) out[6] = Math.max(1, Math.min(3, v.aptitude));
  return out;
}

// ---------------------------------------------------------------- formasi staf (non_players.dat offset 31/32/33) — log 67
// Dicocokkan dengan layar game: Maresca 6/6/6 = 4-2-3-1 (tiga formasi sama di layar Edit), Okiwa 7/7/7 = 4-2-3-1 DM,
// Kurimoto 15 = 4-5-1, Nagata 8 = 4-2-4, Talan 2 = 4-1-2-2-1, Ixsan 1 = 3-4-3 DM.
// 31 = Preferred (VERIFIED); 32 = Attacking, 33 = Defensive (LIKELY: 4-2-4 paling sering di 32, 4-5-1 di 33).
export const FORMATION_OFFSETS = { preferred: 31, attacking: 32, defensive: 33 } as const;
// Daftar lengkap = urutan pilihan di layar Edit game (log 69); kode yang sudah dicocokkan (1, 2, 6, 7, 8, 15) sesuai urutan ini.
export const FORMATION_LIST = ['3-4-3', '3-4-3 DM', '4-1-2-2-1', '4-1-4-1', '4-2-1-3', '4-2-2-2', '4-2-3-1', '4-2-3-1 DM', '4-2-4', '4-3-1-2',
  '4-3-2-1', '4-3-3', '4-4-1-1', '4-4-2', '4-4-2 Diamond', '4-5-1', '5-1-2-2', '5-2-1-2', '5-2-2-1', '5-3-2', '5-4-1'] as const;
export const FORMATION_NAMES: Record<number, string> = Object.fromEntries(FORMATION_LIST.map((n, i) => [i, n]));
export const FORMATION_CODES = FORMATION_LIST.map((_, i) => i);
export function formationLabel(code: number): string {
  return FORMATION_NAMES[code] ?? `kode ${code} (nama belum diketahui)`;
}
