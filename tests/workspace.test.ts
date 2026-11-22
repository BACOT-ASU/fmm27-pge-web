import { describe, expect, it } from 'vitest';
import { bytesEqual } from '../src/core/binary/le';
import { findEntry, listEntries, materializeOutput, openFmfBytes, readEntry, splitInnerArchive, type FmfArchive } from '../src/core/fmf';
import { parseClubDat } from '../src/core/formats/club/clubDat';
import { parseCompetitionDat } from '../src/core/formats/competition/competitionDat';
import { parseStadiumDat } from '../src/core/formats/stadium/stadiumDat';
import { parseRivalryDat } from '../src/core/formats/rivalry/rivalryDat';
import { parseLngDat } from '../src/core/formats/lng/lngDat';
import { parseUidList } from '../src/core/formats/fmmlists/fmmLists';
import { getAt, parseDbcEntry, scalarOf, tagName, withScalar } from '../src/core/formats/dbc/dbc';
import { parseLogoConfig } from '../src/core/formats/logos/logoConfig';
import { parseNationNames, youthRatingOffset } from '../src/core/formats/nation/nationNames';
import { Workspace } from '../src/core/workspace/workspace';
import { buildDbDocumentsZip, workspaceReportText } from '../src/core/export/clubExport';
import { readFixture } from './helpers';

async function ws(): Promise<Workspace> {
  const w = new Workspace();
  await w.attachDb(await openFmfBytes(readFixture('workspace', 'db_archive_2706.fmf.bin')));
  await w.attachSicomps(await openFmfBytes(readFixture('workspace', 'sicomps.fmf.bin')));
  await w.attachLogos(await openFmfBytes(readFixture('workspace', 'pictures_logos.fmf.bin')));
  return w;
}
const entry = async (arc: FmfArchive, name: string) => readEntry(arc, findEntry(arc.root, name)!.entry);

describe('Workspace: db_archive', () => {
  it('edit klub, kompetisi, stadion, rivalitas, youth → arsip baru terbaca benar', async () => {
    const w = await ws();
    w.setClub(2, { reputation: 2600, status: 1 });
    w.setCompetition(2, { shortName: 'Champ Barat', reputation: 120 });
    w.setStadium(3, { name: 'Gelora Joko Samudro (GUFC)', capacity: 30000 });
    const sIdx = await w.addStadium({ uid: 2000700202, city: 7, capacity: 12000, maxCapacity: 15000, name: 'Stadion Baru', altName: '' }, 3, { registerIn: ['IDN-0', 'IDN-1', 'IDN-2'], assignToClub: 3 });
    w.setRivalry(0, { intensity: 180 });
    w.addRivalry({ name: 'Gresik vs Persebaya', clubA: 2, clubB: 1, intensity: 120 });
    w.setYouthRating(58, 19);
    expect(w.changes().length).toBeGreaterThanOrEqual(9);

    const arc2 = await openFmfBytes(await materializeOutput(w.db!, w.buildDbFmf()));
    const clubs = parseClubDat(await entry(arc2, 'club.dat'));
    expect(clubs.records[2]).toMatchObject({ reputation: 2600, status: 1 });
    expect(clubs.records[3]!.stadium).toBe(sIdx);
    expect(parseCompetitionDat(await entry(arc2, 'competition.dat')).records[2]).toMatchObject({ shortName: 'Champ Barat', reputation: 120 });
    const st = parseStadiumDat(await entry(arc2, 'stadium.dat'));
    expect(st.records[3]!.name).toBe('Gelora Joko Samudro (GUFC)');
    expect(st.records[4]).toMatchObject({ uid: 2000700202, name: 'Stadion Baru', index: 4 });
    const rv = parseRivalryDat(await entry(arc2, 'rivalries.dat'));
    expect(rv.records[0]!.intensity).toBe(180);
    expect(rv.records[3]!.name).toBe('Gresik vs Persebaya');
    const nat = await entry(arc2, 'nation.dat');
    const n58 = parseNationNames(nat)[58]!;
    expect(nat[youthRatingOffset(nat, n58)]).toBe(19);
    // stadion baru juga didaftarkan di sicomps fmm_stadiums IDN-0/1/2, tapi tidak di ENG-0
    const sc2 = await openFmfBytes(await materializeOutput(w.sicomps!, await w.buildSicompsFmf()));
    const inner = await openFmfBytes(splitInnerArchive(await entry(sc2, 'fmm_stadiums.dat')).archive);
    expect(parseUidList(await entry(inner, 'IDN-2.dat')).uids).toContain(2000700202);
    expect(parseUidList(await entry(inner, 'ENG-0.dat')).uids).not.toContain(2000700202);
  });

  it('urung/ulang gabungan lintas file', async () => {
    const w = await ws();
    await w.addStadium({ uid: 2000700202, city: 7, capacity: 1, maxCapacity: 1, name: 'X', altName: '' }, 0, { registerIn: ['IDN-0'], assignToClub: 2 });
    expect(w.dirty('db:').sort()).toEqual(['db:club.dat', 'db:stadium.dat']);
    expect(w.dirty('sc:')).toEqual(['sc:list:fmm_stadiums']);
    w.h.undo();
    expect(w.h.dirtyKeys()).toEqual([]);
    w.h.redo();
    expect(w.h.dirtyKeys().length).toBe(3);
  });

  it('klon klub: club.dat + semua .lng + fmm_clubs', async () => {
    const w = await ws();
    const uid = w.nextClubUid();
    expect(uid).toBe(2000700018);
    const idx = await w.cloneClub(2, { uid, longName: 'Persela Lamongan', shortName: 'Persela', name6: 'PRSELA', code4: 'PSLA', code3: 'PSL', nation: 58, division: 2, registerIn: ['IDN-0', 'IDN-1', 'IDN-2'] });
    expect(idx).toBe(4);
    const arc2 = await openFmfBytes(await materializeOutput(w.db!, w.buildDbFmf()));
    const clubs = parseClubDat(await entry(arc2, 'club.dat'));
    expect(clubs.records[4]).toMatchObject({ uid, longName: 'Persela Lamongan', code3: 'PSL', nation: 58, division: 2, lastDivision: 2, squad: [] });
    expect(clubs.records[4]!.staff.every((x) => x === 0)).toBe(true);
    for (const f of ['eng.lng', 'ind.lng']) {
      const l = parseLngDat(await entry(arc2, f));
      expect(l.entries.length).toBe(5);
      expect(l.entries[4]).toMatchObject({ uid, longName: 'Persela Lamongan' });
    }
    const sc2 = await openFmfBytes(await materializeOutput(w.sicomps!, await w.buildSicompsFmf()));
    const inner = await openFmfBytes(splitInnerArchive(await entry(sc2, 'fmm_clubs.dat')).archive);
    expect(parseUidList(await entry(inner, 'IDN-1.dat')).uids.at(-1)).toBe(uid);
    await expect(w.cloneClub(2, { uid, longName: 'x', shortName: 'x', name6: 'x', code4: 'x', code3: 'x', nation: 58, division: 2 })).rejects.toThrow(/sudah dipakai/);
  });

  it('zip Documents berisi semua file db yang berubah', async () => {
    const w = await ws();
    w.setClub(2, { reputation: 2600 });
    w.setStadium(0, { capacity: 40000 });
    const entries = w.dbChangedEntries();
    expect(entries.map((e) => e.name + e.ext).sort()).toEqual(['club.dat', 'stadium.dat']);
    const zip = buildDbDocumentsZip(entries, workspaceReportText(w.changes(), { sources: ['db'], createdAt: new Date(0) }));
    const txt = new TextDecoder().decode(zip);
    expect(txt).toContain('<record from="club" to="db_archive_2706/club"/>');
    expect(txt).toContain('<record from="stadium" to="db_archive_2706/stadium"/>');
  });
});

