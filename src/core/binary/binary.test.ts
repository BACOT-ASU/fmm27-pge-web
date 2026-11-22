import { describe, expect, it } from 'vitest';
import { byteSourceFromBytes } from './byteSource';
import { formatBytes, formatInt } from './formatBytes';

describe('byteSourceFromBytes', () => {
  it('membaca rentang yang diminta', async () => {
    const src = byteSourceFromBytes(new Uint8Array([1, 2, 3, 4, 5]));
    expect(src.size).toBe(5);
    expect(Array.from(await src.read(1, 4))).toEqual([2, 3, 4]);
  });
  it('menolak rentang di luar batas', () => {
    const src = byteSourceFromBytes(new Uint8Array(3));
    expect(() => src.read(0, 4)).toThrow(RangeError);
    expect(() => src.read(2, 1)).toThrow(RangeError);
  });
});

describe('formatBytes / formatInt', () => {
  it('memformat ukuran file FMM27 yang dikenal', () => {
    expect(formatBytes(512)).toBe('512 byte');
    expect(formatBytes(149_841_844)).toBe('143 MB');
    expect(formatBytes(1_818_029_973)).toBe('1,7 GB');
    expect(formatInt(149_841_844)).toBe('149.841.844');
  });
});

describe('core bebas API browser', () => {
  it('berjalan di Node tanpa window/document', () => {
    expect(typeof (globalThis as Record<string, unknown>).window).toBe('undefined');
    expect(typeof (globalThis as Record<string, unknown>).document).toBe('undefined');
  });
});
