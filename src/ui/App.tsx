import { useState } from 'react';
import { formatBytes } from '../core/binary/formatBytes';
import { isDatabaseArchive } from '../core/db/loadDatabase';
import { openFmf } from '../core/fmf';
import { identifyFile } from '../core/versions';
import { Workspace } from '../core/workspace/workspace';
import type { PickedFile } from '../platform/types';
import { webFileIO } from '../platform/web/webFileIO';
import { ArchiveInfo } from './ArchiveInfo';
import { Btn, Card, errText, Msg } from './common';
import { HashPanel } from './HashPanel';
import { ClubsTab } from './tabs/ClubsTab';
import { CodeTab } from './tabs/CodeTab';
import { CompetitionsTab } from './tabs/CompetitionsTab';
import { ListsTab } from './tabs/ListsTab';
import { LogosTab } from './tabs/LogosTab';
import { NationsTab } from './tabs/NationsTab';
import { RivalriesTab } from './tabs/RivalriesTab';
import { RulesTab } from './tabs/RulesTab';
import { SaveTab } from './tabs/SaveTab';
import { StadiumsTab } from './tabs/StadiumsTab';
import { FacesTab } from './tabs/FacesTab';

type Slot = 'db' | 'sc' | 'logos' | 'lib';
const SLOTS: { id: Slot; label: string; hint: string; accept: string[] }[] = [
  { id: 'db', label: 'Database', hint: 'db_archive_2706.fmf (assets/data/game)', accept: ['.fmf'] },
  { id: 'sc', label: 'Aturan & daftar muat', hint: 'sicomps.fmf (assets/shared/data)', accept: ['.fmf'] },
  { id: 'logos', label: 'Logo', hint: 'pictures_logos.fmf (assets/data/game)', accept: ['.fmf'] },
  { id: 'lib', label: 'Kode game (hanya dibaca)', hint: 'libgame.so (lib/arm64-v8a)', accept: ['.so'] },
];
type Tab = 'klub' | 'kompetisi' | 'stadion' | 'rivalitas' | 'negara' | 'daftar' | 'aturan' | 'logo' | 'wajah' | 'kode' | 'arsip' | 'simpan';

