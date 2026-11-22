import { useEffect, useMemo, useState } from 'react';
import { isEditableScalar, scalarOf, tagName, withScalar, type DbcEntry, type DbcPath, type DbcValue } from '../../core/formats/dbc/dbc';
import type { Workspace } from '../../core/workspace/workspace';
import { Btn, Card, errText, Msg } from '../common';

export function RulesTab({ ws, onChange, rev }: { ws: Workspace; onChange: () => void; rev: number }) {
  const [q, setQ] = useState('idn');
  const [open, setOpen] = useState<string | null>(null);
  const names = useMemo(() => ws.dbcEntryNames(), [ws]);
  const list = useMemo(() => names.filter((n) => n.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 100), [names, q]);
  const edited = ws.h.get<Map<string, DbcEntry>>('sc:dbc');
  return (
    <>
      <Card title={`Aturan (comps.dbc · ${names.length} entri)`} tone="warn">
        <p className="text-xs text-amber-300">Mengubah aturan berisiko: struktur liga punya banyak ketergantungan. comps.dbc memakai arsip flag 3; penulisan aplikasi (frame zstd tanpa kompresi) belum diuji di game. Versi entri di comps.txt dinaikkan otomatis saat disimpan.</p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari entri (mis. idn_league_three)" className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm" />
        <ul className="mt-2 divide-y divide-slate-800">
          {list.map((n) => (
            <li key={n}>
              <button type="button" onClick={() => setOpen(n === open ? null : n)} className={`min-h-11 w-full py-2 text-left text-sm ${open === n ? 'text-emerald-400' : ''} ${edited.has(n) ? 'text-amber-300' : ''}`}>
                {n}{edited.has(n) ? ' · diubah' : ''}
              </button>
            </li>
          ))}
        </ul>
      </Card>
      {open && <EntryView key={`${open}-${rev}`} ws={ws} name={open} onChange={onChange} />}
    </>
  );
}

function EntryView({ ws, name, onChange }: { ws: Workspace; name: string; onChange: () => void }) {
  const [e, setE] = useState<DbcEntry | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    ws.dbcEntry(name).then((x) => alive && setE(x)).catch((x: unknown) => alive && setErr(errText(x)));
    return () => {
      alive = false;
    };
  }, [ws, name]);
  if (err) return <Card title={name}><Msg text={err} kind="err" /></Card>;
  if (!e) return <Card title={name}><p className="text-sm text-slate-400">Membaca…</p></Card>;
  return (
    <Card title={name}>
      <p className="text-xs text-slate-500">header {Array.from(e.hdr, (b) => b.toString(16).padStart(2, '0')).join(' ')} · kunci {JSON.stringify(show(e.key))}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {e.fields.map((f, i) => (
          <Node key={i} ws={ws} entry={name} label={tagName(f.tag)} value={f.value} path={[i]} onChange={onChange} />
        ))}
      </ul>
    </Card>
  );
}

function show(v: DbcValue): unknown {
  if ('raw' in v) {
    const s = scalarOf(v);
    return typeof s === 'bigint' ? s.toString() : s;
  }
  return v.t === 0x0a ? `{${v.fields.length} field}` : `[${v.items.length} item]`;
}

function Node({ ws, entry, label, value, path, onChange }: { ws: Workspace; entry: string; label: string; value: DbcValue; path: DbcPath; onChange: () => void }) {
  const [openNode, setOpenNode] = useState(path.length === 1 ? false : true);
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState('');
  const [err, setErr] = useState<string | null>(null);
  if (!('raw' in value)) {
    const kids = value.t === 0x0a ? value.fields.map((f) => ({ label: tagName(f.tag), value: f.value })) : value.items.map((it, k) => ({ label: `[${k}]`, value: it }));
    return (
      <li className="border-l border-slate-800 pl-2">
        <button type="button" onClick={() => setOpenNode((x) => !x)} className="min-h-9 text-left text-slate-300">
          {openNode ? '▾' : '▸'} <span className="font-mono text-emerald-300">{label}</span> <span className="text-slate-500">{String(show(value))}</span>
        </button>
        {openNode && (
          <ul className="ml-2 space-y-1">
            {kids.map((k, i) => (
              <Node key={i} ws={ws} entry={entry} label={k.label} value={k.value} path={[...path, i]} onChange={onChange} />
            ))}
          </ul>
        )}
      </li>
    );
  }
  const s = show(value);
  const editable = isEditableScalar(value);
  async function apply() {
    try {
      const x = value.t === 0x03 ? v === 'true' || v === '1' : value.t === 0x0c || value.t === 0x1a ? v : Number(v);
      await ws.setDbcValue(entry, path, withScalar(value, x));
      setEdit(false);
      setErr(null);
      onChange();
    } catch (e) {
      setErr(errText(e));
    }
  }
  return (
    <li className="border-l border-slate-800 pl-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-emerald-300">{label}</span>
        <span className="break-all">{String(s)}</span>
        {editable && !edit && <button type="button" onClick={() => { setV(String(s)); setEdit(true); }} className="min-h-9 px-2 text-xs text-slate-400 underline">ubah</button>}
      </div>
      {edit && (
        <div className="mt-1 flex gap-2">
          {value.t === 0x03 ? (
            <select value={v} onChange={(e) => setV(e.target.value)} className="min-h-11 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm"><option value="true">true</option><option value="false">false</option></select>
          ) : (
            <input value={v} onChange={(e) => setV(e.target.value)} className="min-h-11 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm" />
          )}
          <Btn kind="primary" onClick={() => void apply()}>OK</Btn>
          <Btn onClick={() => setEdit(false)}>Batal</Btn>
        </div>
      )}
      <Msg text={err} kind="err" />
    </li>
  );
}
