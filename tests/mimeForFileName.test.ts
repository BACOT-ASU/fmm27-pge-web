import { describe, expect, it } from 'vitest';
import { mimeForFileName } from '../src/platform/mime';

// Blob tanpa tipe → Chrome Android menambah ".txt" (people.dat → people.dat.txt, 23 Nov 2026).
describe('mimeForFileName', () => {
  it('file biner game memakai application/octet-stream', () => {
    for (const n of ['people.dat', 'club.dat', 'db_archive_2706.fmf', 'comps.dbc', 'libgame.so', 'tanpa_ekstensi']) {
      expect(mimeForFileName(n)).toBe('application/octet-stream');
    }
  });
  it('zip, laporan teks, xml, png', () => {
    expect(mimeForFileName('paket.ZIP')).toBe('application/zip');
    expect(mimeForFileName('LAPORAN.txt')).toBe('text/plain;charset=utf-8');
    expect(mimeForFileName('config.xml')).toBe('application/xml');
    expect(mimeForFileName('logo.png')).toBe('image/png');
  });
});
