import { useMemo, useState } from 'react';
import { formatInt } from '../core/binary/formatBytes';
import { INDONESIA_NATION_INDEX, isDatabaseArchive, loadDatabase, type Database } from '../core/db/loadDatabase';
import { openFmf } from '../core/fmf';
import { CLUB_STATUS, NO_STADIUM, type ClubRecord } from '../core/formats/club/clubDat';
import { COMPETITION_TYPE, type CompetitionRecord } from '../core/formats/competition/competitionDat';
import type { PickedFile } from '../platform/types';
import { Card } from './ArchiveInfo';

type State = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; db: Database; ms: number };

export function DatabaseExplorer({ file }: { file: PickedFile }) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function load() {
    setState({ kind: 'loading' });
    const t0 = performance.now();
    try {
      const arc = await openFmf(file.source);
      if (!isDatabaseArchive(arc)) throw new Error('Arsip ini tidak berisi club.dat dan competition.dat');
      // beri kesempatan tampilan menggambar status "membaca" dulu
      await new Promise((r) => setTimeout(r, 30));
      const db = await loadDatabase(arc);
      setState({ kind: 'ready', db, ms: Math.round(performance.now() - t0) });
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }

  if (state.kind === 'idle')
    return (
      <Card title="Database (baca saja)">
        <p className="text-sm text-slate-400">Baca competition.dat dan club.dat dari arsip ini.</p>
        <button type="button" onClick={load} className="mt-3 min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-semibold active:bg-emerald-800">
          Buka penjelajah database
        </button>
      </Card>
    );
  if (state.kind === 'loading') return <Card title="Database (baca saja)"><p className="text-sm text-slate-400">Membaca kompetisi dan klub… (bisa beberapa detik)</p></Card>;
  if (state.kind === 'error') return <Card title="Database (baca saja)"><p className="text-sm text-amber-400">{state.message}</p></Card>;
  return <Explorer db={state.db} ms={state.ms} />;
}

