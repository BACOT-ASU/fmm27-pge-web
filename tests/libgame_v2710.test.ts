import { openSync, readSync, fstatSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ByteSource } from '../src/core/binary/byteSource';
import { readLibgameTables } from '../src/core/formats/libgame/libgameTables';
import { samplePath } from './helpers';

function fileSource(path: string): ByteSource {
  const fd = openSync(path, 'r');
  const size = fstatSync(fd).size;
  return {
    size,
    async read(start, end) {
      const b = Buffer.alloc(end - start);
      readSync(fd, b, 0, end - start, start);
      return new Uint8Array(b);
    },
  };
}

const ori = samplePath('v2710/libgame.so');
const mod = samplePath('out_v2710/libgame.so');
describe('libgame.so 27.1.0', () => {
  it.skipIf(!ori)('ori: build 27.1.0 dikenali, Wales ada, Indonesia tidak', async () => {
    const t = await readLibgameTables(fileSource(ori!));
    expect(t.build.label).toBe('27.1.0');
    expect(t.playableNations).toHaveLength(28);
    expect(t.playableNations).toContain(175);
    expect(t.playableNations).not.toContain(58);
    expect(t.deepestLeagues).toHaveLength(28);
    expect(t.deepestLeagues).toContain(29236871);
  });
  it.skipIf(!mod)('hasil tambal: Indonesia (58) & Liga Nusantara (41042746) terdaftar', async () => {
    const t = await readLibgameTables(fileSource(mod!));
    expect(t.playableNations).toContain(58);
    expect(t.deepestLeagues).toContain(41042746);
    expect(t.deepestLeagues).not.toContain(29236871);
  });
});
