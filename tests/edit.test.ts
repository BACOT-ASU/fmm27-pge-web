import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bytesEqual } from '../src/core/binary/le';
import { ClubEditSession } from '../src/core/edit/clubEditSession';
import { clubsInCompetitionTree, competitionWithDescendants } from '../src/core/edit/competitionTree';
import { buildDocumentsZip, buildPatchedDbArchive, changeReportText, documentsConfigXml } from '../src/core/export/clubExport';
import { findEntry, materializeOutput, openFmfBytes, readEntry } from '../src/core/fmf';
import { parseClubDat, serializeClubDat } from '../src/core/formats/club/clubDat';
import { parseCompetitionDat } from '../src/core/formats/competition/competitionDat';
import { crc32 } from '../src/core/zip/zip';
import { pythonAvailable, readFixture } from './helpers';

const clubBytes = readFixture('db', 'club.dat.bin');
const compBytes = readFixture('db', 'competition.dat.bin');

describe('ClubEditSession', () => {
  it('edit, daftar perubahan, undo, redo', () => {
    const s = new ClubEditSession(parseClubDat(clubBytes));
    s.set(2, 'reputation', 2200);
    s.set(2, 'status', 1);
    expect(s.changes()).toEqual([
      { index: 2, uid: 2000700017, name: 'Gresik United', field: 'status', from: 2, to: 1 },
      { index: 2, uid: 2000700017, name: 'Gresik United', field: 'reputation', from: 1500, to: 2200 },
    ]);
    s.undo();
    expect(s.record(2).status).toBe(2);
    expect(s.record(2).reputation).toBe(2200);
    s.redo();
    expect(s.record(2).status).toBe(1);
    s.undo();
    s.undo();
    expect(s.changes()).toEqual([]);
    expect(bytesEqual(serializeClubDat(s.build()), clubBytes)).toBe(true);
  });

  it('setMany = satu langkah undo', () => {
    const s = new ClubEditSession(parseClubDat(clubBytes));
    expect(s.setMany(2, { status: 1, reputation: 2200, trainingFacilities: 5 })).toBe(1);
    expect(s.changes().length).toBe(2);
    s.undo();
    expect(s.changes()).toEqual([]);
    expect(() => s.setMany(2, { status: 1, reputation: 99999 })).toThrow(RangeError);
    expect(s.changes()).toEqual([]);
  });

  it('kembali ke nilai asli = tidak dihitung perubahan', () => {
    const s = new ClubEditSession(parseClubDat(clubBytes));
    s.set(0, 'reputation', 5000);
    s.set(0, 'reputation', 4600);
    expect(s.changes()).toEqual([]);
  });

  it('batch mode min hanya menaikkan yang di bawah', () => {
    const s = new ClubEditSession(parseClubDat(clubBytes));
    const n = s.batch([0, 1, 2, 3], 'reputation', 2000, 'min');
    expect(n).toBe(2); // Gresik 1500 dan klub uji 0 naik; Persib 4600, Persija 4500 tetap
    expect([0, 1, 2, 3].map((i) => s.record(i).reputation)).toEqual([4600, 4500, 2000, 2000]);
    s.undo();
    expect(s.changes()).toEqual([]);
  });

  it('hasil build bisa dibaca ulang dan hanya byte field yang berubah', () => {
    const s = new ClubEditSession(parseClubDat(clubBytes));
    s.batch([0, 1, 2, 3], 'status', 1);
    const out = serializeClubDat(s.build());
    expect(out.length).toBe(clubBytes.length);
    let diff = 0;
    for (let i = 0; i < out.length; i++) if (out[i] !== clubBytes[i]) diff++;
    expect(diff).toBe(2); // Gresik 2→1 dan klub uji 3→1
    expect(parseClubDat(out).records.map((r) => r.status)).toEqual([1, 1, 1, 1]);
  });

  it('nilai di luar rentang ditolak tanpa mengubah apa pun', () => {
    const s = new ClubEditSession(parseClubDat(clubBytes));
    expect(() => s.batch([0, 1], 'status', 300)).toThrow(RangeError);
    expect(s.changes()).toEqual([]);
    expect(s.canUndo).toBe(false);
  });
});