function Explorer({ db, ms }: { db: Database; ms: number }) {
  const comps = db.competitions.records;
  const nationName = useMemo(() => new Map(db.nations.map((n) => [n.index, n.name])), [db]);
  const nationsWithComps = useMemo(() => {
    const ids = [...new Set(comps.filter((c) => c.nation >= 0).map((c) => c.nation))];
    return ids.sort((a, b) => (nationName.get(a) ?? `~${a}`).localeCompare(nationName.get(b) ?? `~${b}`));
  }, [comps, nationName]);
  const [nation, setNation] = useState(nationsWithComps.includes(INDONESIA_NATION_INDEX) ? INDONESIA_NATION_INDEX : (nationsWithComps[0] ?? 0));
  const [compIdx, setCompIdx] = useState<number | null>(null);
  const [q, setQ] = useState('');

  const clubsByDiv = useMemo(() => {
    const m = new Map<number, ClubRecord[]>();
    for (const c of db.clubs.records) {
      const list = m.get(c.division);
      if (list) list.push(c);
      else m.set(c.division, [c]);
    }
    return m;
  }, [db]);

  const nationComps = useMemo(
    () => comps.filter((c) => c.nation === nation).sort((a, b) => Number(a.type > 1) - Number(b.type > 1) || a.level - b.level || a.index - b.index),
    [comps, nation],
  );

  const clubs: ClubRecord[] = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle) {
      const isNum = /^\d+$/.test(needle);
      return db.clubs.records.filter((c) => (isNum ? String(c.uid) === needle : c.longName.toLowerCase().includes(needle))).slice(0, 60);
    }
    if (compIdx === null) return [];
    if (compIdx === -1) return db.clubs.records.filter((c) => c.nation === nation && c.division === -1);
    return [...(clubsByDiv.get(compIdx) ?? [])].sort((a, b) => b.reputation - a.reputation);
  }, [q, compIdx, db, clubsByDiv, nation]);

  return (
    <>
      <Card title="Database (baca saja)">
        <p className="text-sm text-slate-300">
          {formatInt(comps.length)} kompetisi · {formatInt(db.clubs.records.length)} klub · {formatInt(db.nations.length)} negara
          <span className="text-slate-500"> · {formatInt(ms)} ms</span>
        </p>
        <label className="mt-3 block text-xs text-slate-500">
          Negara
          <select
            value={nation}
            onChange={(e) => {
              setNation(Number(e.target.value));
              setCompIdx(null);
            }}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100"
          >
            {nationsWithComps.map((n) => (
              <option key={n} value={n}>
                {nationName.get(n) ?? `Negara #${n}`} (index {n})
              </option>
            ))}
          </select>
        </label>
        <ul className="mt-3 divide-y divide-slate-800">
          {nationComps.map((c) => (
            <CompRow key={c.index} c={c} comps={comps} count={clubsByDiv.get(c.index)?.length ?? 0} active={compIdx === c.index} onPick={() => { setQ(''); setCompIdx(c.index); }} />
          ))}
          <li>
            <button type="button" onClick={() => { setQ(''); setCompIdx(-1); }} className={`min-h-11 w-full py-2 text-left text-sm ${compIdx === -1 ? 'text-emerald-400' : 'text-slate-400'}`}>
              Klub tanpa liga (divisi −1)
            </button>
          </li>
        </ul>
      </Card>

      <Card title="Klub">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari klub mana pun (nama atau UID)"
          className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm"
        />
        {clubs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Pilih kompetisi di atas, atau cari nama klub.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {clubs.map((c) => (
              <ClubCard key={c.uid} c={c} comps={comps} />
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function CompRow({ c, comps, count, active, onPick }: { c: CompetitionRecord; comps: CompetitionRecord[]; count: number; active: boolean; onPick: () => void }) {
  const parent = c.parent >= 0 ? comps[c.parent] : undefined;
  return (
    <li>
      <button type="button" onClick={onPick} className={`flex min-h-11 w-full items-start justify-between gap-2 py-2 text-left ${active ? 'text-emerald-400' : ''}`}>
        <span className={parent ? 'pl-4' : ''}>
          <span className="text-sm">{c.longName}</span>
          <span className="block text-xs text-slate-500">
            {COMPETITION_TYPE[c.type] ?? `jenis ${c.type}`}
            {c.level !== 100 ? ` · tingkat ${c.level + 1}` : ''} · rep {c.reputation} · UID {c.uid}
            {parent ? ` · induk: ${parent.shortName}` : ''}
          </span>
        </span>
        <span className="shrink-0 text-xs text-slate-500">{count} klub</span>
      </button>
    </li>
  );
}

function ClubCard({ c, comps }: { c: ClubRecord; comps: CompetitionRecord[] }) {
  const div = c.division >= 0 ? comps[c.division] : undefined;
  const staffFilled = c.staff.filter((x) => x > 0).length;
  return (
    <li className="rounded-lg border border-slate-800 bg-slate-950 p-3">
      <div className="flex justify-between gap-2">
        <span className="font-semibold">{c.longName}</span>
        <span className="text-xs text-slate-500">UID {c.uid}</span>
      </div>
      <div className="text-xs text-slate-500">{div ? div.longName : 'tanpa liga'}</div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
        <dt className="text-slate-500">Reputasi</dt>
        <dd>{formatInt(c.reputation)}</dd>
        <dt className="text-slate-500">Status</dt>
        <dd>{CLUB_STATUS[c.status] ?? c.status}</dd>
        <dt className="text-slate-500">Fasilitas latihan / akademi</dt>
        <dd>{c.trainingFacilities} / {c.youthFacilities}</dd>
        <dt className="text-slate-500">Penonton rata-rata</dt>
        <dd>{formatInt(c.attendanceAvg * 10)} <span className="text-slate-600">({formatInt(c.attendanceMin * 10)}–{formatInt(c.attendanceMax * 10)})</span></dd>
        <dt className="text-slate-500">Stadion (index)</dt>
        <dd className={c.stadium === NO_STADIUM ? 'text-amber-400' : ''}>{c.stadium === NO_STADIUM ? 'tidak ada' : c.stadium}</dd>
        <dt className="text-slate-500">Skuad / staf</dt>
        <dd>{c.squad.length} pemain · {staffFilled}/12 staf</dd>
        <dt className="text-slate-500">Blok keuangan</dt>
        <dd>{c.hasFinance ? 'ada' : 'tidak ada'}</dd>
      </dl>
    </li>
  );
}
