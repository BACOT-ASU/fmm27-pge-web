import { writeU64 } from '../binary/le';
import { FMF_HEADER_SIZE, FMF_MAGIC } from '../fmf/openFmf';
import { cloneFolder, findFolder, serializeToc } from '../fmf/toc';
import type { FmfArchive, FmfEntry, FmfFolder } from '../fmf/types';
import { encodeLengthPrefixedRawFrames, zstdRawFrame } from '../zstd/zstd';

/**
 * Gabung wajah dari pictures_logos.fmf MODDER ke pictures_logos.fmf KITA.
 *
 * Struktur wajah (arsip modder 27.1, dicatat di research/log_sesi.md poin 25–26):
 *   pictures_logos/logos/normal/people/config.xml   <record from="custom/<N>" to="graphics/pictures/person/<UID>/portrait"/>
 *   pictures_logos/logos/normal/people/custom/<N>.* PNG wajah
 * Pola sama dengan logo klub (logos/normal/clubs). 27.1.0 ori tidak punya folder people.
 *
 * Isi PNG TIDAK disalin ke memori: keluaran merujuk rentang byte di arsip modder (sumber 1),
 * data lama arsip kita tetap rentang di sumber 0 (pola "tambal di ujung", sama dengan patchFmf).
 * Status: struktur config mengikuti arsip modder (LIKELY); hasil belum diuji di game.
 */

export const FACES_FOLDER = 'pictures_logos/logos/normal/people';

export interface FaceMapRow {
  /** Nama file di arsip modder relatif terhadap folder people, mis. "custom/3". */
  from: string;
  /** UID orang di database kita. */
  toUid: number;
}

/** Rentang dari salah satu sumber: 0 = arsip kita, 1 = arsip modder. */
export type SourcedPart = Uint8Array | { source: 0 | 1; start: number; end: number };

export interface MergeFacesResult {
  parts: SourcedPart[];
  size: number;
  added: number;
  /** Baris peta yang file-nya tidak ada di arsip modder. */
  missing: string[];
  /** UID yang muncul lebih dari sekali di peta (hanya yang pertama dipakai). */
  duplicateUids: number[];
}

/** Baca CSV hasil scripts/map_faces_v2710.py (kolom from,to_uid,...). Baris tanpa to_uid dilewati. */
export function parseFaceMapCsv(text: string): FaceMapRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (!lines.length) return [];
  const head = lines[0]!.split(',');
  const iFrom = head.indexOf('from');
  const iTo = head.indexOf('to_uid');
  if (iFrom < 0 || iTo < 0) throw new Error('CSV peta wajah harus punya kolom "from" dan "to_uid"');
  const rows: FaceMapRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(',');
    const to = (cols[iTo] ?? '').trim();
    const from = (cols[iFrom] ?? '').trim();
    if (!to || !from || !/^\d+$/.test(to)) continue;
    rows.push({ from, toUid: Number(to) });
  }
  return rows;
}

/** config.xml wajah dengan format yang sama dengan arsip modder (tab, LF). */
export function buildFacesConfigXml(uids: readonly number[]): Uint8Array {
  const lines = ['<?xml version="1.0" encoding="utf-8"?>', '<record>', '\t<boolean id="preload" value="false"/>', '\t<list id="maps">'];
  for (const u of uids) lines.push(`\t\t<record from="custom/${u}" to="graphics/pictures/person/${u}/portrait"/>`);
  lines.push('\t</list>', '</record>', '');
  return new TextEncoder().encode(lines.join('\n'));
}

function ensureFolder(root: FmfFolder, path: string): FmfFolder {
  const parts = path.split('/');
  if (parts[0] !== root.name) throw new Error(`Akar arsip "${root.name}" tidak cocok dengan ${path}`);
  let f = root;
  for (const name of parts.slice(1)) {
    let next = f.subs.find((s) => s.name === name);
    if (!next) {
      next = { name, files: [], subs: [] };
      f.subs.push(next);
    }
    f = next;
  }
  return f;
}

function anyEntry(f: FmfFolder): FmfEntry | undefined {
  if (f.files[0]) return f.files[0];
  for (const s of f.subs) {
    const e = anyEntry(s);
    if (e) return e;
  }
  return undefined;
}

