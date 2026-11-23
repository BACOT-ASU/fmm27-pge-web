import { writeU64 } from '../binary/le';
import { FMF_HEADER_SIZE, FMF_MAGIC } from '../fmf/openFmf';
import { cloneFolder, findFolder, serializeToc } from '../fmf/toc';
import type { FmfArchive, FmfEntry, FmfFolder } from '../fmf/types';
import { encodeLengthPrefixedRawFrames, zstdRawFrame } from '../zstd/zstd';

/**
 * Gabung aset (wajah, logo klub/timnas, logo kompetisi) dari pictures_logos.fmf MODDER ke pictures_logos.fmf KITA.
 *
 * Struktur (arsip modder 27.1, research/log_sesi.md poin 25–26, 36):
 *   pictures_logos/logos/normal/people/config.xml        from="custom/<N>" to="graphics/pictures/person/<UID>/portrait"
 *   pictures_logos/logos/{normal,small}/clubs/config.xml from="custom/<N>" to="graphics/pictures/club/<UID>/{logo,icon}"
 *   pictures_logos/logos/{normal,small}/comps/config.xml from="custom/<N>" to="graphics/pictures/comp/<UID>/{logo,icon}"
 *   PNG di <folder>/custom/<N>.*
 * Arsip kita: PNG ditulis ke <folder>/custom/<UID>; config.xml: baris lama untuk UID itu dibuang, baris custom/<UID> ditambah
 * (people: config dibuat bila belum ada). Baris config lain tidak disentuh.
 *
 * Isi PNG TIDAK disalin ke memori: keluaran merujuk rentang byte di arsip modder (sumber 1), data lama arsip kita
 * tetap rentang di sumber 0 (pola "tambal di ujung", sama dengan patchFmf). Status: LIKELY; belum diuji di game.
 */

export const FACES_FOLDER = 'pictures_logos/logos/normal/people';
const LOGO_BASE = 'pictures_logos/logos';

export type AssetKind = 'person' | 'club' | 'comp';
export type AssetSize = 'normal' | 'small';

export interface FaceMapRow {
  /** Nama file di arsip modder relatif terhadap folder aset, mis. "custom/3". */
  from: string;
  /** UID orang/klub/kompetisi di database kita. */
  toUid: number;
  kind?: AssetKind;
  size?: AssetSize;
}

/** Rentang dari salah satu sumber: 0 = arsip kita, 1 = arsip modder. */
export type SourcedPart = Uint8Array | { source: 0 | 1; start: number; end: number };

export interface MergeFacesResult {
  parts: SourcedPart[];
  size: number;
  added: number;
  /** Jumlah per kelompok, mis. {"person/normal": 85000, "club/small": 11906}. */
  addedBy: Record<string, number>;
  /** Baris peta yang file-nya tidak ada di arsip modder. */
  missing: string[];
  /** UID yang muncul lebih dari sekali dalam satu kelompok (hanya yang pertama dipakai). */
  duplicateUids: number[];
}

/**
 * Baca CSV peta: format lama (from,to_uid,...) = wajah, atau format gabungan (jenis,ukuran,from,to_uid)
 * dari scripts/map_logos_v2710.py. Baris tanpa to_uid dilewati.
 */
export function parseFaceMapCsv(text: string): FaceMapRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (!lines.length) return [];
  const head = lines[0]!.replace(/^\uFEFF/, '').split(',');
  const iFrom = head.indexOf('from');
  const iTo = head.indexOf('to_uid');
  const iKind = head.indexOf('jenis');
  const iSize = head.indexOf('ukuran');
  if (iFrom < 0 || iTo < 0) throw new Error('CSV peta harus punya kolom "from" dan "to_uid"');
  const rows: FaceMapRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(',');
    const to = (cols[iTo] ?? '').trim();
    const from = (cols[iFrom] ?? '').trim();
    if (!to || !from || !/^\d+$/.test(to)) continue;
    const kind = (iKind >= 0 ? cols[iKind]?.trim() : 'person') as AssetKind;
    const size = (iSize >= 0 ? cols[iSize]?.trim() : 'normal') as AssetSize;
    if (!['person', 'club', 'comp'].includes(kind) || !['normal', 'small'].includes(size)) continue;
    rows.push({ from, toUid: Number(to), kind, size });
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

function groupFolder(kind: AssetKind, size: AssetSize): string {
  if (kind === 'person') return FACES_FOLDER;
  return `${LOGO_BASE}/${size}/${kind === 'club' ? 'clubs' : 'comps'}`;
}

function toPath(kind: AssetKind, size: AssetSize, uid: number): string {
  if (kind === 'person') return `graphics/pictures/person/${uid}/portrait`;
  return `graphics/pictures/${kind}/${uid}/${size === 'normal' ? 'logo' : 'icon'}`;
}

