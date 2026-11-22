import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { byteSourceFromBytes } from '../binary/byteSource';
import { Sha256, sha256Hex, sha256OfSource } from './sha256';

const node = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');

describe('sha256', () => {
  it('vektor uji standar', () => {
    expect(sha256Hex(new Uint8Array())).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex(new TextEncoder().encode('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it.each([1, 55, 56, 63, 64, 65, 119, 120, 1000, 100_003])('sama dengan node:crypto untuk %i byte', (n) => {
    const b = new Uint8Array(n).map((_, i) => (i * 7 + 3) & 255);
    expect(sha256Hex(b)).toBe(node(b));
  });
  it('update bertahap = sekaligus', async () => {
    const b = new Uint8Array(1_000_001).map((_, i) => (i * 13) & 255);
    const h = new Sha256();
    for (let p = 0; p < b.length; p += 777) h.update(b.subarray(p, p + 777));
    expect(h.digestHex()).toBe(node(b));
    expect(await sha256OfSource(byteSourceFromBytes(b), undefined, 65_537)).toBe(node(b));
  });
});
