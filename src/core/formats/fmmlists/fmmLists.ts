import { FormatError } from '../../binary/cursor';

/**
 * Isi entri daftar muat sicomps/2700/fmm_*.dat (mis. IDN-0.dat): 8 byte header + u32 jumlah
 * + jumlah × u32 UID. Acuan: scripts/fmmlists.py, build_b7_rules.py, build_b7b_rules.py.
 * Status: VERIFIED (B7a stadion, B7b orang). Byte sisa setelah daftar (kalau ada) disimpan.
 */
export interface UidList {
  header: Uint8Array;
  uids: number[];
  tail: Uint8Array;
}

export function parseUidList(b: Uint8Array): UidList {
  if (b.length < 12) throw new FormatError('daftar UID terlalu pendek', 0);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const n = dv.getUint32(8, true);
  if (12 + n * 4 > b.length) throw new FormatError(`daftar UID terpotong (jumlah ${n})`, 8);
  const uids: number[] = [];
  for (let i = 0; i < n; i++) uids.push(dv.getUint32(12 + i * 4, true));
  return { header: b.slice(0, 8), uids, tail: b.slice(12 + n * 4) };
}

export function serializeUidList(l: UidList): Uint8Array {
  const out = new Uint8Array(12 + l.uids.length * 4 + l.tail.length);
  const dv = new DataView(out.buffer);
  out.set(l.header, 0);
  dv.setUint32(8, l.uids.length, true);
  l.uids.forEach((u, i) => dv.setUint32(12 + i * 4, u >>> 0, true));
  out.set(l.tail, 12 + l.uids.length * 4);
  return out;
}

/** Tambah UID yang belum ada (urutan lama tetap, yang baru di ujung). */
export function addUids(l: UidList, add: readonly number[]): UidList {
  const have = new Set(l.uids);
  const extra = add.filter((u) => !have.has(u) && (have.add(u), true));
  return { ...l, uids: [...l.uids, ...extra] };
}

export function removeUids(l: UidList, remove: readonly number[]): UidList {
  const r = new Set(remove);
  return { ...l, uids: l.uids.filter((u) => !r.has(u)) };
}

/** Nama file daftar muat dan artinya. */
export const FMM_LISTS = ['fmm_comps', 'fmm_clubs', 'fmm_reserve_clubs', 'fmm_cities', 'fmm_stadiums', 'fmm_people'] as const;
export type FmmListName = (typeof FMM_LISTS)[number];
