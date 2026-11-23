import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadDatabase } from '../src/core/db/loadDatabase';
import { openFmfBytes } from '../src/core/fmf';
import { samplePath } from './helpers';

// Hasil build 27.1.0 (scripts/build_v2710_*.py) harus bisa dibuka aplikasi. Dilewati kalau file tidak ada.
const db = samplePath('out_v2710/db_archive_2707.fmf');
describe.skipIf(!db)('build 27.1.0 dibuka pembaca aplikasi', () => {
  it('db_archive_2707.fmf: kompetisi & klub Indonesia terbaca', async () => {
    const arc = await openFmfBytes(new Uint8Array(readFileSync(db!)));
    const d = await loadDatabase(arc);
    const idnComps = d.competitions.records.filter((c) => c.nation === 58);
    expect(idnComps.map((c) => c.uid)).toContain(41042746);
    expect(idnComps).toHaveLength(13);
    const nusantara = d.competitions.records.findIndex((c) => c.uid === 2000700102);
    expect(d.clubs.records.filter((c) => c.division === nusantara)).toHaveLength(8);
  });
  for (const name of ['sicomps.fmf', 'pictures_logos.fmf']) {
    const p = samplePath(`out_v2710/${name}`);
    it.skipIf(!p)(`${name} terbuka`, async () => {
      const arc = await openFmfBytes(new Uint8Array(readFileSync(p!)));
      expect(arc.root.files.length + arc.root.subs.length).toBeGreaterThan(0);
    });
  }
});

describe.skipIf(!db)('aplikasi: isi klub & edit orang (db 27.1.0 build)', () => {
  it('roster Persib: skuad club.dat, slot staf, manajer; edit CA tersimpan', async () => {
    const { Workspace } = await import('../src/core/workspace/workspace');
    const { materializeOutput, openFmfBytes: open2, findEntry, readEntry } = await import('../src/core/fmf');
    const { parseFixedDat, readPlayer, PLAYER_LEN } = await import('../src/core/formats/people/fixedRecords');
    const ws = new Workspace();
    await ws.attachDb(await openFmfBytes(new Uint8Array(readFileSync(db!))));
    await ws.loadPeople();
    const ci = ws.clubs.records.findIndex((c) => c.longName === 'Persib Bandung');
    const r = ws.roster(ci);
    expect(r.squad.length).toBeGreaterThanOrEqual(20);
    expect(r.managers.length).toBe(1);
    expect(r.coachSlots.filter((x) => x >= 0).length).toBeGreaterThan(0);
    expect(r.staffOutsideSlots).toHaveLength(0);
    const who = r.squad[0]!;
    const pi = ws.person(who).playerIndex;
    ws.setPlayer(who, { ca: 150 });
    ws.setPersonBasic(who, { commonName: 'Uji Nama Umum' });
    expect(ws.personName(who)).toBe('Uji Nama Umum');
    const out = await materializeOutput(ws.db!, ws.buildDbFmf());
    const arc2 = await open2(out);
    const pl = parseFixedDat(await readEntry(arc2, findEntry(arc2.root, 'players.dat')!.entry), PLAYER_LEN, 'players.dat');
    expect(readPlayer(pl.records[pi]!).ca).toBe(150);
  }, 120_000);
});
