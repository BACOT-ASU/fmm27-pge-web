import { describe, expect, it } from 'vitest';
import { bytesEqual } from '../src/core/binary/le';
import { appendStadium, nextStadiumUid, parseStadiumDat, serializeStadiumDat, validateStadiumDat, withStadium } from '../src/core/formats/stadium/stadiumDat';
import { appendRivalry, parseRivalryDat, serializeRivalryDat, withRivalry } from '../src/core/formats/rivalry/rivalryDat';
import { parseLngDat, serializeLngDat } from '../src/core/formats/lng/lngDat';
import { addUids, parseUidList, removeUids, serializeUidList } from '../src/core/formats/fmmlists/fmmLists';
import { buildDbcEntry, bumpCompsTxt, getAt, isEditableScalar, parseDbcEntry, scalarOf, setAt, tagName, withScalar, type DbcValue } from '../src/core/formats/dbc/dbc';
import { documentsLogoConfig, editLogoConfig, parseLogoConfig } from '../src/core/formats/logos/logoConfig';
import { readFixture } from './helpers';

const exp = JSON.parse(new TextDecoder().decode(readFixture('more', 'expected.json'))) as {
  stadiums: Record<string, unknown>[];
  rivalries: Record<string, unknown>[];
  dbc: Record<string, unknown>;
  dbcKey: unknown;
};
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

describe('stadium.dat (golden: stadium.py)', () => {
  const bytes = readFixture('more', 'stadium.dat.bin');
  const dat = parseStadiumDat(bytes);
  it('field sama dengan stadium.py', () => {
    expect(dat.records.map((r) => ({ index: r.index, uid: r.uid, city: r.city, capacity: r.capacity, maxCapacity: r.maxCapacity, name: r.name, altName: r.altName, tail: hex(r.tail) }))).toEqual(exp.stadiums);
  });
  it('round-trip identik', () => expect(bytesEqual(serializeStadiumDat(dat), bytes)).toBe(true));
  it('edit nama & kapasitas; stadion lain utuh', () => {
    const r = withStadium(dat.records[3]!, { name: 'Gelora Joko Samudro Baru', capacity: 30000, maxCapacity: 35000 });
    const out = parseStadiumDat(serializeStadiumDat({ ...dat, records: dat.records.map((x, i) => (i === 3 ? r : x)) }));
    expect(out.records[3]).toMatchObject({ name: 'Gelora Joko Samudro Baru', capacity: 30000, maxCapacity: 35000, uid: 1004, city: 9, altName: 'GJS — é' });
    expect(bytesEqual(out.records[0]!.raw, dat.records[0]!.raw)).toBe(true);
  });
  it('stadion baru di ujung (pola B7a)', () => {
    const uid = nextStadiumUid(dat);
    expect(uid).toBe(2000700202);
    const m = appendStadium(dat, { uid, city: dat.records[1]!.city, capacity: 10000, maxCapacity: 15000, name: 'Stadion Baru', altName: '' }, dat.records[3]!);
    const out = parseStadiumDat(serializeStadiumDat(m));
    expect(out.records.length).toBe(5);
    expect(out.records[4]).toMatchObject({ index: 4, uid, city: 7, name: 'Stadion Baru' });
    expect(validateStadiumDat(out).filter((x) => x.level === 'error')).toEqual([]);
    expect(() => appendStadium(m, { uid, city: 0, capacity: 1, maxCapacity: 1, name: 'x', altName: '' }, dat.records[0]!)).toThrow(/sudah dipakai/);
  });
});

describe('rivalries.dat (golden: riv.py)', () => {
  const bytes = readFixture('more', 'rivalries.dat.bin');
  const dat = parseRivalryDat(bytes);
  it('field sama dengan riv.py', () => {
    expect(dat.records.map((r) => ({ index: r.index, uid: r.uid, name: r.name, gap: r.gap, clubA: r.clubA, clubB: r.clubB, intensity: r.intensity, tail: hex(r.tail) }))).toEqual(exp.rivalries);
  });
  it('round-trip identik', () => expect(bytesEqual(serializeRivalryDat(dat), bytes)).toBe(true));
  it('ubah intensitas dan tambah rivalitas', () => {
    const r = withRivalry(dat.records[1]!, { intensity: 150 });
    expect(r.raw.length).toBe(dat.records[1]!.raw.length);
    const m = appendRivalry({ ...dat, records: [dat.records[0]!, r, dat.records[2]!] }, { name: 'Gresik vs Persela', clubA: 2, clubB: 9, intensity: 120 }, dat.records[0]!);
    const out = parseRivalryDat(serializeRivalryDat(m));
    expect(out.records[1]!.intensity).toBe(150);
    expect(out.records[3]).toMatchObject({ index: 3, uid: 504, name: 'Gresik vs Persela', clubA: 2, clubB: 9, intensity: 120 });
  });
});

