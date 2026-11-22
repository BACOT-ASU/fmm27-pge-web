import { describe, expect, it } from 'vitest';
import { bytesEqual } from '../src/core/binary/le';
import {
  parseCompetitionDat,
  serializeCompetitionDat,
  validateCompetitionDat,
  withCompetitionField,
  withCompetitionNames,
} from '../src/core/formats/competition/competitionDat';
import { parseClubDat, serializeClubDat, validateClubDat, withClubField, withClubNames } from '../src/core/formats/club/clubDat';
import { readFixture } from './helpers';

const expected = JSON.parse(new TextDecoder().decode(readFixture('db', 'expected.json'))) as {
  competitions: Record<string, unknown>[];
  clubs: (Record<string, unknown> & { misc: number[]; length: number })[];
};
const compBytes = readFixture('db', 'competition.dat.bin');
const clubBytes = readFixture('db', 'club.dat.bin');

describe('competition.dat (golden: scripts/comp.py)', () => {
  const dat = parseCompetitionDat(compBytes);

  it('semua field sama dengan comp.py', () => {
    const got = dat.records.map(({ raw: _r, fixedOffset: _f, ...rest }) => rest);
    expect(got).toEqual(expected.competitions);
  });

  it('round-trip identik byte demi byte', () => {
    expect(bytesEqual(serializeCompetitionDat(dat), compBytes)).toBe(true);
  });

  it('ubah reputasi: hanya 2 byte yang berubah', () => {
    const rec = withCompetitionField(dat.records[0]!, 'reputation', 200);
    expect(rec.reputation).toBe(200);
    const out = serializeCompetitionDat({ ...dat, records: [rec, ...dat.records.slice(1)] });
    expect(out.length).toBe(compBytes.length);
    let diff = 0;
    for (let i = 0; i < out.length; i++) if (out[i] !== compBytes[i]) diff++;
    expect(diff).toBeLessThanOrEqual(2);
    expect(parseCompetitionDat(out).records[0]!.reputation).toBe(200);
  });

  it('ganti nama: record lain dan field lain tidak berubah', () => {
    const before = dat.records[2]!;
    const rec = withCompetitionNames(before, { shortName: 'Champ Barat' });
    expect(rec.shortName).toBe('Champ Barat');
    expect(rec.longName).toBe(before.longName);
    expect({ ...rec, raw: 0, shortName: 0, fixedOffset: 0 }).toEqual({ ...before, raw: 0, shortName: 0, fixedOffset: 0 });
    const out = parseCompetitionDat(serializeCompetitionDat({ ...dat, records: dat.records.map((r, i) => (i === 2 ? rec : r)) }));
    expect(out.records[2]!.shortName).toBe('Champ Barat');
    expect(bytesEqual(out.records[3]!.raw, dat.records[3]!.raw)).toBe(true);
  });

  it('menolak nilai di luar rentang', () => {
    expect(() => withCompetitionField(dat.records[0]!, 'type', 300)).toThrow(RangeError);
  });

  it('validator: data sintetis bersih dari galat', () => {
    expect(validateCompetitionDat(dat).filter((x) => x.level === 'error')).toEqual([]);
  });

  it('menolak file terpotong', () => {
    expect(() => parseCompetitionDat(compBytes.subarray(0, compBytes.length - 1))).toThrow();
  });
});

describe('club.dat (golden: scripts/club.py)', () => {
  const dat = parseClubDat(clubBytes);

  it('semua field bernama sama dengan club.py', () => {
    expect(dat.records.length).toBe(expected.clubs.length);
    dat.records.forEach((r, i) => {
      const e = expected.clubs[i]!;
      expect({
        uid: r.uid, pre: r.pre, longName: r.longName, shortName: r.shortName, name6: r.name6, code4: r.code4, code3: r.code3,
        nation: r.nation, basedNation: r.basedNation, division: r.division, division2: r.division2, stadium: r.stadium,
        lastDivision: r.lastDivision, hasFinance: r.hasFinance, k: r.k, a1: r.a1, capt: r.capt, xCount: r.xCount,
        squad: r.squad, staff: r.staff, t0: r.t0, tailN: r.tailN, length: r.raw.length,
        misc: [r.status, r.trainingFacilities, r.youthFacilities, r.attendanceAvg, r.attendanceMin, r.attendanceMax, r.miscLast],
        reputation: r.reputation,
      }).toEqual(e);
    });
  });

  it('round-trip identik byte demi byte', () => {
    expect(bytesEqual(serializeClubDat(dat), clubBytes)).toBe(true);
  });

  it.each([
    ['status', 1],
    ['trainingFacilities', 9],
    ['youthFacilities', 8],
    ['attendanceAvg', 1234],
    ['division', 1],
    ['stadium', 42],
    ['reputation', 2800],
    ['nation', 61],
  ] as const)('ubah %s di tempat (record dengan & tanpa blok keuangan)', (field, value) => {
    for (const i of [0, 1, 2, 3]) {
      const before = dat.records[i]!;
      const after = withClubField(before, field, value);
      expect(after[field]).toBe(value);
      expect(after.raw.length).toBe(before.raw.length);
      let diff = 0;
      for (let j = 0; j < after.raw.length; j++) if (after.raw[j] !== before.raw[j]) diff++;
      expect(diff).toBeLessThanOrEqual(2);
    }
  });

  it('ganti nama klub: bagian lain record utuh', () => {
    const before = dat.records[2]!;
    const after = withClubNames(before, { longName: 'Gresik United FC', code3: 'GUF' });
    expect(after.longName).toBe('Gresik United FC');
    expect(after.code3).toBe('GUF');
    expect(after.reputation).toBe(before.reputation);
    expect(after.squad).toEqual(before.squad);
    expect(bytesEqual(after.raw.subarray(after.layout.afterNames), before.raw.subarray(before.layout.afterNames))).toBe(true);
    const out = parseClubDat(serializeClubDat({ ...dat, records: dat.records.map((r, i) => (i === 2 ? after : r)) }));
    expect(out.records[2]!.longName).toBe('Gresik United FC');
  });

  it('validator menandai klub liga tanpa stadion', () => {
    const issues = validateClubDat(dat, { competitionCount: 5, stadiumCount: 100 });
    expect(issues.some((x) => x.message.includes('tanpa stadion') && x.where?.includes('Gresik'))).toBe(true);
    expect(issues.filter((x) => x.level === 'error')).toEqual([]);
  });

  it('menolak data rusak dengan pesan yang menyebut nomor record', () => {
    const bad = clubBytes.slice();
    bad.set([0xff, 0xff, 0xff, 0x7f], 12 + 8); // panjang nama klub pertama jadi raksasa
    expect(() => parseClubDat(bad)).toThrow(/record #0/);
  });
});