describe('pohon kompetisi', () => {
  it('induk + anak', () => {
    const comps = parseCompetitionDat(compBytes);
    expect([...competitionWithDescendants(comps, 1)].sort()).toEqual([1, 2]);
    expect(clubsInCompetitionTree(parseClubDat(clubBytes), comps, 1)).toEqual([2]); // Gresik di divisi 2 (anak dari 1)
    expect(clubsInCompetitionTree(parseClubDat(clubBytes), comps, 0)).toEqual([0, 1]);
  });
});

describe('ekspor', () => {
  it('config.xml sama persis dengan resep yang terbukti (16 Nov 2026)', () => {
    expect(documentsConfigXml(['club'])).toBe(
      "<?xml version='1.0' encoding='utf-8'?>\n<record>\n  <boolean id=\"preload\" value=\"false\"/>\n  <!--logo mappings-->\n  <list id=\"maps\">\n    <record from=\"club\" to=\"db_archive_2706/club\"/>\n  </list>\n</record>\n",
    );
  });

  it('crc32 standar', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('zip Documents berisi club.dat, config.xml, laporan', () => {
    const s = new ClubEditSession(parseClubDat(clubBytes));
    s.set(2, 'reputation', 2200);
    const club = serializeClubDat(s.build());
    const report = changeReportText(s.changes(), { sourceName: 'db_archive_2706.fmf', sourceSize: 1, createdAt: new Date(0) });
    expect(report).toContain('Gresik United | reputasi: 1500 -> 2200');
    expect(report).toContain('Store');
    const zip = buildDocumentsZip(club, report);
    if (pythonAvailable) {
      const dir = mkdtempSync(join(tmpdir(), 'zip-'));
      const f = join(dir, 'a.zip');
      writeFileSync(f, zip);
      const py = execFileSync(
        'python3',
        ['-c', 'import zipfile,sys,hashlib;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print("|".join(i.filename+":"+str(i.file_size) for i in z.infolist()));print(hashlib.sha256(z.read("db_archive_2706/club.dat")).hexdigest())', f],
        { encoding: 'utf-8' },
      ).trim().split('\n');
      expect(py[0]).toBe(`db_archive_2706/club.dat:${club.length}|db_archive_2706/config.xml:${documentsConfigXml(['club']).length}|LAPORAN_PERUBAHAN.txt:${new TextEncoder().encode(report).length}`);
    }
  });

  it('db_archive baru: club.dat diganti, entri lain utuh', async () => {
    // arsip sintetis flag 0 yang berisi club.dat sungguhan (dibuat dari fixture)
    const base = await openFmfBytes(readFixture('fmf', 'synthetic_flag0.fmf.bin'));
    const { patchFmf } = await import('../src/core/fmf');
    const arcBytes = await materializeOutput(base, patchFmf(base, [{ folder: 'synthetic/data', name: 'club', ext: '.dat', data: clubBytes }]));
    const arc = await openFmfBytes(arcBytes);
    const s = new ClubEditSession(parseClubDat(await readEntry(arc, findEntry(arc.root, 'club.dat')!.entry)));
    s.set(2, 'reputation', 2200);
    const out = await materializeOutput(arc, buildPatchedDbArchive(arc, serializeClubDat(s.build())));
    const arc2 = await openFmfBytes(out);
    const club2 = parseClubDat(await readEntry(arc2, findEntry(arc2.root, 'club.dat')!.entry));
    expect(club2.records[2]!.reputation).toBe(2200);
    const besar1 = await readEntry(arc, findEntry(arc.root, 'besar.dat')!.entry);
    const besar2 = await readEntry(arc2, findEntry(arc2.root, 'besar.dat')!.entry);
    expect(bytesEqual(besar1, besar2)).toBe(true);
  });
});
