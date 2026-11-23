import { useEffect, useMemo, useState } from 'react';
import { INDONESIA_NATION_INDEX } from '../../core/db/loadDatabase';
import type { LogoKind } from '../../core/formats/logos/logoConfig';
import type { LogoItem, Workspace } from '../../core/workspace/workspace';
import { makeLogoPngs, pngUrl } from '../../platform/web/image';
import { Btn, Card, ClubPicker, errText, Msg } from '../common';
import { sortComps } from './ClubsTab';

export function LogosTab({ ws, onChange }: { ws: Workspace; onChange: () => void }) {
  const [kind, setKind] = useState<LogoKind>('clubs');
  const [club, setClub] = useState<number | null>(null);
  const [comp, setComp] = useState<number | null>(null);
  const [png, setPng] = useState<{ normal: Uint8Array; small: Uint8Array } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const comps = useMemo(() => (ws.db ? sortComps(ws.competitions.records.filter((c) => c.nation === INDONESIA_NATION_INDEX)) : []), [ws]);
  const target = kind === 'clubs' ? (club !== null && ws.db ? { id: String(ws.clubs.records[club]!.uid), label: ws.clubs.records[club]!.longName } : null) : comp !== null && ws.db ? { id: String(ws.competitions.records[comp]!.uid), label: ws.competitions.records[comp]!.longName } : null;
  const items = ws.logoItems();

  async function pick(f: File | undefined) {
    if (!f) return;
    try {
      setPng(await makeLogoPngs(f));
      setErr(null);
    } catch (e) {
      setErr(errText(e));
    }
  }

  if (!ws.db) return <Card title="Logo"><p className="text-sm text-slate-400">Buka db_archive dulu untuk memilih klub/kompetisi.</p></Card>;
  return (
    <>
      <Card title="Logo (pictures_logos.fmf)">
        <p className="text-xs text-slate-400">Gambar logo selalu dari Bacad. PNG transparan paling bagus; otomatis dijadikan 180×180 (normal) dan 25×18 (kecil).</p>
        <div className="mt-2 flex gap-2">
          <Btn kind={kind === 'clubs' ? 'primary' : 'plain'} onClick={() => setKind('clubs')}>Klub</Btn>
          <Btn kind={kind === 'comps' ? 'primary' : 'plain'} onClick={() => setKind('comps')}>Kompetisi</Btn>
        </div>
        <div className="mt-2">
          {kind === 'clubs' ? (
            <ClubPicker ws={ws} label="Klub" value={club} onPick={setClub} />
          ) : (
            <select value={comp ?? ''} onChange={(e) => setComp(e.target.value === '' ? null : Number(e.target.value))} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm">
              <option value="">— pilih kompetisi Indonesia —</option>
              {comps.map((c) => (<option key={c.index} value={c.index}>{c.longName}</option>))}
            </select>
          )}
        </div>
        {target && <p className="mt-2 text-sm">ID {target.id} · {ws.logos ? (ws.hasLogo(kind, target.id) ? 'sudah punya logo (akan diganti)' : 'belum punya logo') : 'buka pictures_logos.fmf untuk cek'}</p>}
        <label className="mt-2 block min-h-11 rounded-lg bg-slate-800 px-4 py-3 text-center text-sm">
          Pilih gambar
          <input type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
        </label>
        {png && <Preview png={png} />}
        <Msg text={err} kind="err" />
        <div className="mt-2">
          <Btn kind="primary" disabled={!target || !png || !ws.logos} onClick={() => { ws.addLogo({ kind, id: target!.id, label: target!.label, ...png! }); setPng(null); onChange(); }}>Tambahkan ke daftar logo</Btn>
        </div>
        {!ws.logos && <p className="mt-2 text-xs text-amber-300">pictures_logos.fmf belum dibuka.</p>}
      </Card>
      {items.length > 0 && (
        <Card title={`Logo menunggu disimpan (${items.length})`}>
          <ul className="space-y-2">{items.map((it) => (<PendingRow key={`${it.kind}-${it.id}`} it={it} />))}</ul>
        </Card>
      )}
    </>
  );
}

function useObjectUrl(bytes: Uint8Array): string {
  const u = useMemo(() => pngUrl(bytes), [bytes]);
  useEffect(() => () => URL.revokeObjectURL(u), [u]);
  return u;
}

function Preview({ png }: { png: { normal: Uint8Array; small: Uint8Array } }) {
  const u = [useObjectUrl(png.normal), useObjectUrl(png.small)] as const;
  return (
    <div className="mt-2 flex items-end gap-4 rounded-lg bg-[repeating-conic-gradient(#334155_0_25%,#1e293b_0_50%)] bg-[length:16px_16px] p-3">
      <img src={u[0]} width={90} height={90} alt="logo 180×180" />
      <img src={u[1]} width={25} height={18} alt="logo 25×18" />
    </div>
  );
}

function PendingRow({ it }: { it: LogoItem }) {
  const u = useObjectUrl(it.normal);
  return (
    <li className="flex items-center gap-3 text-sm">
      <img src={u} width={36} height={36} alt="" />
      <span>{it.label} <span className="text-slate-500">({it.kind === 'clubs' ? 'klub' : 'kompetisi'} {it.id})</span></span>
    </li>
  );
}
