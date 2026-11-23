import { useEffect, useMemo, useState } from 'react';
import { FMM_LISTS, type FmmListName, type UidList } from '../../core/formats/fmmlists/fmmLists';
import type { Workspace } from '../../core/workspace/workspace';
import { Btn, Card, errText, ListEntryChecks, Msg } from '../common';

const LABEL: Record<FmmListName, string> = {
  fmm_comps: 'Kompetisi',
  fmm_clubs: 'Klub',
  fmm_reserve_clubs: 'Klub cadangan',
  fmm_cities: 'Kota',
  fmm_stadiums: 'Stadion',
  fmm_people: 'Orang (pemain/staf)',
};

export function ListsTab({ ws, onChange, rev }: { ws: Workspace; onChange: () => void; rev: number }) {
  const [name, setName] = useState<FmmListName>('fmm_people');
  const [lists, setLists] = useState<Map<string, UidList> | null>(null);
  const [entry, setEntry] = useState('IDN-0');
  const [err, setErr] = useState<string | null>(null);
  const [add, setAdd] = useState('');
  const [targets, setTargets] = useState<string[]>(['IDN-0', 'IDN-1', 'IDN-2']);
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    ws.loadList(name)
      .then(() => alive && (setLists(ws.h.get<Map<string, UidList>>(`sc:list:${name}`)), setErr(null)))
      .catch((e: unknown) => alive && setErr(errText(e)));
    return () => {
      alive = false;
    };
  }, [ws, name, rev]);

  const names = useMemo(() => {
    const m = new Map<number, string>();
    if (!ws.db) return m;
    if (name === 'fmm_clubs' || name === 'fmm_reserve_clubs') for (const c of ws.clubs.records) m.set(c.uid, c.longName);
    if (name === 'fmm_comps') for (const c of ws.competitions.records) m.set(c.uid, c.longName);
    if (name === 'fmm_stadiums') for (const s of ws.stadiums.records) m.set(s.uid, s.name);
    return m;
  }, [ws, name]);

  const cur = lists?.get(entry);
  const shown = useMemo(() => {
    if (!cur) return [];
    const n = q.trim().toLowerCase();
    const all = cur.uids;
    const f = n ? all.filter((u) => String(u).includes(n) || (names.get(u) ?? '').toLowerCase().includes(n)) : all.slice(-100).reverse();
    return f.slice(0, 200);
  }, [cur, q, names]);

  async function doAdd() {
    try {
      const uids = add.split(/[\s,;]+/).filter(Boolean).map((x) => {
        const n = Number(x);
        if (!Number.isInteger(n) || n < 0 || n > 4294967295) throw new Error(`UID tidak sah: ${x}`);
        return n;
      });
      if (!uids.length) throw new Error('Isi minimal satu UID');
      await ws.listAdd(name, targets, uids);
      setAdd('');
      setErr(null);
      onChange();
    } catch (e) {
      setErr(errText(e));
    }
  }

  return (
    <Card title="Daftar muat (sicomps 2700/fmm_*.dat)">
      <p className="text-xs text-slate-400">Klub, stadion, kompetisi, dan orang hanya dimuat game kalau UID-nya ada di daftar negara yang dipilih (IDN-0 = strata 1, IDN-1, IDN-2).</p>
      <select value={name} onChange={(e) => { setName(e.target.value as FmmListName); setLists(null); }} className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm">
        {FMM_LISTS.map((l) => (<option key={l} value={l}>{LABEL[l]} ({l})</option>))}
      </select>
      {lists && (
        <>
          <select value={entry} onChange={(e) => setEntry(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm">
            {[...lists.keys()].sort().map((k) => (<option key={k} value={k}>{k} ({lists.get(k)!.uids.length} UID)</option>))}
          </select>
          <div className="mt-3 rounded-lg border border-slate-800 p-3">
            <div className="text-xs text-slate-400">Tambah UID (pisahkan koma/spasi) ke:</div>
            <ListEntryChecks value={targets} onChange={setTargets} />
            <textarea value={add} onChange={(e) => setAdd(e.target.value)} rows={2} placeholder="mis. 37078404, 2000700202" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm" />
            <Btn kind="primary" onClick={() => void doAdd()}>Tambah</Btn>
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Cari UID/nama di ${entry}`} className="mt-3 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm" />
          <p className="mt-1 text-xs text-slate-500">{q ? 'Hasil pencarian' : '100 UID terakhir (yang baru di ujung)'}</p>
          <ul className="mt-1 divide-y divide-slate-800 text-sm">
            {shown.map((u) => (
              <li key={u} className="flex items-center justify-between gap-2 py-1">
                <span>{u} <span className="text-slate-500">{names.get(u) ?? ''}</span></span>
                <button type="button" onClick={() => void ws.listRemove(name, entry, [u]).then(onChange).catch((e: unknown) => setErr(errText(e)))} className="min-h-11 px-3 text-xs text-amber-400">hapus</button>
              </li>
            ))}
          </ul>
        </>
      )}
      <Msg text={err} kind="err" />
    </Card>
  );
}