describe('Workspace: sicomps', () => {
  it('ubah nilai comps.dbc → comps.dbc baru (flag 3) + comps.txt versi naik; entri lain utuh', async () => {
    const w = await ws();
    expect(w.dbcEntryNames()).toEqual(['comp_idn_league_two_1442.dbc', 'fixtures_1.dbc']);
    const e = await w.dbcEntry('comp_idn_league_two_1442.dbc');
    const i = e.fields.findIndex((f) => tagName(f.tag) === 'ntms');
    await w.setDbcValue('comp_idn_league_two_1442.dbc', [i], withScalar(getAt(e, [i]), 12));
    const sc2 = await openFmfBytes(await materializeOutput(w.sicomps!, await w.buildSicompsFmf()));
    const inner = await openFmfBytes(splitInnerArchive(await entry(sc2, 'comps.dbc')).archive);
    expect(inner.flag).toBe(3);
    const e2 = parseDbcEntry(await entry(inner, 'comp_idn_league_two_1442.dbc'));
    expect(scalarOf(getAt(e2, [i]))).toBe(12);
    expect(bytesEqual(await entry(inner, 'fixtures_1.dbc'), new Uint8Array(25))).toBe(true);
    expect(new TextDecoder().decode(await entry(sc2, 'comps.txt'))).toBe('idn_cup(1438),38\nidn_league_two(1442),242\n');
    // waktu entri besar (gaya FILETIME) tetap
    expect(listEntries(sc2.root).find((x) => x.path.endsWith('comps.txt'))!.entry.time1).toBe(134_078_400_000_000_000n);
  });

  it('tambah/hapus UID daftar muat', async () => {
    const w = await ws();
    await w.listAdd('fmm_people', ['IDN-0'], [37078404]);
    await w.listRemove('fmm_people', 'IDN-0', [41042740]);
    const sc2 = await openFmfBytes(await materializeOutput(w.sicomps!, await w.buildSicompsFmf()));
    const inner = await openFmfBytes(splitInnerArchive(await entry(sc2, 'fmm_people.dat')).archive);
    expect(parseUidList(await entry(inner, 'IDN-0.dat')).uids).toEqual([41004312, 2000700201, 37078404]);
    expect(w.changes().some((c) => c.what.includes('tambah 37078404') && c.what.includes('hapus 41042740'))).toBe(true);
  });
});

