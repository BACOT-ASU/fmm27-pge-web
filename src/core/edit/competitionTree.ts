import type { ClubDat } from '../formats/club/clubDat';
import type { CompetitionDat } from '../formats/competition/competitionDat';

/** Index kompetisi beserta semua turunannya (lewat field induk), mis. Liga Nusantara + Grup A/B/C. */
export function competitionWithDescendants(comps: CompetitionDat, root: number): Set<number> {
  const out = new Set<number>([root]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of comps.records) {
      if (c.parent >= 0 && out.has(c.parent) && !out.has(c.index)) {
        out.add(c.index);
        grew = true;
      }
    }
  }
  return out;
}

/** Index klub (urutan di club.dat) yang divisinya ada di kompetisi tsb atau turunannya. */
export function clubsInCompetitionTree(clubs: ClubDat, comps: CompetitionDat, root: number): number[] {
  const set = competitionWithDescendants(comps, root);
  const out: number[] = [];
  clubs.records.forEach((c, i) => {
    if (set.has(c.division)) out.push(i);
  });
  return out;
}
