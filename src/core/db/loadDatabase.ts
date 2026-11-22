import { findEntry, readEntry, type FmfArchive } from '../fmf';
import { parseClubDat, type ClubDat } from '../formats/club/clubDat';
import { parseCompetitionDat, type CompetitionDat } from '../formats/competition/competitionDat';
import { parseNationNames, type NationName } from '../formats/nation/nationNames';

/** Isi database yang sudah bisa dibaca (Sesi 03): kompetisi, klub, nama negara. */
export interface Database {
  competitions: CompetitionDat;
  clubs: ClubDat;
  nations: NationName[];
}

export const INDONESIA_NATION_INDEX = 58;

async function entryBytes(arc: FmfArchive, name: string): Promise<Uint8Array> {
  const hit = findEntry(arc.root, name);
  if (!hit) throw new Error(`${name} tidak ada di arsip`);
  return readEntry(arc, hit.entry);
}

export function isDatabaseArchive(arc: FmfArchive): boolean {
  return !!findEntry(arc.root, 'club.dat') && !!findEntry(arc.root, 'competition.dat');
}

export async function loadDatabase(arc: FmfArchive): Promise<Database> {
  const [comp, club, nation] = await Promise.all([
    entryBytes(arc, 'competition.dat'),
    entryBytes(arc, 'club.dat'),
    findEntry(arc.root, 'nation.dat') ? entryBytes(arc, 'nation.dat') : Promise.resolve(new Uint8Array()),
  ]);
  return { competitions: parseCompetitionDat(comp), clubs: parseClubDat(club), nations: parseNationNames(nation) };
}
