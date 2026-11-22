/**
 * Tes terhadap file game asli di samples/ (gitignored). Dilewati kalau file tidak ada.
 * Taruh salinan file di: samples/db_archive_2706.fmf, samples/sicomps.fmf, samples/pictures_logos.fmf
 */
import { openAsBlob } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listEntries, openFmf, readEntry, splitInnerArchive, openFmfBytes, findEntry } from '../src/core/fmf';
import type { ByteSource } from '../src/core/binary/byteSource';
import { pythonAvailable, runPythonJson, samplePath, sha256 } from './helpers';

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