/** Ganti baris config untuk UID yang diberikan (sekali jalan, tanpa regex per baris). */
export function editAssetConfig(text: string, kind: AssetKind, size: AssetSize, uids: readonly number[]): string {
  const set = new Set(uids.map((u) => toPath(kind, size, u)));
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const kept = lines.filter((l) => {
    const m = /to="([^"]+)"/.exec(l);
    return !(m && l.includes('<record from=') && set.has(m[1]!));
  });
  const end = kept.findIndex((l) => l.trim() === '</list>');
  if (end < 0) throw new Error('config.xml tidak dikenali (tidak ada </list>)');
  const add = uids.map((u) => `\t\t<record from="custom/${u}" to="${toPath(kind, size, u)}"/>`);
  return [...kept.slice(0, end), ...add, ...kept.slice(end)].join(nl);
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

/** Progres langkah pencocokan: (baris selesai, total baris). */
export type MergeProgress = (done: number, total: number) => void;

const yieldToUi = () => new Promise<void>((r) => setTimeout(r, 0));

export async function mergeFacesIntoFmf(
  target: FmfArchive,
  donor: FmfArchive,
  rows: readonly FaceMapRow[],
  onProgress?: MergeProgress,
): Promise<MergeFacesResult> {
  if (target.flag !== donor.flag) throw new Error(`flag arsip berbeda (kita ${target.flag}, modder ${donor.flag})`);
  const root = cloneFolder(target.root);
  const ref = anyEntry(target.root) ?? { time1: 0n, time2: 0n };
  const td = new TextDecoder();

  // kelompokkan baris per (jenis, ukuran)
  const groups = new Map<string, FaceMapRow[]>();
  for (const r of rows) {
    const k = `${r.kind ?? 'person'}/${r.size ?? 'normal'}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  for (const k of groups.keys()) {
    const [kind, size] = k.split('/') as [AssetKind, AssetSize];
    if (!findFolder(donor.root, groupFolder(kind, size))) throw new Error(`Folder ${groupFolder(kind, size)} tidak ada di arsip modder`);
  }

  const parts: SourcedPart[] = [];
  let pos = target.dataLength;
  const missing: string[] = [];
  const duplicateUids: number[] = [];
  const addedBy: Record<string, number> = {};
  let done = 0;
  let added = 0;

  for (const [k, list] of groups) {
    const [kind, size] = k.split('/') as [AssetKind, AssetSize];
    const folderPath = groupFolder(kind, size);
    const donorFolder = findFolder(donor.root, folderPath)!;
    // indeks file modder: "<subfolder>/<nama>" -> entri (sekali bangun, bukan cari linear per baris)
    const donorIndex = new Map<string, FmfEntry>();
    const indexFolder = (f: FmfFolder, prefix: string) => {
      for (const e of f.files) donorIndex.set(prefix + e.name, e);
      for (const s of f.subs) indexFolder(s, `${prefix}${s.name}/`);
    };
    indexFolder(donorFolder, '');
    const own = ensureFolder(root, folderPath);
    const custom = ensureFolder(root, `${folderPath}/custom`);
    const existing = new Map(custom.files.map((e) => [e.name, e]));
    const used = new Set<number>();
    const order: number[] = [];

    for (const r of list) {
      if (++done % 2000 === 0) {
        onProgress?.(done, rows.length);
        await yieldToUi();
      }
      if (used.has(r.toUid)) {
        duplicateUids.push(r.toUid);
        continue;
      }
      const src = donorIndex.get(r.from);
      if (!src) {
        missing.push(`${k}:${r.from}`);
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

    // config.xml kelompok ini
    let ce = own.files.find((e) => e.name === 'config' && e.ext === '.xml');
    let cfg: Uint8Array;
    if (ce) {
      const old = target.flag === 0 && ce.offset < target.dataLength
        ? await target.source.read(FMF_HEADER_SIZE + ce.offset, FMF_HEADER_SIZE + ce.offset + ce.storedSize)
        : null;
      if (!old) throw new Error(`config.xml ${folderPath} tidak bisa dibaca`);
      const bom = old[0] === 0xef && old[1] === 0xbb && old[2] === 0xbf;
      const text = td.decode(bom ? old.subarray(3) : old);
      const edited = new TextEncoder().encode(editAssetConfig(text, kind, size, order));
      cfg = bom ? new Uint8Array([0xef, 0xbb, 0xbf, ...edited]) : edited;
    } else {
      if (kind !== 'person') throw new Error(`config.xml ${folderPath} tidak ada di arsip kita`);
      cfg = buildFacesConfigXml(order);
      ce = { name: 'config', ext: '.xml', offset: 0, storedSize: 0, rawSize: 0, time1: ref.time1, time2: ref.time2 };
      own.files.push(ce);
    }
    const stored = target.flag === 0 ? cfg : zstdRawFrame(cfg);
    ce.offset = pos;
    ce.storedSize = stored.length;
    ce.rawSize = cfg.length;
    parts.push(stored);
    pos += stored.length;
    addedBy[k] = order.length;
    added += order.length;
  }
  onProgress?.(rows.length, rows.length);

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
  return { parts: all, size: FMF_HEADER_SIZE + pos + FMF_MAGIC.length + tocBlock.length, added, addedBy, missing, duplicateUids };
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
