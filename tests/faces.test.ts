import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeU64 } from '../src/core/binary/le';
import { FACES_FOLDER, buildFacesConfigXml, materializeSourcedParts, mergeFacesIntoFmf, parseFaceMapCsv } from '../src/core/faces/mergeFaces';
import { FMF_MAGIC, findEntry, findFolder, openFmfBytes, readEntry, serializeToc } from '../src/core/fmf';
import type { FmfFolder } from '../src/core/fmf';
import { encodeLengthPrefixedRawFrames } from '../src/core/zstd/zstd';
import { readFileSync } from 'node:fs';
import { ROOT, pythonAvailable, samplePath } from './helpers';

const te = new TextEncoder();
const td = new TextDecoder();

/** Arsip flag 0 sintetis: daftar [path, isi]. */
function buildFmf(rootName: string, files: [string, Uint8Array][]): Uint8Array {
  const root: FmfFolder = { name: rootName, files: [], subs: [] };
  const data: Uint8Array[] = [];
  let pos = 0;
  for (const [path, body] of files) {
    const parts = path.split('/');
    let f = root;
    for (const n of parts.slice(1, -1)) {
      let s = f.subs.find((x) => x.name === n);
      if (!s) {
        s = { name: n, files: [], subs: [] };
        f.subs.push(s);
      }
      f = s;
    }
    const leaf = parts[parts.length - 1]!;
    const dot = leaf.lastIndexOf('.');
    f.files.push({ name: leaf.slice(0, dot), ext: leaf.slice(dot), offset: pos, storedSize: body.length, rawSize: body.length, time1: 1763000000n, time2: 1763000000n });
    data.push(body);
    pos += body.length;
  }
  const toc = encodeLengthPrefixedRawFrames(serializeToc(root));
  const header = new Uint8Array(26);
  header.set(FMF_MAGIC, 0);
  const dv = new DataView(header.buffer);
  writeU64(dv, 9, 17 + pos);
  writeU64(dv, 17, 17);
  header[25] = 0;
  const out = new Uint8Array(26 + pos + FMF_MAGIC.length + toc.length);
  let q = 0;
  for (const b of [header, ...data, new Uint8Array(FMF_MAGIC), toc]) {
    out.set(b, q);
    q += b.length;
  }
  return out;
}

const png = (s: string) => te.encode(`PNG-${s}`);

