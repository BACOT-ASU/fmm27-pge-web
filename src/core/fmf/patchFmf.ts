import { writeU64 } from '../binary/le';
import { encodeLengthPrefixedRawFrames, zstdRawFrame } from '../zstd/zstd';
import { FMF_HEADER_SIZE, FMF_MAGIC } from './openFmf';
import { cloneFolder, findFolder, serializeToc } from './toc';
import type { FmfArchive, FmfOutput, OutputPart } from './types';

export interface FmfChange {
  /** Jalur folder lengkap, mis. "pictures_logos/logos/normal/clubs/custom". */
  folder: string;
  name: string;
  ext: string;
  /** Isi asli (belum dikompresi). */
  data: Uint8Array;
}

/**
 * Tulis arsip baru dengan pola "tambal di ujung" (B6/B7b):
 * header baru + data lama apa adanya + isi yang berubah/baru + magic + TOC baru.
 * Entri yang diganti tetap ada di data lama tetapi tidak lagi dirujuk TOC.
 *
 * - flag 0: isi ditulis mentah; TOC = rangkaian [u32 + frame raw]. VERIFIED (logo).
 * - flag 3: isi dibungkus frame zstd raw; TOC = frame raw. HYPOTHESIS (belum diuji di game).
 *
 * Arsip asli tidak diubah. Data lama dikembalikan sebagai rentang sumber, bukan salinan.
 */
export function patchFmf(arc: FmfArchive, changes: readonly FmfChange[], now = Math.floor(Date.now() / 1000)): FmfOutput {
  const root = cloneFolder(arc.root);
  const extra: Uint8Array[] = [];
  let pos = arc.dataLength;
  for (const c of changes) {
    const f = findFolder(root, c.folder);
    if (!f) throw new Error(`Folder tidak ada di arsip: ${c.folder}`);
    const stored = arc.flag === 0 ? c.data : zstdRawFrame(c.data);
    let e = f.files.find((x) => x.name === c.name && x.ext === c.ext);
    if (!e) {
      e = { name: c.name, ext: c.ext, offset: 0, storedSize: 0, rawSize: 0, time1: now, time2: now };
      f.files.push(e);
    }
    e.offset = pos;
    e.storedSize = stored.length;
    e.rawSize = c.data.length;
    e.time1 = now;
    e.time2 = now;
    extra.push(stored);
    pos += stored.length;
  }
  const toc = serializeToc(root);
  const tocBlock = arc.flag === 0 ? encodeLengthPrefixedRawFrames(toc) : zstdRawFrame(toc);
  const header = new Uint8Array(arc.header);
  writeU64(new DataView(header.buffer), 9, 17 + pos);
  const parts: OutputPart[] = [
    header,
    { start: FMF_HEADER_SIZE, end: FMF_HEADER_SIZE + arc.dataLength },
    ...extra,
    new Uint8Array(FMF_MAGIC),
    tocBlock,
  ];
  return { parts, size: FMF_HEADER_SIZE + pos + FMF_MAGIC.length + tocBlock.length };
}

/** Rakit keluaran menjadi satu buffer (hanya untuk arsip kecil/tes). */
export async function materializeOutput(arc: FmfArchive, out: FmfOutput): Promise<Uint8Array> {
  const buf = new Uint8Array(out.size);
  let q = 0;
  for (const part of out.parts) {
    const b = part instanceof Uint8Array ? part : await arc.source.read(part.start, part.end);
    buf.set(b, q);
    q += b.length;
  }
  if (q !== out.size) throw new Error(`Ukuran keluaran ${q}, seharusnya ${out.size}`);
  return buf;
}
