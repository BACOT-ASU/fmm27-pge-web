import { useState } from 'react';
import { INDONESIA_NATION_INDEX } from '../../core/db/loadDatabase';
import type { Workspace } from '../../core/workspace/workspace';
import { Btn, Card, errText, Msg, NumField, parseIntIn } from '../common';

export function NationsTab({ ws, onChange }: { ws: Workspace; onChange: () => void }) {
  const [n, setN] = useState(INDONESIA_NATION_INDEX);
  const cur = ws.youthRating(n);
  const [v, setV] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const orig = ws.h.original<Uint8Array>('db:nation.dat');
  void orig;
  return (
    <Card title="Negara (nation.dat)" tone="warn">
      <p className="text-xs text-amber-300">Eksperimen (HYPOTHESIS): byte "kandidat youth rating". B7b mengubah Indonesia ke 19; efek ke youth intake belum terbukti. Patokan: Inggris 19, Spanyol/Jerman/Italia 18, Jepang 13, Korea 12, China 10.</p>
      <label className="mt-2 block text-xs text-slate-500">
        Negara
        <select value={n} onChange={(e) => { setN(Number(e.target.value)); setV(''); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100">
          {ws.nations.map((x) => (<option key={x.index} value={x.index}>{x.name} (index {x.index})</option>))}
        </select>
      </label>
      <p className="mt-2 text-sm">Youth rating sekarang: <b>{cur ?? 'tidak ditemukan'}</b></p>
      {cur !== null && (
        <div className="mt-2 flex items-end gap-2">
          <div className="flex-1"><NumField label="Nilai baru (1–20)" value={v} onChange={setV} /></div>
          <Btn onClick={() => { try { ws.setYouthRating(n, parseIntIn('Youth rating', v, 1, 20)); setErr(null); onChange(); } catch (e) { setErr(errText(e)); } }}>Terapkan</Btn>
        </div>
      )}
      <Msg text={err} kind="err" />
    </Card>
  );
}
