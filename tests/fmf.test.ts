import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bytesEqual, concatBytes } from '../src/core/binary/le';
import {
  innerPrefixKind,
  listEntries,
  materializeOutput,
  openFmfBytes,
  patchFmf,
  readEntry,
  serializeToc,
  splitInnerArchive,
} from '../src/core/fmf';
import { zstdDecompress, zstdRawFrame, encodeLengthPrefixedRawFrames, decodeLengthPrefixedFrames } from '../src/core/zstd/zstd';
import { pythonAvailable, readFixture, runPythonJson, sha256 } from './helpers';

interface ExpectedEntry {
  path: string;
  offset: number;
  storedSize: number;
  rawSize: number;
  time1: number;
  time2: number;
  sha256: string;
}
type Expected = Record<string, { flag: number; size: number; sha256: string; entries: ExpectedEntry[] }>;
const expected = JSON.parse(new TextDecoder().decode(readFixture('fmf', 'expected.json'))) as Expected;
const FIXTURE_NAMES = Object.keys(expected);

describe.each(FIXTURE_NAMES)('golden: %s (dibuat fmfio.py)', (name) => {
  const exp = expected[name]!;
  const bytes = readFixture('fmf', name);

  it('fixture utuh (hash sesuai expected.json)', () => {
    expect(sha256(bytes)).toBe(exp.sha256);
  });

  it('header, flag, dan daftar entri sama dengan hasil Python', async () => {
    const arc = await openFmfBytes(bytes);
    expect(arc.flag).toBe(exp.flag);
    const got = listEntries(arc.root).map(({ path, entry }) => ({
      path,
      offset: entry.offset,
      storedSize: entry.storedSize,
      rawSize: entry.rawSize,
      time1: entry.time1,
      time2: entry.time2,
    }));
    expect(got).toEqual(
      exp.entries.map((e) => ({ path: e.path, offset: e.offset, storedSize: e.storedSize, rawSize: e.rawSize, time1: e.time1, time2: e.time2 })),
    );
  });

  it('isi setiap entri sama (SHA-256)', async () => {
    const arc = await openFmfBytes(bytes);
    const entries = listEntries(arc.root);
    for (const [i, { entry }] of entries.entries()) {
      expect(sha256(await readEntry(arc, entry))).toBe(exp.entries[i]!.sha256);
    }
  });

  it('TOC round-trip identik byte demi byte', async () => {
    const arc = await openFmfBytes(bytes);
    expect(bytesEqual(serializeToc(arc.root), arc.tocRaw)).toBe(true);
  });

  it('patch tanpa perubahan: isi tetap sama setelah dibuka ulang', async () => {
    const arc = await openFmfBytes(bytes);
    const out = await materializeOutput(arc, patchFmf(arc, [], exp.entries[0]!.time1));
    const arc2 = await openFmfBytes(out);
    const a = listEntries(arc.root);
    const b = listEntries(arc2.root);
    expect(b.map((x) => x.path)).toEqual(a.map((x) => x.path));
    for (let i = 0; i < a.length; i++) {
      expect(bytesEqual(await readEntry(arc2, b[i]!.entry), await readEntry(arc, a[i]!.entry))).toBe(true);
    }
  });

  it('patch: ganti 1 entri + tambah 1 entri; sisanya tidak berubah', async () => {
    const arc = await openFmfBytes(bytes);
    const newClub = new TextEncoder().encode('club.dat versi baru '.repeat(500));
    const newFile = new Uint8Array(200_000).map((_, i) => i % 251);
    const out = await materializeOutput(
      arc,
      patchFmf(arc, [
        { folder: 'synthetic/data', name: 'club', ext: '.dat', data: newClub },
        { folder: 'synthetic/data/sub', name: 'baru', ext: '.bin', data: newFile },
      ]),
    );
    const arc2 = await openFmfBytes(out);
    expect(arc2.flag).toBe(arc.flag);
    const byPath = new Map(listEntries(arc2.root).map((x) => [x.path, x.entry]));
    expect(bytesEqual(await readEntry(arc2, byPath.get('synthetic/data/club.dat')!), newClub)).toBe(true);
    expect(bytesEqual(await readEntry(arc2, byPath.get('synthetic/data/sub/baru.bin')!), newFile)).toBe(true);
    for (const e of exp.entries) {
      if (e.path === 'synthetic/data/club.dat') continue;
      expect(sha256(await readEntry(arc2, byPath.get(e.path)!))).toBe(e.sha256);
    }
    // Data lama tetap di tempatnya (pola tambal di ujung)
    expect(bytesEqual(out.subarray(26, 26 + arc.dataLength), bytes.subarray(26, 26 + arc.dataLength))).toBe(true);

    if (pythonAvailable) {
      // Arsip hasil TS harus bisa dibaca fmfio.py (acuan build yang terbukti jalan di game)
      const dir = mkdtempSync(join(tmpdir(), 'fmf-'));
      const file = join(dir, 'patched.bin');
      writeFileSync(file, out);
      const py = runPythonJson<{ flag: number; entries: { path: string; sha256: string }[] }>('read_fmf.py', [file]);
      expect(py.flag).toBe(arc.flag);
      const pyMap = new Map(py.entries.map((x) => [x.path, x.sha256]));
      expect(pyMap.get('synthetic/data/club.dat')).toBe(sha256(newClub));
      expect(pyMap.get('synthetic/data/sub/baru.bin')).toBe(sha256(newFile));
      expect(pyMap.size).toBe(exp.entries.length + 1);
    }
  });

  it('patch menolak folder yang tidak ada', async () => {
    const arc = await openFmfBytes(bytes);
    expect(() => patchFmf(arc, [{ folder: 'synthetic/tidak_ada', name: 'x', ext: '.bin', data: new Uint8Array(1) }])).toThrow(
      /Folder tidak ada/,
    );
  });
});

describe('zstd raw frame', () => {
  it.each([0, 1, 131072, 131073, 400_000])('panjang %i dapat didekompresi kembali', (n) => {
    const data = new Uint8Array(n).map((_, i) => (i * 31) & 255);
    expect(bytesEqual(zstdDecompress(zstdRawFrame(data), n), data)).toBe(true);
  });
  it('rangkaian [u32 + frame] bolak-balik', () => {
    const data = new Uint8Array(300_000).map((_, i) => i & 255);
    expect(bytesEqual(decodeLengthPrefixedFrames(encodeLengthPrefixedRawFrames(data)), data)).toBe(true);
  });
});

describe('arsip bersarang (prefix 8 byte + .fmf)', () => {
  it('memisahkan prefix dan membuka arsip di dalamnya', async () => {
    const prefix = new Uint8Array([0x03, 0x01, 0x63, 0x62, 0x64, 0x2e, 0x04, 0x00]); // 03 01 "cbd." 04 00
    const inner = readFixture('fmf', 'synthetic_flag3.fmf.bin');
    const parts = splitInnerArchive(concatBytes([prefix, inner]));
    expect(innerPrefixKind(parts.prefix)).toBe('dbc');
    const arc = await openFmfBytes(parts.archive);
    expect(arc.flag).toBe(3);
  });
  it('menolak data yang bukan arsip bersarang', () => {
    expect(() => splitInnerArchive(new Uint8Array(64))).toThrow();
  });
});

describe('validasi header', () => {
  it('menolak file yang bukan .fmf', async () => {
    await expect(openFmfBytes(new Uint8Array(100))).rejects.toThrow(/Bukan arsip/);
  });
  it('menolak file terlalu kecil', async () => {
    await expect(openFmfBytes(new Uint8Array(10))).rejects.toThrow(/terlalu kecil/);
  });
});
