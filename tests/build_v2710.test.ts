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
