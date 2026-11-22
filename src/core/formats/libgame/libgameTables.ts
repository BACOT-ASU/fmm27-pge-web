import type { ByteSource } from '../../binary/byteSource';

/**
 * Tabel di libgame.so (hanya dibaca). Spesifikasi: research/format_specs/libgame_tables.md.
 * Alamat VERIFIED untuk build B2c (52.355.608 byte). Untuk ukuran lain: HYPOTHESIS, hanya ditampilkan
 * kalau pemeriksaan kewajaran lolos.
 */
export const KNOWN_LIBGAME_SIZE = 52_355_608;
export const PLAYABLE_NATIONS_OFFSET = 0x643920;
export const PLAYABLE_NATIONS_COUNT = 28;
export const DEEPEST_LEAGUES_OFFSET = 0x7cb440;
export const DEEPEST_LEAGUES_END = 0x7cb4b0;
const MARKER = '22FMH_RULE_GROUP_MANAGER';

export interface LibgameTables {
  knownBuild: boolean;
  markerFound: boolean;
  playableNations: number[];
  deepestLeagues: number[];
  notes: string[];
}

export async function readLibgameTables(src: ByteSource): Promise<LibgameTables> {
  const notes: string[] = [];
  const knownBuild = src.size === KNOWN_LIBGAME_SIZE;
  if (!knownBuild) notes.push(`Ukuran ${src.size} byte berbeda dari build B2c (${KNOWN_LIBGAME_SIZE}); alamat tabel mungkin bergeser.`);
  if (src.size < DEEPEST_LEAGUES_END) return { knownBuild, markerFound: false, playableNations: [], deepestLeagues: [], notes: [...notes, 'File terlalu kecil.'] };
  // penanda teks tepat sebelum tabel negara
  const around = await src.read(PLAYABLE_NATIONS_OFFSET - 64, PLAYABLE_NATIONS_OFFSET);
  const markerFound = new TextDecoder('latin1').decode(around).includes(MARKER);
  if (!markerFound) notes.push('Teks penanda 22FMH_RULE_GROUP_MANAGER tidak ditemukan tepat sebelum tabel negara.');
  const nb = await src.read(PLAYABLE_NATIONS_OFFSET, PLAYABLE_NATIONS_OFFSET + PLAYABLE_NATIONS_COUNT * 2);
  const ndv = new DataView(nb.buffer, nb.byteOffset, nb.byteLength);
  const playableNations = Array.from({ length: PLAYABLE_NATIONS_COUNT }, (_, i) => ndv.getUint16(i * 2, true));
  const lb = await src.read(DEEPEST_LEAGUES_OFFSET, DEEPEST_LEAGUES_END + 4);
  const ldv = new DataView(lb.buffer, lb.byteOffset, lb.byteLength);
  const deepestLeagues: number[] = [];
  for (let p = 0; p + 4 <= lb.length; p += 4) {
    const v = ldv.getUint32(p, true);
    if (v === 0xffffffff) break;
    deepestLeagues.push(v);
  }
  return { knownBuild, markerFound, playableNations, deepestLeagues, notes };
}