describe('Workspace: logo', () => {
  it('logo baru → PNG di custom/ + config.xml diperbarui (normal & small)', async () => {
    const w = await ws();
    expect(w.hasLogo('clubs', '1')).toBe(true);
    expect(w.hasLogo('clubs', '2000700017')).toBe(false);
    w.addLogo({ kind: 'clubs', id: '2000700017', label: 'Gresik', normal: new Uint8Array([1, 2, 3]), small: new Uint8Array([4]) });
    const lg = await openFmfBytes(await materializeOutput(w.logos!, w.buildLogosFmf()));
    expect(Array.from(await entry(lg, 'pictures_logos/logos/normal/clubs/custom/2000700017.png'))).toEqual([1, 2, 3]);
    expect(Array.from(await entry(lg, 'pictures_logos/logos/small/clubs/custom/2000700017.png'))).toEqual([4]);
    const cfg = parseLogoConfig(new TextDecoder().decode(await entry(lg, 'pictures_logos/logos/small/clubs/config.xml')));
    expect(cfg.get('2000700017')).toBe('custom/2000700017');
    expect(cfg.get('1')).toBe('custom/1');
  });
});

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pythonAvailable, ROOT } from './helpers';

describe.skipIf(!pythonAvailable)('Workspace: hasil dibaca skrip Python acuan', () => {
  it('sicomps hasil (comps.dbc flag 3 raw-frame) dibaca fmfio.py + dbc.py; db dibaca club.py/stadium.py', async () => {
    const w = await ws();
    const e = await w.dbcEntry('comp_idn_league_two_1442.dbc');
    const i = e.fields.findIndex((f) => tagName(f.tag) === 'ntms');
    await w.setDbcValue('comp_idn_league_two_1442.dbc', [i], withScalar(getAt(e, [i]), 12));
    await w.listAdd('fmm_people', ['IDN-1'], [37078404]);
    w.setClub(2, { reputation: 2600 });
    await w.addStadium({ uid: 2000700202, city: 7, capacity: 12000, maxCapacity: 15000, name: 'Stadion Baru', altName: '' }, 3);
    const dir = mkdtempSync(join(tmpdir(), 'ws-'));
    writeFileSync(join(dir, 'sicomps.fmf'), await materializeOutput(w.sicomps!, await w.buildSicompsFmf()));
    writeFileSync(join(dir, 'db.fmf'), await materializeOutput(w.db!, w.buildDbFmf()));
    const py = `
import sys,struct,tempfile,os
sys.path.insert(0, ${JSON.stringify(join(ROOT, 'scripts'))})
import fmfio, dbcarc, dbc, club, stadium
d=sys.argv[1]
flag,root=dbcarc.load_sicomps(os.path.join(d,'sicomps.fmf'))
pre,fl,rt=dbcarc.load_dbc(fmfio.get(dbcarc.find(root,'/comps.dbc')))
e=[r for p,r in fmfio.walk(rt) if p.endswith('comp_idn_league_two_1442.dbc')][0]
D=dbc.parse(fmfio.get(e)); print('ntms', [dbc.show(v) for t,v in D['fields'] if dbc.tagname(t)=='ntms'][0], 'flag', fl)
b=fmfio.get(dbcarc.find(root,'/fmm_people.dat')); f2,r2,_=fmfio.read(b[8:])
x=[fmfio.get(r) for p,r in fmfio.walk(r2) if p.endswith('IDN-1.dat')][0]; n=struct.unpack_from('<I',x,8)[0]; print('people', struct.unpack_from('<I',x,8+4*n)[0])
flag,root,_=fmfio.read(open(os.path.join(d,'db.fmf'),'rb').read())
rows={p.rsplit('/',1)[-1]:r for p,r in fmfio.walk(root)}
t=tempfile.mkdtemp()
open(t+'/c','wb').write(fmfio.get(rows['club.dat'])); C,e1,l1=club.parse(t+'/c',verbose=False)
open(t+'/s','wb').write(fmfio.get(rows['stadium.dat'])); S,e2,l2=stadium.parse(t+'/s')
print('ok', e1==l1, e2==l2, len(S), S[-1]['name'])
`;
    const out = execFileSync('python3', ['-c', py, dir], { encoding: 'utf-8' });
    expect(out).toContain('ntms 12 flag 3');
    expect(out).toContain('people 37078404');
    expect(out).toContain('ok True True 5 Stadion Baru');
  });
});
