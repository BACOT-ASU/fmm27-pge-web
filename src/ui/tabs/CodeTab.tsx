import { useEffect, useState } from 'react';
import { readLibgameTables, type LibgameTables } from '../../core/formats/libgame/libgameTables';
import type { PickedFile } from '../../platform/types';
import type { Workspace } from '../../core/workspace/workspace';
import { Card, errText, Msg } from '../common';

export function CodeTab({ ws, file }: { ws: Workspace; file: PickedFile | null }) {
  const [t, setT] = useState<LibgameTables | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return;
    let alive = true;
    readLibgameTables(file.source).then((x) => alive && setT(x)).catch((e: unknown) => alive && setErr(errText(e)));
    return () => {
      alive = false;
    };
  }, [file]);
  if (!file) return <Card title="Cek kode (libgame.so)"><p className="text-sm text-slate-400">Buka libgame.so (lib/arm64-v8a) di bagian File untuk memeriksa tabel negara playable dan liga terdalam. Hanya dibaca, tidak diubah.</p></Card>;
  const nationName = new Map(ws.nations.map((n) => [n.index, n.name]));
  const compName = new Map(ws.db ? ws.competitions.records.map((c) => [c.uid, c.longName]) : []);
  return (
    <Card title="Cek kode (libgame.so, hanya dibaca)">
      <Msg text={err} kind="err" />
      {t && (
        <>
          {t.notes.map((n, i) => (<p key={i} className="text-xs text-amber-300">{n}</p>))}
          <p className="text-sm">Build B2c dikenali: <b>{t.knownBuild ? 'ya' : 'tidak'}</b> · penanda teks: <b>{t.markerFound ? 'ada' : 'tidak ada'}</b></p>
          <h3 className="mt-3 text-sm font-semibold">Negara playable (28 slot, 0x643920)</h3>
          <p className="text-xs text-slate-500">Indonesia (58): {t.playableNations.includes(58) ? '✓ terdaftar' : '✗ tidak ada'}</p>
          <ul className="mt-1 grid grid-cols-2 gap-x-3 text-xs">
            {t.playableNations.map((n, i) => (<li key={i}>{i}. {nationName.get(n) ?? `#${n}`}</li>))}
          </ul>
          <h3 className="mt-3 text-sm font-semibold">Liga terdalam yang bisa dimainkan (0x7cb440)</h3>
          <p className="text-xs text-slate-500">Liga Nusantara (41042746): {t.deepestLeagues.includes(41042746) ? '✓ terdaftar' : '✗ tidak ada'}. Kalau liga tidak muncul di layar awal karier padahal datanya lengkap, cek tabel ini dulu.</p>
          <ul className="mt-1 text-xs">
            {t.deepestLeagues.map((u, i) => (<li key={i}>{u} <span className="text-slate-500">{compName.get(u) ?? ''}</span></li>))}
          </ul>
        </>
      )}
    </Card>
  );
}
