import type { ByteSource } from '../../binary/byteSource';

/**
 * Tabel di libgame.so (hanya dibaca). Spesifikasi: research/format_specs/libgame_tables.md.
 * Build dikenali dari ukuran file. Alamat VERIFIED untuk 27.0 (B2c) dan 27.1.0 (dicari ulang 23 Nov 2026).
 * Ukuran lain: ditampilkan dengan alamat 27.1.0 + peringatan (HYPOTHESIS).
 */
export interface LibgameBuild {
  label: string;
  size: number;
  nationsOffset: number;
  leaguesOffset: number;
  leaguesEnd: number;
  /** penanda teks tepat sebelum tabel negara (hanya 27.0) */
  marker: boolean;
}

export const LIBGAME_BUILDS: readonly LibgameBuild[] = [
  { label: '27.0 (B2c)', size: 52_355_608, nationsOffset: 0x643920, leaguesOffset: 0x7cb440, leaguesEnd: 0x7cb4b0, marker: true },
  { label: '27.1.0', size: 52_515_648, nationsOffset: 0x647800, leaguesOffset: 0x7cf618, leaguesEnd: 0x7cf688, marker: false },
];
export const KNOWN_LIBGAME_SIZE = LIBGAME_BUILDS[0]!.size;
export const PLAYABLE_NATIONS_OFFSET = LIBGAME_BUILDS[0]!.nationsOffset;
export const PLAYABLE_NATIONS_COUNT = 28;
export const DEEPEST_LEAGUES_OFFSET = LIBGAME_BUILDS[0]!.leaguesOffset;
export const DEEPEST_LEAGUES_END = LIBGAME_BUILDS[0]!.leaguesEnd;
const MARKER = '22FMH_RULE_GROUP_MANAGER';

export interface LibgameTables {
  knownBuild: boolean;
  build: LibgameBuild;
  markerFound: boolean;
  playableNations: number[];
  deepestLeagues: number[];
  notes: string[];
}

export async function readLibgameTables(src: ByteSource): Promise<LibgameTables> {
  const notes: string[] = [];
  const known = LIBGAME_BUILDS.find((b) => b.size === src.size);
  const build = known ?? LIBGAME_BUILDS[LIBGAME_BUILDS.length - 1]!;
  if (!known) notes.push(`Ukuran ${src.size} byte tidak dikenal (27.0 = ${LIBGAME_BUILDS[0]!.size}, 27.1.0 = ${LIBGAME_BUILDS[1]!.size}); alamat 27.1.0 dipakai, mungkin bergeser.`);
  if (src.size < build.leaguesEnd + 8) {
    return { knownBuild: !!known, build, markerFound: false, playableNations: [], deepestLeagues: [], notes: [...notes, 'File terlalu kecil.'] };
  }
  let markerFound = false;
  if (build.marker) {
    const around = await src.read(build.nationsOffset - 64, build.nationsOffset);
    markerFound = new TextDecoder('latin1').decode(around).includes(MARKER);
    if (!markerFound) notes.push('Teks penanda 22FMH_RULE_GROUP_MANAGER tidak ditemukan tepat sebelum tabel negara.');
  }
  const nb = await src.read(build.nationsOffset, build.nationsOffset + PLAYABLE_NATIONS_COUNT * 2);
  const ndv = new DataView(nb.buffer, nb.byteOffset, nb.byteLength);
  const playableNations = Array.from({ length: PLAYABLE_NATIONS_COUNT }, (_, i) => ndv.getUint16(i * 2, true));
  const lb = await src.read(build.leaguesOffset, build.leaguesEnd + 8);
  const ldv = new DataView(lb.buffer, lb.byteOffset, lb.byteLength);
  const deepestLeagues: number[] = [];
  for (let p = 0; p + 4 <= lb.length; p += 4) {
    const v = ldv.getUint32(p, true);
    if (v === 0xffffffff) break;
    deepestLeagues.push(v);
  }
  return { knownBuild: !!known, build, markerFound, playableNations, deepestLeagues, notes };
}
