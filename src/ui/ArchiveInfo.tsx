import { useEffect, useMemo, useState } from 'react';
import { formatBytes, formatInt } from '../core/binary/formatBytes';
import { findEntry, listEntries, openFmf, openFmfBytes, readEntry, splitInnerArchive, type FmfArchive } from '../core/fmf';
import type { PickedFile } from '../platform/types';

interface Inner {
  name: string;
  flag: number;
  count: number;
}

export function ArchiveInfo({ file }: { file: PickedFile }) {
  const [arc, setArc] = useState<FmfArchive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inner, setInner] = useState<Inner | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    openFmf(file.source)
      .then(async (a) => {
        if (!alive) return;
        setArc(a);
        const dbc = findEntry(a.root, 'comps.dbc');
        if (dbc) {
          const parts = splitInnerArchive(await readEntry(a, dbc.entry));
          const d = await openFmfBytes(parts.archive);
          if (alive) setInner({ name: 'comps.dbc', flag: d.flag, count: listEntries(d.root).length });
        }
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [file]);

  const entries = useMemo(() => (arc ? listEntries(arc.root) : []), [arc]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle ? entries.filter((e) => e.path.toLowerCase().includes(needle)) : entries;
    return list.slice(0, 100);
  }, [entries, q]);

  if (error) return <Card title="Arsip .fmf"><p className="text-sm text-amber-400">{error}</p></Card>;
  if (!arc) return <Card title="Arsip .fmf"><p className="text-sm text-slate-400">Membaca daftar isi…</p></Card>;

  return (
    <Card title="Arsip .fmf">
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <dt className="text-slate-500">Flag</dt>
        <dd>{arc.flag} {arc.flag === 0 ? '(isi mentah)' : '(isi zstd per entri)'}</dd>
        <dt className="text-slate-500">Jumlah entri</dt>
        <dd>{formatInt(entries.length)}</dd>
        <dt className="text-slate-500">Area data</dt>
        <dd>{formatBytes(arc.dataLength)}</dd>
        {inner && (
          <>
            <dt className="text-slate-500">{inner.name}</dt>
            <dd>flag {inner.flag}, {formatInt(inner.count)} entri</dd>
          </>
        )}
      </dl>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari entri (mis. club.dat)"
        className="mt-4 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm"
      />
      <ul className="mt-2 max-h-80 divide-y divide-slate-800 overflow-auto text-xs">
        {shown.map(({ path, entry }) => (
          <li key={path} className="flex justify-between gap-2 py-1.5">
            <span className="break-all font-mono">{path}</span>
            <span className="shrink-0 text-slate-500">{formatBytes(entry.rawSize)}</span>
          </li>
        ))}
      </ul>
      {entries.length > shown.length && !q && (
        <p className="mt-1 text-xs text-slate-500">Menampilkan 100 pertama. Pakai pencarian untuk yang lain.</p>
      )}
    </Card>
  );
}

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">{title}</div>
      {children}
    </section>
  );
}