describe('mergeFacesIntoFmf', () => {
  it('menyalin PNG dari arsip modder, memetakan ke UID kita, dan menulis config.xml baru', async () => {
    const ours = await openFmfBytes(buildFmf('pictures_logos', [
      ['pictures_logos/logos/normal/clubs/config.xml', te.encode('<clubs/>')],
      ['pictures_logos/logos/normal/clubs/custom/7.png', png('club7')],
    ]));
    const mod = await openFmfBytes(buildFmf('pictures_logos', [
      ['pictures_logos/logos/normal/people/config.xml', te.encode('<modder/>')],
      ['pictures_logos/logos/normal/people/custom/3.png', png('face3')],
      ['pictures_logos/logos/normal/people/custom/44.png', png('face44')],
      ['pictures_logos/logos/normal/people/custom/900.png', png('face900')],
    ]));
    const rows = parseFaceMapCsv('from,to_uid,modder_uid,nama,status\ncustom/3,3,3,A,uid_sama\ncustom/44,2100000001,44,B,cocok_nama_negara\ncustom/999,5,999,C,x\ncustom/900,,900,D,tidak_ada_di_build\ncustom/900,3,900,E,dup\n');
    expect(rows).toHaveLength(4);
    const prog: number[] = [];
    const res = await mergeFacesIntoFmf(ours, mod, rows, (d) => prog.push(d));
    expect(prog.at(-1)).toBe(rows.length);
    expect(res.added).toBe(2);
    expect(res.missing).toEqual(['person/normal:custom/999']);
    expect(res.duplicateUids).toEqual([3]);

    const bytes = await materializeSourcedParts([ours, mod], res.parts, res.size);
    const out = await openFmfBytes(bytes);
    // data lama tetap terbaca
    expect(td.decode(await readEntry(out, findEntry(out.root, 'pictures_logos/logos/normal/clubs/custom/7.png')!.entry))).toBe('PNG-club7');
    // wajah dengan nama UID kita
    expect(td.decode(await readEntry(out, findEntry(out.root, `${FACES_FOLDER}/custom/3.png`)!.entry))).toBe('PNG-face3');
    expect(td.decode(await readEntry(out, findEntry(out.root, `${FACES_FOLDER}/custom/2100000001.png`)!.entry))).toBe('PNG-face44');
    expect(findFolder(out.root, `${FACES_FOLDER}/custom`)!.files).toHaveLength(2);
    const cfg = td.decode(await readEntry(out, findEntry(out.root, `${FACES_FOLDER}/config.xml`)!.entry));
    expect(cfg).toBe(td.decode(buildFacesConfigXml([3, 2100000001])));
    expect(cfg).toContain('<record from="custom/2100000001" to="graphics/pictures/person/2100000001/portrait"/>');

    if (pythonAvailable) {
      // golden: arsip hasil dibaca scripts/fmfio.py
      const dir = mkdtempSync(join(tmpdir(), 'faces-'));
      const p = join(dir, 'out.fmf');
      writeFileSync(p, bytes);
      const py = `import sys; sys.path.insert(0, ${JSON.stringify(join(ROOT, 'scripts'))}); import fmfio
f, r, _ = fmfio.read(open(${JSON.stringify(p)}, 'rb').read())
print(sorted(path for path, _ in fmfio.walk(r)))
print(fmfio.get(dict(fmfio.walk(r))['pictures_logos/logos/normal/people/custom/2100000001.png']).decode())`;
      const outPy = execFileSync('python3', ['-c', py], { encoding: 'utf-8' });
      expect(outPy).toContain("'pictures_logos/logos/normal/people/config.xml'");
      expect(outPy).toContain('PNG-face44');
    }
  });

  it('logo klub: baris config lama untuk UID diganti custom/<UID>, baris lain tetap; CSV gabungan', async () => {
    const cfgOurs = '\uFEFF<?xml version="1.0" ?>\n<record>\n\t<list id="maps">\n\t\t<record from="eng/x/club7" to="graphics/pictures/club/7/logo"/>\n\t\t<record from="eng/x/club8" to="graphics/pictures/club/8/logo"/>\n\t</list>\n</record>\n';
    const ours = await openFmfBytes(buildFmf('pictures_logos', [
      ['pictures_logos/logos/normal/clubs/config.xml', te.encode(cfgOurs)],
      ['pictures_logos/logos/normal/clubs/eng/x/club7.png', png('fake7')],
    ]));
    const mod = await openFmfBytes(buildFmf('pictures_logos', [
      ['pictures_logos/logos/normal/clubs/config.xml', te.encode('<m/>')],
      ['pictures_logos/logos/normal/clubs/custom/7.png', png('real7')],
      ['pictures_logos/logos/normal/people/config.xml', te.encode('<m/>')],
      ['pictures_logos/logos/normal/people/custom/3.png', png('face3')],
    ]));
    const rows = parseFaceMapCsv('jenis,ukuran,from,to_uid\nclub,normal,custom/7,7\nperson,normal,custom/3,3\n');
    const res = await mergeFacesIntoFmf(ours, mod, rows);
    expect(res.addedBy).toEqual({ 'club/normal': 1, 'person/normal': 1 });
    const out = await openFmfBytes(await materializeSourcedParts([ours, mod], res.parts, res.size));
    const cfgRaw = await readEntry(out, findEntry(out.root, 'pictures_logos/logos/normal/clubs/config.xml')!.entry);
    expect([...cfgRaw.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const cfg = td.decode(cfgRaw);
    expect(cfg).not.toContain('eng/x/club7');
    expect(cfg).toContain('<record from="eng/x/club8" to="graphics/pictures/club/8/logo"/>');
    expect(cfg).toContain('<record from="custom/7" to="graphics/pictures/club/7/logo"/>');
    expect(td.decode(await readEntry(out, findEntry(out.root, 'pictures_logos/logos/normal/clubs/custom/7.png')!.entry))).toBe('PNG-real7');
    expect(td.decode(await readEntry(out, findEntry(out.root, 'pictures_logos/logos/normal/people/custom/3.png')!.entry))).toBe('PNG-face3');
  });

  it('menolak arsip modder tanpa folder people', async () => {
    const a = await openFmfBytes(buildFmf('pictures_logos', [['pictures_logos/x/a.png', png('a')]]));
    await expect(mergeFacesIntoFmf(a, a, [{ from: 'custom/1', toUid: 1 }])).rejects.toThrow(/tidak ada di arsip modder/);
  });

  const ori = samplePath('v2710/pictures_logos.fmf');
  it.skipIf(!ori || !pythonAvailable)('pictures_logos 27.1.0 ori + wajah sintetis: dibaca ulang fmfio.py, logo lama tetap', async () => {
    const ours = await openFmfBytes(new Uint8Array(readFileSync(ori!)));
    const mod = await openFmfBytes(buildFmf('pictures_logos', [
      ['pictures_logos/logos/normal/people/config.xml', te.encode('<m/>')],
      ['pictures_logos/logos/normal/people/custom/3.png', png('face3')],
    ]));
    const res = await mergeFacesIntoFmf(ours, mod, [{ from: 'custom/3', toUid: 2100000001 }]);
    const bytes = await materializeSourcedParts([ours, mod], res.parts, res.size);
    const dir = mkdtempSync(join(tmpdir(), 'faces-'));
    const p = join(dir, 'out.fmf');
    writeFileSync(p, bytes);
    const py = `import sys; sys.path.insert(0, ${JSON.stringify(join(ROOT, 'scripts'))}); import fmfio
f, r, _ = fmfio.read(open(${JSON.stringify(p)}, 'rb').read()); rows = dict(fmfio.walk(r))
print(len(rows)); print(fmfio.get(rows['pictures_logos/logos/normal/people/custom/2100000001.png']).decode())
print(len(fmfio.get(rows['pictures_logos/logos/normal/clubs/config.xml'])))`;
    const out = execFileSync('python3', ['-c', py], { encoding: 'utf-8' }).trim().split('\n');
    expect(Number(out[0])).toBe(2006 + 2);
    expect(out[1]).toBe('PNG-face3');
    expect(Number(out[2])).toBeGreaterThan(1000);
  });

  const built = samplePath('out_v2710/pictures_logos.fmf');
  const peta = samplePath('out_v2710/peta_aset_27.1.0.csv');
  it.skipIf(!built || !peta || !pythonAvailable)('skala penuh: pictures_logos build + peta aset asli (111 ribu baris) + modder sintetis', async () => {
    const rows = parseFaceMapCsv(readFileSync(peta!, 'utf-8'));
    const files: [string, Uint8Array][] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      const folder = r.kind === 'person' ? 'pictures_logos/logos/normal/people' : `pictures_logos/logos/${r.size}/${r.kind === 'club' ? 'clubs' : 'comps'}`;
      const path = `${folder}/${r.from}.png`;
      if (seen.has(path)) continue;
      seen.add(path);
      files.push([path, png(r.from)]);
    }
    for (const f of ['normal/people', 'normal/clubs', 'small/clubs', 'normal/comps', 'small/comps']) files.push([`pictures_logos/logos/${f}/config.xml`, te.encode('<m/>')]);
    const mod = await openFmfBytes(buildFmf('pictures_logos', files));
    const ours = await openFmfBytes(new Uint8Array(readFileSync(built!)));
    const t0 = Date.now();
    const res = await mergeFacesIntoFmf(ours, mod, rows);
    const ms = Date.now() - t0;
    expect(res.missing).toEqual([]);
    expect(ms).toBeLessThan(20000);
    const bytes = await materializeSourcedParts([ours, mod], res.parts, res.size);
    // fmfio.py hanya membaca TOC satu frame; TOC sebesar ini ditulis sebagai rangkaian [u32 + frame raw]
    // (format yang sama dengan B6/B7b, VERIFIED diterima game), jadi diperiksa dengan pembaca TS.
    const out = await openFmfBytes(bytes);
    let n = 0;
    const walk = (f: FmfFolder) => { n += f.files.length; f.subs.forEach(walk); };
    walk(out.root);
    expect(n).toBeGreaterThan(2006 + 100000);
    const c = td.decode(await readEntry(out, findEntry(out.root, 'pictures_logos/logos/normal/clubs/config.xml')!.entry));
    expect((c.match(/<record from=/g) ?? []).length).toBeGreaterThan(11900);
    expect(c.split('from="custom/2000700001"').length - 1).toBe(1); // logo Bacad (klon) tetap ada
    const sample = rows.find((r) => r.kind === 'club' && r.size === 'small')!;
    expect(td.decode(await readEntry(out, findEntry(out.root, `pictures_logos/logos/small/clubs/custom/${sample.toUid}.png`)!.entry))).toBe(`PNG-${sample.from}`);
    console.log('gabung', rows.length, 'baris dalam', ms, 'ms;', res.addedBy);
  }, 120000);
});
