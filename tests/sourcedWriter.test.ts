import { describe, expect, it } from 'vitest';
import { writeSourcedParts, type OutputPart } from '../src/platform/sourcedWriter';

function rnd(n: number, seed: number): Uint8Array {
  const a = new Uint8Array(n);
  let x = seed;
  for (let i = 0; i < n; i++) {
    x = (x * 1103515245 + 12345) >>> 0;
    a[i] = x >>> 24;
  }
  return a;
}

describe('writeSourcedParts (gabung multi-sumber berurutan per jendela)', () => {
  it('hasil sama dengan penggabungan langsung, termasuk rentang acak & lintas jendela', async () => {
    const s0 = rnd(5000, 1);
    const s1 = rnd(20000, 2);
    const parts: OutputPart[] = [new Uint8Array([1, 2, 3]), { source: 0, start: 0, end: 5000 }];
    let x = 7;
    for (let i = 0; i < 300; i++) {
      x = (x * 1103515245 + 12345) >>> 0;
      const a = x % 19000;
      parts.push({ source: 1, start: a, end: a + 1 + (x % 900) });
      if (i % 50 === 0) parts.push(rnd(37, i));
    }
    const expected: number[] = [];
    for (const p of parts) {
      const b = p instanceof Uint8Array ? p : (p.source === 0 ? s0 : s1).subarray(p.start, p.end);
      expected.push(...b);
    }
    const got: number[] = [];
    const prog: number[] = [];
    const n = await writeSourcedParts(parts, [new Blob([s0]), new Blob([s1])], { write: async (c) => void got.push(...c) }, (w) => prog.push(w), {
      chunkSize: 1000,
      windowSize: 777,
    });
    expect(n).toBe(expected.length);
    expect(Uint8Array.from(got)).toEqual(Uint8Array.from(expected));
    expect(prog.at(-1)).toBe(expected.length);
  });

  it('galat jelas kalau rentang melewati ukuran sumber', async () => {
    await expect(writeSourcedParts([{ source: 0, start: 0, end: 10 }], [new Blob([new Uint8Array(5)])], { write: async () => undefined })).rejects.toThrow(/melewati/);
  });
});
