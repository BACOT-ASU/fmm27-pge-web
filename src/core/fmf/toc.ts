import { readU64, view, writeU64, concatBytes } from '../binary/le';
import type { FmfEntry, FmfFolder } from './types';

const td = new TextDecoder('utf-8', { fatal: false });
const te = new TextEncoder();

/**
 * Isi TOC (rekursif): nama folder (u32 + teks), u32 jumlah file, per file:
 * nama, ekstensi, u64 offset, u64 ukuran tersimpan, u64 ukuran asli, 2 × u64 waktu;
 * lalu u32 jumlah subfolder dan subfolder. Status: VERIFIED (fmfio.py, fmmcore.js).
 */
export function parseToc(raw: Uint8Array): FmfFolder {
  const dv = view(raw);
  let p = 0;
  const need = (n: number) => {
    if (p + n > raw.length) throw new Error(`TOC terpotong di posisi ${p}`);
  };
  const str = (): string => {
    need(4);
    const l = dv.getUint32(p, true);
    p += 4;
    need(l);
    const v = td.decode(raw.subarray(p, p + l));
    p += l;
    return v;
  };
  const u32 = (): number => {
    need(4);
    const v = dv.getUint32(p, true);
    p += 4;
    return v;
  };
  const folder = (): FmfFolder => {
    const f: FmfFolder = { name: str(), files: [], subs: [] };
    const n = u32();
    for (let i = 0; i < n; i++) {
      const name = str();
      const ext = str();
      need(40);
      f.files.push({
        name,
        ext,
        offset: readU64(dv, p),
        storedSize: readU64(dv, p + 8),
        rawSize: readU64(dv, p + 16),
        time1: dv.getBigUint64(p + 24, true),
        time2: dv.getBigUint64(p + 32, true),
      });
      p += 40;
    }
    const k = u32();
    for (let j = 0; j < k; j++) f.subs.push(folder());
    return f;
  };
  const root = folder();
  if (p !== raw.length) throw new Error(`TOC tidak habis terbaca (${p}/${raw.length})`);
  return root;
}

export function serializeToc(root: FmfFolder): Uint8Array {
  const parts: Uint8Array[] = [];
  const u32 = (v: number) => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, v, true);
    parts.push(b);
  };
  const str = (v: string) => {
    const b = te.encode(v);
    u32(b.length);
    parts.push(b);
  };
  const folder = (f: FmfFolder) => {
    str(f.name);
    u32(f.files.length);
    for (const e of f.files) {
      str(e.name);
      str(e.ext);
      const b = new Uint8Array(40);
      const dv = new DataView(b.buffer);
      writeU64(dv, 0, e.offset);
      writeU64(dv, 8, e.storedSize);
      writeU64(dv, 16, e.rawSize);
      dv.setBigUint64(24, e.time1, true);
      dv.setBigUint64(32, e.time2, true);
      parts.push(b);
    }
    u32(f.subs.length);
    f.subs.forEach(folder);
  };
  folder(root);
  return concatBytes(parts);
}

/** Jalur lengkap tiap entri, termasuk nama folder akar: "akar/sub/nama.ext". */
export function walkEntries(root: FmfFolder, cb: (path: string, entry: FmfEntry, folder: FmfFolder) => void): void {
  const go = (f: FmfFolder, pre: string) => {
    const path = pre ? `${pre}/${f.name}` : f.name;
    for (const e of f.files) cb(`${path}/${e.name}${e.ext}`, e, f);
    for (const s of f.subs) go(s, path);
  };
  go(root, '');
}

export function listEntries(root: FmfFolder): { path: string; entry: FmfEntry }[] {
  const out: { path: string; entry: FmfEntry }[] = [];
  walkEntries(root, (path, entry) => out.push({ path, entry }));
  return out;
}

/** Cari folder dengan jalur "akar/sub/...". */
export function findFolder(root: FmfFolder, path: string): FmfFolder | null {
  const parts = path.split('/');
  if (parts[0] !== root.name) return null;
  let f: FmfFolder | undefined = root;
  for (let i = 1; i < parts.length && f; i++) f = f.subs.find((s) => s.name === parts[i]);
  return f ?? null;
}

/** Cari entri dengan jalur lengkap, atau (kalau tidak ada '/') dengan nama+ekstensi saja. */
export function findEntry(root: FmfFolder, pathOrName: string): { path: string; entry: FmfEntry } | null {
  let hit: { path: string; entry: FmfEntry } | null = null;
  const byName = !pathOrName.includes('/');
  walkEntries(root, (path, entry) => {
    if (hit) return;
    if (byName ? entry.name + entry.ext === pathOrName : path === pathOrName) hit = { path, entry };
  });
  return hit;
}

export function cloneFolder(f: FmfFolder): FmfFolder {
  return { name: f.name, files: f.files.map((e) => ({ ...e })), subs: f.subs.map(cloneFolder) };
}
