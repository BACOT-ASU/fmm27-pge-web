import { useMemo, useState, type ReactNode } from 'react';
import type { Workspace } from '../core/workspace/workspace';

export function Card({ title, children, tone }: { title: string; children: ReactNode; tone?: 'warn' }) {
  return (
    <section className={`rounded-xl border p-4 ${tone === 'warn' ? 'border-amber-700 bg-amber-950/30' : 'border-slate-800 bg-slate-900'}`}>
      <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">{title}</div>
      {children}
    </section>
  );
}

export function Btn({ children, onClick, kind = 'plain', disabled, full }: { children: ReactNode; onClick: () => void; kind?: 'plain' | 'primary' | 'warn'; disabled?: boolean; full?: boolean }) {
  const c = kind === 'primary' ? 'bg-emerald-700 active:bg-emerald-800 font-semibold' : kind === 'warn' ? 'bg-amber-600 font-semibold' : 'bg-slate-800 active:bg-slate-700';
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`min-h-11 rounded-lg px-4 text-sm disabled:opacity-40 ${c} ${full ? 'w-full' : ''}`}>
      {children}
    </button>
  );
}

export function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block text-xs text-slate-400">
      {label}
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" />
    </label>
  );
}

export function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-xs text-slate-400">
      {label}
      <input inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d-]/g, ''))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" />
    </label>
  );
}

/** Angka bulat dalam rentang, atau pesan galat. */
export function parseIntIn(label: string, v: string, min: number, max: number): number {
  const n = Number(v);
  if (v.trim() === '' || !Number.isInteger(n) || n < min || n > max) throw new Error(`${label}: isi bilangan bulat ${min.toLocaleString('id-ID')}–${max.toLocaleString('id-ID')}`);
  return n;
}

export function Msg({ text, kind }: { text: string | null; kind?: 'ok' | 'err' }) {
  if (!text) return null;
  return <p className={`mt-2 text-sm ${kind === 'err' ? 'text-amber-400' : 'text-emerald-400'}`}>{text}</p>;
}

/** Pencarian klub (nama atau UID) → index klub. */
export function ClubPicker({ ws, label, value, onPick }: { ws: Workspace; label: string; value: number | null; onPick: (i: number) => void }) {
  const [q, setQ] = useState('');
  const recs = ws.clubs.records;
  const hits = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (n.length < 2) return [];
    const isNum = /^\d+$/.test(n);
    const out: number[] = [];
    for (let i = 0; i < recs.length && out.length < 20; i++) if (isNum ? String(recs[i]!.uid) === n : recs[i]!.longName.toLowerCase().includes(n)) out.push(i);
    return out;
  }, [q, recs]);
  return (
    <div className="text-xs text-slate-400">
      {label}: <span className="text-slate-100">{value !== null && recs[value] ? `${recs[value].longName} (#${value})` : '—'}</span>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ketik nama/UID klub" className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" />
      {hits.length > 0 && (
        <ul className="mt-1 max-h-48 overflow-auto rounded-lg border border-slate-800">
          {hits.map((i) => (
            <li key={i}>
              <button type="button" onClick={() => { onPick(i); setQ(''); }} className="min-h-11 w-full px-3 text-left text-sm active:bg-slate-800">
                {recs[i]!.longName} <span className="text-slate-500">UID {recs[i]!.uid}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Pencarian stadion (nama atau UID) → index stadion. */
export function StadiumPicker({ ws, label, value, onPick }: { ws: Workspace; label: string; value: number | null; onPick: (i: number) => void }) {
  const [q, setQ] = useState('');
  const recs = ws.stadiums.records;
  const hits = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (n.length < 2) return [];
    const isNum = /^\d+$/.test(n);
    const out: number[] = [];
    for (let i = 0; i < recs.length && out.length < 20; i++) if (isNum ? String(recs[i]!.uid) === n || String(i) === n : recs[i]!.name.toLowerCase().includes(n)) out.push(i);
    return out;
  }, [q, recs]);
  return (
    <div className="text-xs text-slate-400">
      {label}: <span className="text-slate-100">{value !== null && recs[value] ? `${recs[value].name} (#${value}, ${recs[value].capacity.toLocaleString('id-ID')})` : '—'}</span>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ketik nama stadion / index / UID" className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" />
      {hits.length > 0 && (
        <ul className="mt-1 max-h-48 overflow-auto rounded-lg border border-slate-800">
          {hits.map((i) => (
            <li key={i}>
              <button type="button" onClick={() => { onPick(i); setQ(''); }} className="min-h-11 w-full px-3 text-left text-sm active:bg-slate-800">
                {recs[i]!.name} <span className="text-slate-500">#{i} · {recs[i]!.capacity.toLocaleString('id-ID')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Pilihan daftar IDN-0/1/2 (atau entri lain) untuk pendaftaran di fmm_*. */
export function ListEntryChecks({ value, onChange, entries = ['IDN-0', 'IDN-1', 'IDN-2'] }: { value: string[]; onChange: (v: string[]) => void; entries?: string[] }) {
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      {entries.map((e) => (
        <label key={e} className="flex min-h-11 items-center gap-2">
          <input type="checkbox" checked={value.includes(e)} onChange={(ev) => onChange(ev.target.checked ? [...value, e] : value.filter((x) => x !== e))} className="h-5 w-5" />
          {e}
        </label>
      ))}
    </div>
  );
}

export function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