describe('.lng', () => {
  const bytes = readFixture('more', 'eng.lng.bin');
  it('round-trip identik + tambah entri', () => {
    const m = parseLngDat(bytes);
    expect(m.entries.map((e) => e.longName)).toEqual(['Persib Bandung', 'Gresik United FC']);
    expect(bytesEqual(serializeLngDat(m), bytes)).toBe(true);
    const tpl = m.entries[1]!;
    const out = parseLngDat(serializeLngDat({ ...m, entries: [...m.entries, { ...tpl, uid: 2000700026, longName: 'Klub Baru', shortName: 'Baru', name6: 'BARU', code4: 'BARU' }] }));
    expect(out.entries.length).toBe(3);
    expect(out.tail).toEqual(m.tail);
  });
});

describe('daftar UID fmm_*', () => {
  const bytes = readFixture('more', 'IDN-0.dat.bin');
  it('round-trip, tambah, hapus', () => {
    const l = parseUidList(bytes);
    expect(l.uids).toEqual([41004312, 41042740, 2000700201]);
    expect(bytesEqual(serializeUidList(l), bytes)).toBe(true);
    const a = addUids(l, [2000700201, 2000700202, 2000700202]);
    expect(a.uids).toEqual([41004312, 41042740, 2000700201, 2000700202]);
    expect(removeUids(a, [41042740]).uids).toEqual([41004312, 2000700201, 2000700202]);
    expect(parseUidList(serializeUidList(a)).uids.length).toBe(4);
  });
});

describe('entri comps.dbc (golden: dbc.py)', () => {
  const bytes = readFixture('more', 'entry.dbc.bin');
  const e = parseDbcEntry(bytes);
  it('build(parse(x)) identik', () => expect(bytesEqual(buildDbcEntry(e), bytes)).toBe(true));
  it('nilai skalar sama dengan dbc.show', () => {
    const got: Record<string, unknown> = {};
    for (const f of e.fields) {
      const s = scalarOf(f.value);
      got[tagName(f.tag)] = s;
    }
    for (const [k, v] of Object.entries(exp.dbc)) {
      if (v !== null && typeof v === 'object') continue; // record/daftar dibandingkan terpisah
      if (k === 'date') expect(got[k]).toBe('tanggal:01020304');
      else if (typeof v === 'number' && !Number.isInteger(v)) expect(got[k] as number).toBeCloseTo(v, 5);
      else expect(got[k]).toBe(v);
    }
  });
  it('edit skalar di dalam daftar/record; sisanya utuh', () => {
    const qi = e.fields.findIndex((f) => tagName(f.tag) === 'qurl');
    const v = getAt(e, [qi, 1, 1]) as DbcValue;
    expect(scalarOf(v)).toBe(117);
    const e2 = setAt(e, [qi, 1, 1], withScalar(v, 142));
    const b2 = buildDbcEntry(e2);
    expect(b2.length).toBe(bytes.length);
    expect(scalarOf(getAt(parseDbcEntry(b2), [qi, 1, 1]))).toBe(142);
    const ni = e.fields.findIndex((f) => tagName(f.tag) === 'name');
    const e3 = setAt(e, [ni], withScalar(getAt(e, [ni]), 'Pegadaian Champ'));
    expect(scalarOf(getAt(parseDbcEntry(buildDbcEntry(e3)), [ni]))).toBe('Pegadaian Champ');
    expect(isEditableScalar(getAt(e, [qi]))).toBe(false);
    expect(() => withScalar(getAt(e, [ni + 1]), 300)).toThrow(RangeError); // dyow u8
  });
  it('comps.txt: naikkan versi entri yang benar saja', () => {
    const txt = 'idn_cup(1438),38\nidn_league_two(1442),241\nidn_league_two_groups(1442),1\n';
    const r = bumpCompsTxt(txt, 'comp_idn_league_two_1442.dbc');
    expect(r.found).toBe(true);
    expect(r.text).toBe('idn_cup(1438),38\nidn_league_two(1442),242\nidn_league_two_groups(1442),1\n');
    expect(bumpCompsTxt(txt, 'fixtures_3.dbc').found).toBe(false);
  });
});

describe('config logo', () => {
  const cfg = '<?xml version="1.0"?>\n<record>\n\t<list id="maps">\n\t\t<record from="custom/1" to="graphics/pictures/club/1/icon"/>\n\t\t<record from="lama/7" to="graphics/pictures/club/7/icon"/>\n\t</list>\n</record>\n';
  it('ganti dan tambah peta', () => {
    const out = editLogoConfig(cfg, 'clubs', ['7', '9'], 'small');
    const m = parseLogoConfig(out);
    expect(m.get('7')).toBe('custom/7');
    expect(m.get('9')).toBe('custom/9');
    expect(m.get('1')).toBe('custom/1');
    expect(out.match(/club\/7\/icon/g)?.length).toBe(1);
  });
  it('config Documents', () => {
    expect(documentsLogoConfig([{ kind: 'clubs', id: '5' }])).toContain('<record from="club_5" to="graphics/pictures/club/5/logo"/>');
  });
});
