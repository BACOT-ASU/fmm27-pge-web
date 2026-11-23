import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parsePeopleDat, serializePeopleDat, withPerson } from '../src/core/formats/people/peopleDat';
import { CONTRACT_LEN, NON_PLAYER_LEN, PLAYER_LEN, parseFixedDat, readPlayer, serializeFixedDat, writePlayer, dayYearToIso, isoToDayYear } from '../src/core/formats/people/fixedRecords';
import { findOrAddName, parseNamesDat, serializeNamesDat } from '../src/core/formats/people/namesDat';
import { pythonAvailable, runPythonJson, samplePath, sha256 } from './helpers';

const dir = samplePath('v2710');
const has = (n: string) => !!dir && !!samplePath(join('v2710', n));
const read = (n: string) => new Uint8Array(readFileSync(join(dir!, n)));

describe.skipIf(!has('people.dat'))('people.dat 27.1.0 ori', () => {
  const b = read('people.dat');
  const m = parsePeopleDat(b);
  it('round-trip identik byte demi byte', () => {
    expect(sha256(serializePeopleDat(m))).toBe(sha256(b));
  });
  it('tambal field tetap-ukuran tidak menggeser record', () => {
    const r = m.records[1000]!;
    const r2 = withPerson(r, { dobYear: r.dobYear + 1, personality: [1, 2, 3, 4, 5, 6, 7, 8] });
    expect(r2.raw.length).toBe(r.raw.length);
    const back = parsePeopleDat(serializePeopleDat({ ...m, records: m.records.map((x, i) => (i === 1000 ? r2 : x)) }));
    expect(back.records[1000]!.dobYear).toBe(r.dobYear + 1);
    expect(back.records[1000]!.personality).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(back.records[1001]!.uid).toBe(m.records[1001]!.uid);
  });
  it.skipIf(!pythonAvailable || !has('players.dat'))('golden: sama dengan scripts/people.py', () => {
    const g = runPythonJson<{ n: number; sample: { i: number; uid: number; club: number; player: number; np: number; nation: number; dob: number[]; pers: number[]; ca?: number; pa?: number; crossing?: number; pace?: number }[] }>('people_json.py', [dir!]);
    expect(m.records.length).toBe(g.n);
    const pl = parseFixedDat(read('players.dat'), PLAYER_LEN, 'players.dat');
    for (const s of g.sample) {
      const r = m.records[s.i]!;
      expect([r.uid, r.clubIndex, r.playerIndex, r.nonPlayerIndex, r.nation, r.dobDay, r.dobYear]).toEqual([s.uid, s.club, s.player, s.np, s.nation, s.dob[0], s.dob[1]]);
      expect(r.personality).toEqual(s.pers);
      if (s.ca !== undefined) {
        const p = readPlayer(pl.records[r.playerIndex]!);
        expect([p.ca, p.pa, p.attrs.crossing, p.attrs.pace]).toEqual([s.ca, s.pa, s.crossing, s.pace]);
      }
    }
  });
});

describe.skipIf(!has('players.dat') || !has('starting_contracts.dat') || !has('first_names.dat'))('file tetap-ukuran & nama 27.1.0 ori', () => {
  it('players / non_players / kontrak round-trip identik', () => {
    for (const [n, len] of [['players.dat', PLAYER_LEN], ['non_players.dat', NON_PLAYER_LEN], ['starting_contracts.dat', CONTRACT_LEN]] as const) {
      if (!has(n)) continue;
      const b = read(n);
      expect(sha256(serializeFixedDat(parseFixedDat(b, len, n)))).toBe(sha256(b));
    }
  });
  it('writePlayer menulis CA/PA/atribut di offset yang benar', () => {
    const pl = parseFixedDat(read('players.dat'), PLAYER_LEN, 'players.dat');
    const x = writePlayer(pl.records[5]!, { ca: 150, pa: 170, attrs: { pace: 18, crossing: -40 } });
    const v = readPlayer(x);
    expect([v.ca, v.pa, v.attrs.pace, v.attrs.crossing]).toEqual([150, 170, 18, -40]);
    expect(x.length).toBe(PLAYER_LEN);
  });
  it('nama: round-trip identik, nama baru di ujung', () => {
    for (const n of ['first_names.dat', 'second_names.dat', 'common_names.dat']) {
      const b = read(n);
      const m = parseNamesDat(b);
      expect(sha256(serializeNamesDat(m))).toBe(sha256(b));
    }
    const m = parseNamesDat(read('second_names.dat'));
    const [m2, i] = findOrAddName(m, 'Zzqxtestnama', 113);
    expect(i).toBe(m.records.length);
    const back = parseNamesDat(serializeNamesDat(m2));
    expect(back.records[i]!.name).toBe('Zzqxtestnama');
    expect(back.records[i]!.nationUid).toBe(113);
  });
  it('tanggal hari-ke-n ↔ ISO', () => {
    expect(dayYearToIso(181, 2026)).toBe('2026-07-01');
    expect(isoToDayYear('2027-05-31')).toEqual({ day: 150, year: 2027 });
  });
});

describe.skipIf(!has('people.dat') || !has('non_players.dat') || !has('coaches.dat'))('staf: formasi & peran cocok dengan layar game (log 67)', () => {
  it('Maresca 4-2-3-1 ×3, Okiwa 4-2-3-1 DM ×3, Kurimoto Defensive/Silver/Normal, Krücken Youth/Gold/Natural', async () => {
    const { readNonPlayer, readRole, formationLabel, ROLE_LEN } = await import('../src/core/formats/people/fixedRecords');
    const m = parsePeopleDat(read('people.dat'));
    const np = parseFixedDat(read('non_players.dat'), NON_PLAYER_LEN, 'non_players.dat');
    const co = parseFixedDat(read('coaches.dat'), ROLE_LEN, 'coaches.dat');
    const by = new Map(m.records.map((r) => [r.uid, r]));
    const f = (uid: number) => readNonPlayer(np.records[by.get(uid)!.nonPlayerIndex]!).formations;
    expect(f(703149)).toEqual({ preferred: 6, attacking: 6, defensive: 6 });
    expect(formationLabel(f(3901185).preferred)).toBe('4-2-3-1 DM');
    expect(readRole(co.records[by.get(788532)!.coachIndex]!)).toEqual({ style: 2, badge: 2, aptitude: 2 });
    expect(readRole(co.records[by.get(91121280)!.coachIndex]!)).toEqual({ style: 6, badge: 3, aptitude: 3 });
  });
});