export function mergeFacesIntoFmf(target: FmfArchive, donor: FmfArchive, rows: readonly FaceMapRow[]): MergeFacesResult {
  if (target.flag !== donor.flag) throw new Error(`flag arsip berbeda (kita ${target.flag}, modder ${donor.flag})`);
  const donorPeople = findFolder(donor.root, FACES_FOLDER);
  if (!donorPeople) throw new Error(`Folder ${FACES_FOLDER} tidak ada di arsip modder`);
  const root = cloneFolder(target.root);
  const people = ensureFolder(root, FACES_FOLDER);
  const custom = ensureFolder(root, `${FACES_FOLDER}/custom`);
  const ref = anyEntry(target.root) ?? { time1: 0n, time2: 0n };

  // file yang sudah ada di folder custom kita: diganti (TOC menunjuk data baru)
  const existing = new Map(custom.files.map((e) => [e.name, e]));
  const parts: SourcedPart[] = [];
  let pos = target.dataLength;
  const used = new Set<number>();
  const missing: string[] = [];
  const duplicateUids: number[] = [];
  const order: number[] = [];

  for (const r of rows) {
    if (used.has(r.toUid)) {
      duplicateUids.push(r.toUid);
      continue;
    }
    const slash = r.from.lastIndexOf('/');
    const sub = slash >= 0 ? findFolder(donorPeople, `${donorPeople.name}/${r.from.slice(0, slash)}`) : donorPeople;
    const base = slash >= 0 ? r.from.slice(slash + 1) : r.from;
    const src = sub?.files.find((e) => e.name === base);
    if (!src) {
      missing.push(r.from);
      continue;
    }
    used.add(r.toUid);
    order.push(r.toUid);
    const name = String(r.toUid);
    let e = existing.get(name);
    if (!e) {
      e = { name, ext: src.ext, offset: 0, storedSize: 0, rawSize: 0, time1: src.time1 ?? ref.time1, time2: src.time2 ?? ref.time2 };
      custom.files.push(e);
      existing.set(name, e);
    }
    e.ext = src.ext;
    e.offset = pos;
    e.storedSize = src.storedSize;
    e.rawSize = src.rawSize;
    parts.push({ source: 1, start: FMF_HEADER_SIZE + src.offset, end: FMF_HEADER_SIZE + src.offset + src.storedSize });
    pos += src.storedSize;
  }

  // config.xml baru (gabung dengan record lama kalau arsip kita sudah punya folder people)
  const cfg = buildFacesConfigXml(order);
  const stored = target.flag === 0 ? cfg : zstdRawFrame(cfg);
  let ce = people.files.find((e) => e.name === 'config' && e.ext === '.xml');
  if (!ce) {
    ce = { name: 'config', ext: '.xml', offset: 0, storedSize: 0, rawSize: 0, time1: ref.time1, time2: ref.time2 };
    people.files.push(ce);
  }
  ce.offset = pos;
  ce.storedSize = stored.length;
  ce.rawSize = cfg.length;
  parts.push(stored);
  pos += stored.length;

  const toc = serializeToc(root);
  const tocBlock = target.flag === 0 ? encodeLengthPrefixedRawFrames(toc) : zstdRawFrame(toc);
  const header = new Uint8Array(target.header);
  writeU64(new DataView(header.buffer), 9, 17 + pos);
  const all: SourcedPart[] = [
    header,
    { source: 0, start: FMF_HEADER_SIZE, end: FMF_HEADER_SIZE + target.dataLength },
    ...parts,
    new Uint8Array(FMF_MAGIC),
    tocBlock,
  ];
  return { parts: all, size: FMF_HEADER_SIZE + pos + FMF_MAGIC.length + tocBlock.length, added: order.length, missing, duplicateUids };
}

/** Rakit keluaran ke satu buffer (untuk tes / arsip kecil). */
export async function materializeSourcedParts(sources: readonly FmfArchive[], parts: readonly SourcedPart[], size: number): Promise<Uint8Array> {
  const buf = new Uint8Array(size);
  let q = 0;
  for (const p of parts) {
    const b = p instanceof Uint8Array ? p : await sources[p.source]!.source.read(p.start, p.end);
    buf.set(b, q);
    q += b.length;
  }
  if (q !== size) throw new Error(`Ukuran keluaran ${q}, seharusnya ${size}`);
  return buf;
}
