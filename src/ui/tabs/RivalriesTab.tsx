import { useMemo, useState } from 'react';
import type { Workspace } from '../../core/workspace/workspace';
import { Btn, Card, ClubPicker, errText, Msg, NumField, parseIntIn, TextField } from '../common';

export function RivalriesTab({ ws, onChange }: { ws: Workspace; onChange: () => void }) {
  const [club, setClub] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const recs = ws.rivalries.records;
  const orig = ws.h.original<typeof ws.rivalries>('db:rivalries.dat').records;
  const clubs = ws.clubs.records;
  const list = useMemo(() => recs.map((r, i) => ({ r, i })).filter(({ r }) => (club === null ? clubs[r.clubA]?.nation === 58 || clubs[r.clubB]?.nation === 58 : r.clubA === club || r.clubB === club)), [recs, club, clubs]);
  return (
    <Card title={`Rivalitas (rivalries.dat · ${recs.length})`}>
      <ClubPicker ws={ws} label="Filter klub (kosong = rivalitas klub Indonesia)" value={club} onPick={setClub} />
      {club !== null && <div className="mt-2"><Btn onClick={() => setClub(null)}>Hapus filter</Btn></div>}
      <div className="mt-2"><Btn kind="primary" onClick={() => setAdding((x) => !x)}>{adding ? 'Tutup' : '+ Rivalitas baru'}</Btn></div>
      {adding && <NewRivalry ws={ws} onDone={() => { setAdding(false); onChange(); }} />}
      <ul className="mt-3 space-y-2">
        {list.map(({ r, i }) => (
          <RivalryRow key={i} ws={ws} i={i} changed={orig[i] !== r} isNew={!orig[i]} onChange={onChange} />
        ))}
      </ul>
      {list.length === 0 && <p className="mt-3 text-sm text-slate-500">Tidak ada rivalitas.</p>}
    </Card>
  );
}

function RivalryRow({ ws, i, changed, isNew, onChange }: { ws: Workspace; i: number; changed: boolean; isNew: boolean; onChange: () => void }) {
  const r = ws.rivalries.records[i]!;
  const [v, setV] = useState(String(r.intensity));
  const [err, setErr] = useState<string | null>(null);
  const clubs = ws.clubs.records;
  return (
    <li className={`rounded-lg border p-3 ${changed ? 'border-amber-600' : 'border-slate-800'}`}>
      <div className="text-sm font-semibold">{r.name}{isNew ? ' · BARU' : ''}</div>
      <div className="text-xs text-slate-500">{clubs[r.clubA]?.longName ?? `#${r.clubA}`} vs {clubs[r.clubB]?.longName ?? `#${r.clubB}`} · intensitas {r.intensity}</div>
      <div className="mt-2 flex items-end gap-2">
        <div className="flex-1"><NumField label="Intensitas (0–200)" value={v} onChange={setV} /></div>
        <Btn onClick={() => { try { ws.setRivalry(i, { intensity: parseIntIn('Intensitas', v, 0, 200) }); setErr(null); onChange(); } catch (e) { setErr(errText(e)); } }}>Terapkan</Btn>
      </div>
      <Msg text={err} kind="err" />
    </li>
  );
}

function NewRivalry({ ws, onDone }: { ws: Workspace; onDone: () => void }) {
  const [a, setA] = useState<number | null>(null);
  const [b, setB] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [v, setV] = useState('150');
  const [err, setErr] = useState<string | null>(null);
  const clubs = ws.clubs.records;
  const auto = a !== null && b !== null ? `${clubs[a]!.shortName} vs ${clubs[b]!.shortName}` : '';
  function run() {
    try {
      if (a === null || b === null || a === b) throw new Error('Pilih dua klub yang berbeda');
      ws.addRivalry({ name: (name || auto).trim(), clubA: a, clubB: b, intensity: parseIntIn('Intensitas', v, 0, 200) });
      onDone();
    } catch (e) {
      setErr(errText(e));
    }
  }
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-emerald-800 p-3">
      <ClubPicker ws={ws} label="Klub A" value={a} onPick={setA} />
      <ClubPicker ws={ws} label="Klub B" value={b} onPick={setB} />
      <TextField label="Nama rivalitas" value={name} placeholder={auto} onChange={setName} />
      <NumField label="Intensitas (0–200; derby Persija–Persib = 200)" value={v} onChange={setV} />
      <Msg text={err} kind="err" />
      <div className="flex gap-2"><Btn kind="primary" onClick={run}>Tambah</Btn><Btn onClick={onDone}>Batal</Btn></div>
      <p className="text-xs text-slate-500">Rivalitas merujuk urutan klub di club.dat; klub baru selalu ditaruh di ujung sehingga rujukan lama tidak bergeser.</p>
    </div>
  );
}