export default function App() {
  const [ws, setWs] = useState(() => new Workspace());
  const [files, setFiles] = useState<Record<Slot, PickedFile | null>>({ db: null, sc: null, logos: null, lib: null });
  const [loading, setLoading] = useState<Slot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rev, setRev] = useState(0);
  const [tab, setTab] = useState<Tab>('klub');
  const bump = () => setRev((x) => x + 1);

  async function pick(slot: Slot) {
    setErr(null);
    const f = await webFileIO.pickFile({ accept: SLOTS.find((s) => s.id === slot)!.accept });
    if (!f) return;
    setLoading(slot);
    try {
      if (slot !== 'lib') {
        const arc = await openFmf(f.source);
        await new Promise((r) => setTimeout(r, 30));
        if (slot === 'db') {
          if (!isDatabaseArchive(arc)) throw new Error('File ini bukan db_archive (tidak ada club.dat/competition.dat)');
          await ws.attachDb(arc);
        } else if (slot === 'sc') await ws.attachSicomps(arc);
        else await ws.attachLogos(arc);
      }
      setFiles((x) => ({ ...x, [slot]: f }));
      bump();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setLoading(null);
    }
  }

  function restart() {
    setWs(new Workspace());
    setFiles({ db: null, sc: null, logos: null, lib: null });
    setTab('klub');
    bump();
  }

  const changes = files.db || files.sc || files.logos ? ws.changes().length : 0;
  const tabs: { id: Tab; label: string; need: Slot | null }[] = [
    { id: 'klub', label: 'Klub', need: 'db' },
    { id: 'kompetisi', label: 'Kompetisi', need: 'db' },
    { id: 'stadion', label: 'Stadion', need: 'db' },
    { id: 'rivalitas', label: 'Rivalitas', need: 'db' },
    { id: 'negara', label: 'Negara', need: 'db' },
    { id: 'daftar', label: 'Daftar muat', need: 'sc' },
    { id: 'aturan', label: 'Aturan', need: 'sc' },
    { id: 'logo', label: 'Logo', need: 'logos' },
    { id: 'wajah', label: 'Wajah & logo', need: 'logos' },
    { id: 'kode', label: 'Kode', need: 'lib' },
    { id: 'arsip', label: 'Arsip', need: null },
    { id: 'simpan', label: `Simpan${changes ? ` (${changes})` : ''}`, need: null },
  ];
  const available = tabs.filter((t) => t.need === null || files[t.need]);
  const active = available.some((t) => t.id === tab) ? tab : (available[0]?.id ?? 'arsip');
  void rev;

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold">FMM27 Pre-Game Editor</h1>
        <p className="mt-1 text-sm text-slate-400">Berjalan di HP, offline. File tidak pernah dikirim ke mana pun.</p>
      </header>

      <Card title="File">
        <ul className="space-y-2">
          {SLOTS.map((s) => {
            const f = files[s.id];
            const known = f ? identifyFile(f.size) : [];
            return (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0 text-sm">
                  <div className="font-semibold">{s.label}</div>
                  <div className="truncate text-xs text-slate-500">{f ? `${f.name} · ${formatBytes(f.size)}${known.length ? ` · ${known.map((k) => k.version).join('/')}` : ''}` : s.hint}</div>
                </div>
                {f ? <span className="text-xs text-emerald-400">✓</span> : <Btn disabled={!!loading} onClick={() => void pick(s.id)}>{loading === s.id ? 'Membaca…' : 'Pilih'}</Btn>}
              </li>
            );
          })}
        </ul>
        {loading === 'db' && <p className="mt-2 text-xs text-slate-400">Membaca klub, kompetisi, stadion… (beberapa detik)</p>}
        <Msg text={err} kind="err" />
        {(files.db || files.sc || files.logos || files.lib) && (
          <div className="mt-3"><Btn onClick={restart}>Mulai ulang (buang perubahan, pilih file lain)</Btn></div>
        )}
      </Card>

      {(files.db || files.sc || files.logos) && (
        <div className="sticky top-0 z-10 -mx-4 border-b border-slate-800 bg-slate-950/95 px-4 py-2 backdrop-blur">
          <div className="flex items-center gap-2 text-sm">
            <span className={`flex-1 ${changes ? 'text-amber-300' : 'text-slate-500'}`}>{changes ? `${changes} perubahan (belum disimpan)` : 'Belum ada perubahan'}</span>
            <Btn disabled={!ws.h.canUndo} onClick={() => { ws.h.undo(); bump(); }}>Urung</Btn>
            <Btn disabled={!ws.h.canRedo} onClick={() => { ws.h.redo(); bump(); }}>Ulang</Btn>
          </div>
          <nav className="mt-2 flex gap-1 overflow-x-auto pb-1">
            {available.map((t) => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`min-h-10 shrink-0 rounded-full px-3 text-sm ${active === t.id ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-300'}`}>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {active === 'klub' && files.db && <ClubsTab key={`k${rev}`} ws={ws} onChange={bump} />}
      {active === 'kompetisi' && files.db && <CompetitionsTab ws={ws} onChange={bump} />}
      {active === 'stadion' && files.db && <StadiumsTab ws={ws} onChange={bump} />}
      {active === 'rivalitas' && files.db && <RivalriesTab ws={ws} onChange={bump} />}
      {active === 'negara' && files.db && <NationsTab ws={ws} onChange={bump} />}
      {active === 'daftar' && files.sc && <ListsTab ws={ws} onChange={bump} rev={rev} />}
      {active === 'aturan' && files.sc && <RulesTab ws={ws} onChange={bump} rev={rev} />}
      {active === 'logo' && files.logos && <LogosTab ws={ws} onChange={bump} />}
      {active === 'wajah' && files.logos && <FacesTab target={files.logos} targetArc={ws.logos ?? null} />}
      {active === 'kode' && <CodeTab ws={ws} file={files.lib} />}
      {active === 'arsip' && (
        <>
          {(['db', 'sc', 'logos', 'lib'] as Slot[]).map((s) => files[s] && (
            <div key={s} className="space-y-3">
              <HashPanel key={`h-${s}`} file={files[s]!} />
              {s !== 'lib' && <ArchiveInfo key={`a-${s}`} file={files[s]!} />}
            </div>
          ))}
          {!files.db && !files.sc && !files.logos && !files.lib && <Card title="Arsip"><p className="text-sm text-slate-400">Pilih file di atas.</p></Card>}
        </>
      )}
      {active === 'simpan' && <SaveTab ws={ws} files={{ db: files.db, sc: files.sc, logos: files.logos }} />}

      <footer className="mt-auto text-xs text-slate-600">Fase 5 · semua modul · versi {__APP_BUILD__}</footer>
    </main>
  );
}
