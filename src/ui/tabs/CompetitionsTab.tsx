import { useMemo, useState } from 'react';
import { INDONESIA_NATION_INDEX } from '../../core/db/loadDatabase';
import { COMPETITION_TYPE } from '../../core/formats/competition/competitionDat';
import type { Workspace } from '../../core/workspace/workspace';
import { Btn, Card, errText, Msg, NumField, parseIntIn, TextField } from '../common';
import { NationSelect, sortComps } from './ClubsTab';

export function CompetitionsTab({ ws, onChange }: { ws: Workspace; onChange: () => void }) {
  const [nation, setNation] = useState(INDONESIA_NATION_INDEX);
  const [edit, setEdit] = useState<number | null>(null);
  const comps = ws.competitions.records;
  const list = useMemo(() => sortComps(comps.filter((c) => c.nation === nation)), [comps, nation]);
  const orig = ws.h.original<typeof ws.competitions>('db:competition.dat').records;
  return (
    <Card title="Kompetisi (competition.dat)">
      <NationSelect ws={ws} value={nation} onChange={(n) => { setNation(n); setEdit(null); }} />
      <ul className="mt-3 space-y-2">
        {list.map((c) => (
          <li key={c.index} className={`rounded-lg border p-3 ${orig[c.index] !== c ? 'border-amber-600' : 'border-slate-800'}`}>
            <div className="text-sm font-semibold">{c.longName}</div>
            <div className="text-xs text-slate-500">
              pendek: {c.shortName} · singkatan: {c.abbr} · {COMPETITION_TYPE[c.type] ?? c.type} · rep {c.reputation} · UID {c.uid} · #{c.index}
              {[...c.longName].length > 21 && <span className="text-amber-400"> · nama panjang &gt; 21 huruf, game memakai nama pendek</span>}
            </div>
            {edit === c.index ? <CompForm ws={ws} index={c.index} onDone={() => { setEdit(null); onChange(); }} /> : <div className="mt-2"><Btn onClick={() => setEdit(c.index)}>Edit</Btn></div>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CompForm({ ws, index, onDone }: { ws: Workspace; index: number; onDone: () => void }) {
  const c = ws.competitions.records[index]!;
  const [f, setF] = useState({ longName: c.longName, shortName: c.shortName, abbr: c.abbr, rep: String(c.reputation) });
  const [err, setErr] = useState<string | null>(null);
  function apply() {
    try {
      if (!f.longName.trim() || !f.shortName.trim()) throw new Error('Nama panjang dan pendek wajib diisi');
      ws.setCompetition(index, { longName: f.longName.trim(), shortName: f.shortName.trim(), abbr: f.abbr.trim(), reputation: parseIntIn('Reputasi', f.rep, 0, 65535) });
      onDone();
    } catch (e) {
      setErr(errText(e));
    }
  }
  return (
    <div className="mt-2 space-y-2">
      <TextField label={`Nama panjang (${[...f.longName].length} huruf; ≤ 21 terbukti muat)`} value={f.longName} onChange={(v) => setF((x) => ({ ...x, longName: v }))} />
      <TextField label={`Nama pendek (${[...f.shortName].length} huruf)`} value={f.shortName} onChange={(v) => setF((x) => ({ ...x, shortName: v }))} />
      <TextField label="Singkatan" value={f.abbr} onChange={(v) => setF((x) => ({ ...x, abbr: v }))} />
      <NumField label="Reputasi" value={f.rep} onChange={(v) => setF((x) => ({ ...x, rep: v }))} />
      <Msg text={err} kind="err" />
      <div className="flex gap-2"><Btn kind="primary" onClick={apply}>Terapkan</Btn><Btn onClick={onDone}>Batal</Btn></div>
    </div>
  );
}
