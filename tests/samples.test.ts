/**
 * Tes terhadap file game asli di samples/ (gitignored). Dilewati kalau file tidak ada.
 * Taruh salinan file di: samples/db_archive_2706.fmf, samples/sicomps.fmf, samples/pictures_logos.fmf
 */
import { openAsBlob } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listEntries, openFmf, readEntry, splitInnerArchive, openFmfBytes, findEntry } from '../src/core/fmf';
import type { ByteSource } from '../src/core/binary/byteSource';
import { pythonAvailable, runPythonJson, samplePath, sha256 } from './helpers';
import { loadDatabase, INDONESIA_NATION_INDEX } from '../src/core/db/loadDatabase';
import { bytesEqual } from '../src/core/binary/le';
import { serializeClubDat } from '../src/core/formats/club/clubDat';
import { serializeCompetitionDat } from '../src/core/formats/competition/competitionDat';

async function fileSource(path: string): Promise<ByteSource> {
  const blob = await openAsBlob(path);
  return { size: blob.size, read: async (s, e) => new Uint8Array(await blob.slice(s, e).arrayBuffer()) };
}

const SAMPLES = ['db_archive_2706.fmf', 'sicomps.fmf', 'pictures_logos.fmf'];

describe.each(SAMPLES)('sampel asli: %s', (name) => {
  const path = samplePath(name);
  it.skipIf(!path)('bisa dibuka; flag dan jumlah entri dicatat', async () => {
    const arc = await openFmf(await fileSource(path!));
    const entries = listEntries(arc.root);
    console.log(`${name}: flag ${arc.flag}, ${entries.length} entri, ukuran ${arc.source.size}`);
    expect(entries.length).toBeGreaterThan(0);
  }, 120_000);

  it.skipIf(!path || !pythonAvailable || name === 'pictures_logos.fmf')(
    'daftar entri dan isi sama dengan fmfio.py',
    async () => {
      const arc = await openFmf(await fileSource(path!));
      const py = runPythonJson<{ flag: number; entries: { path: string; storedSize: number; rawSize: number; sha256: string }[] }>(
        'read_fmf.py',
        [path!],
      );
      expect(arc.flag).toBe(py.flag);
      const ts = listEntries(arc.root);
      expect(ts.map((x) => x.path)).toEqual(py.entries.map((x) => x.path));
      for (let i = 0; i < ts.length; i++) {
        expect(sha256(await readEntry(arc, ts[i]!.entry))).toBe(py.entries[i]!.sha256);
      }
    },
    600_000,
  );
});

describe('sampel asli: comps.dbc di dalam sicomps.fmf', () => {
  const path = samplePath('sicomps.fmf');
  it.skipIf(!path)('comps.dbc adalah arsip bersarang yang bisa dibuka', async () => {
    const arc = await openFmf(await fileSource(path!));
    const hit = findEntry(arc.root, 'comps.dbc');
    expect(hit).not.toBeNull();
    const inner = splitInnerArchive(await readEntry(arc, hit!.entry));
    const dbc = await openFmfBytes(inner.archive);
    console.log(`comps.dbc: flag ${dbc.flag}, ${listEntries(dbc.root).length} entri`);
    expect(listEntries(dbc.root).length).toBeGreaterThan(1000);
  }, 120_000);
});

describe('sampel asli: competition.dat + club.dat di db_archive_2706.fmf', () => {
  const path = samplePath('db_archive_2706.fmf');

  it.skipIf(!path)('parse habis dan round-trip identik', async () => {
    const arc = await openFmf(await fileSource(path!));
    const db = await loadDatabase(arc);
    const compRaw = await readEntry(arc, findEntry(arc.root, 'competition.dat')!.entry);
    const clubRaw = await readEntry(arc, findEntry(arc.root, 'club.dat')!.entry);
    expect(bytesEqual(serializeCompetitionDat(db.competitions), compRaw)).toBe(true);
    expect(bytesEqual(serializeClubDat(db.clubs), clubRaw)).toBe(true);
    const idn = db.clubs.records.filter((c) => c.nation === INDONESIA_NATION_INDEX);
    console.log(`kompetisi ${db.competitions.records.length}, klub ${db.clubs.records.length}, klub IDN ${idn.length}, negara ${db.nations.length}`);
    expect(db.clubs.records.find((c) => c.uid === 2000700017)?.longName).toMatch(/^Gresik United/);
  }, 300_000);

  it.skipIf(!path || !pythonAvailable)('sama dengan comp.py dan club.py', async () => {
    const db = await loadDatabase(await openFmf(await fileSource(path!)));
    type Dump = { competitionEnd: boolean; clubEnd: boolean; competitions: unknown[][]; clubs: unknown[][] };
    const py = runPythonJson<Dump>('dump_db.py', [path!]);
    expect(py.competitionEnd && py.clubEnd).toBe(true);
    expect(db.competitions.records.map((c) => [c.index, c.uid, c.longName, c.shortName, c.type, c.nation, c.reputation, c.level, c.parent, c.entrants.length])).toEqual(py.competitions);
    expect(db.clubs.records.map((c) => [c.uid, c.longName, c.nation, c.division, c.stadium, c.hasFinance ? 1 : 0, c.squad.length, c.raw.length, c.status, c.reputation])).toEqual(py.clubs);
  }, 600_000);
});
