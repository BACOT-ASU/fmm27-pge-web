import { useMemo, useState } from 'react';
import { formatInt } from '../core/binary/formatBytes';
import { INDONESIA_NATION_INDEX, isDatabaseArchive, loadDatabase, type Database } from '../core/db/loadDatabase';
import { ClubEditSession } from '../core/edit/clubEditSession';
import { clubsInCompetitionTree } from '../core/edit/competitionTree';
import { openFmf, type FmfArchive } from '../core/fmf';
import { CLUB_STATUS, NO_STADIUM, type ClubFixedField, type ClubRecord } from '../core/formats/club/clubDat';
import { COMPETITION_TYPE, type CompetitionRecord } from '../core/formats/competition/competitionDat';
import type { PickedFile } from '../platform/types';
import { Card } from './ArchiveInfo';
import { ExportPanel } from './ExportPanel';

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; db: Database; arc: FmfArchive; ms: number };

export function DatabaseExplorer({ file }: { file: PickedFile }) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function load() {
    setState({ kind: 'loading' });
    const t0 = performance.now();
    try {
      const arc = await openFmf(file.source);
      if (!isDatabaseArchive(arc)) throw new Error('Arsip ini tidak berisi club.dat dan competition.dat');
      await new Promise((r) => setTimeout(r, 30));
      const db = await loadDatabase(arc);
      setState({ kind: 'ready', db, arc, ms: Math.round(performance.now() - t0) });
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }

  if (state.kind === 'idle')
    return (
      <Card title="Database">
        <p className="text-sm text-slate-400">Baca dan edit kompetisi serta klub dari arsip ini.</p>
        <button type="button" onClick={load} className="mt-3 min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-semibold active:bg-emerald-800">
          Buka penjelajah database
        </button>
      </Card>
    );
  if (state.kind === 'loading') return <Card title="Database"><p className="text-sm text-slate-400">Membaca kompetisi dan klub… (bisa beberapa detik)</p></Card>;
  if (state.kind === 'error') return <Card title="Database"><p className="text-sm text-amber-400">{state.message}</p></Card>;
  return <Explorer db={state.db} arc={state.arc} ms={state.ms} file={file} />;
}

function Explorer({ db, arc, ms, file }: { db: Database; arc: FmfArchive; ms: number; file: PickedFile }) {
  // Objek sesi stabil (dibuat sekali); perubahan di dalamnya ditandai lewat `rev`.
  const [session] = useState(() => new ClubEditSession(db.clubs));
  const [rev, setRev] = useState(0);
  const bump = () => setRev((x) => x + 1);
  const [showExport, setShowExport] = useState(false);

  const comps = db.competitions.records;
  const nationName = useMemo(() => new Map(db.nations.map((n) => [n.index, n.name])), [db]);
  const nationsWithComps = useMemo(() => {
    const ids = [...new Set(comps.filter((c) => c.nation >= 0).map((c) => c.nation))];
    return ids.sort((a, b) => (nationName.get(a) ?? `~${a}`).localeCompare(nationName.get(b) ?? `~${b}`));
  }, [comps, nationName]);
  const [nation, setNation] = useState(nationsWithComps.includes(INDONESIA_NATION_INDEX) ? INDONESIA_NATION_INDEX : (nationsWithComps[0] ?? 0));
  const [compIdx, setCompIdx] = useState<number | null>(null);
  const [q, setQ] = useState('');

  // Divisi tidak bisa diubah dari layar ini, jadi pengelompokan memakai data asli.
  const clubsByDiv = useMemo(() => {
    const m = new Map<number, number[]>();
    db.clubs.records.forEach((c, i) => {
      const list = m.get(c.division);
      if (list) list.push(i);
      else m.set(c.division, [i]);
    });
    return m;
  }, [db]);

  const nationComps = useMemo(
    () => comps.filter((c) => c.nation === nation).sort((a, b) => Number(a.type > 1) - Number(b.type > 1) || a.level - b.level || a.index - b.index),
    [comps, nation],
  );

  const clubIdx: number[] = useMemo(() => {
    void rev;
    const needle = q.trim().toLowerCase();
    const recs = db.clubs.records;
    if (needle) {
      const isNum = /^\d+$/.test(needle);
      const out: number[] = [];
      for (let i = 0; i < recs.length && out.length < 60; i++) {
        const c = recs[i]!;
        if (isNum ? String(c.uid) === needle : c.longName.toLowerCase().includes(needle)) out.push(i);
      }
      return out;
    }
    if (compIdx === null) return [];
    if (compIdx === -1) return recs.flatMap((c, i) => (c.nation === nation && c.division === -1 ? [i] : []));
    return [...(clubsByDiv.get(compIdx) ?? [])].sort((a, b) => session.record(b).reputation - session.record(a).reputation);
  }, [q, compIdx, db, clubsByDiv, nation, session, rev]);

  const changes = useMemo(() => {
    void rev;
    return session.changes();
  }, [session, rev]);
  const changedClubs = new Set(changes.map((c) => c.index));
  const selectedComp = compIdx !== null && compIdx >= 0 ? comps[compIdx] : undefined;

  return (
    <>
      <div className="sticky top-0 z-10 -mx-4 border-b border-slate-800 bg-slate-950/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2 text-sm">
          <span className={`flex-1 ${changes.length ? 'text-amber-300' : 'text-slate-500'}`}>
            {changes.length ? `${changes.length} perubahan di ${changedClubs.size} klub (belum disimpan)` : 'Belum ada perubahan'}
          </span>
          <button type="button" disabled={!session.canUndo} onClick={() => { session.undo(); bump(); }} className="min-h-11 rounded-lg bg-slate-800 px-3 disabled:opacity-40">
            Urung
          </button>
          <button type="button" disabled={!session.canRedo} onClick={() => { session.redo(); bump(); }} className="min-h-11 rounded-lg bg-slate-800 px-3 disabled:opacity-40">
            Ulang
          </button>
          <button type="button" disabled={!changes.length} onClick={() => setShowExport((x) => !x)} className="min-h-11 rounded-lg bg-emerald-700 px-3 font-semibold disabled:opacity-40">
            Simpan
          </button>
        </div>
      </div>

      {showExport && changes.length > 0 && <ExportPanel file={file} arc={arc} session={session} changes={changes} onClose={() => setShowExport(false)} />}

      <Card title="Database">
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

      {selectedComp && !q && <BatchPanel key={selectedComp.index} comp={selectedComp} db={db} session={session} onChange={bump} />}

      <Card title="Klub">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari klub mana pun (nama atau UID)"
          className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm"
        />
        {clubIdx.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Pilih kompetisi di atas, atau cari nama klub.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {clubIdx.map((i) => (
              <ClubCard key={i} index={i} session={session} comps={comps} changed={changedClubs.has(i)} onChange={bump} />
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

/** Field yang bisa diedit dari kartu klub, dengan rentang dan pengali tampilan. */
const EDITABLE: { field: ClubFixedField; label: string; min: number; max: number; scale?: number }[] = [
  { field: 'reputation', label: 'Reputasi (0–10.000)', min: 0, max: 10000 },
  { field: 'trainingFacilities', label: 'Fasilitas latihan (1–20)', min: 1, max: 20 },
  { field: 'youthFacilities', label: 'Fasilitas akademi (1–20)', min: 1, max: 20 },
  { field: 'attendanceAvg', label: 'Penonton rata-rata', min: 0, max: 327670, scale: 10 },
  { field: 'attendanceMin', label: 'Penonton minimum', min: 0, max: 327670, scale: 10 },
  { field: 'attendanceMax', label: 'Penonton maksimum', min: 0, max: 327670, scale: 10 },
];

function ClubCard({ index, session, comps, changed, onChange }: { index: number; session: ClubEditSession; comps: CompetitionRecord[]; changed: boolean; onChange: () => void }) {
  const c = session.record(index);
  const orig = session.base.records[index]!;
  const [editing, setEditing] = useState(false);
  const div = c.division >= 0 ? comps[c.division] : undefined;
  const staffFilled = c.staff.filter((x) => x > 0).length;

  return (
    <li className={`rounded-lg border bg-slate-950 p-3 ${changed ? 'border-amber-600' : 'border-slate-800'}`}>
      <div className="flex justify-between gap-2">
        <span className="font-semibold">{c.longName}</span>
        <span className="text-xs text-slate-500">UID {c.uid}</span>
      </div>
      <div className="text-xs text-slate-500">{div ? div.longName : 'tanpa liga'}</div>
      {editing ? (
        <ClubForm club={c} onCancel={() => setEditing(false)} onApply={(values) => {
          session.setMany(index, values);
          setEditing(false);
          onChange();
        }} />
      ) : (
        <>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
            <Row label="Reputasi" value={formatInt(c.reputation)} was={c.reputation !== orig.reputation ? formatInt(orig.reputation) : undefined} />
            <Row label="Status" value={CLUB_STATUS[c.status] ?? String(c.status)} was={c.status !== orig.status ? (CLUB_STATUS[orig.status] ?? String(orig.status)) : undefined} />
            <Row
              label="Fasilitas latihan / akademi"
              value={`${c.trainingFacilities} / ${c.youthFacilities}`}
              was={c.trainingFacilities !== orig.trainingFacilities || c.youthFacilities !== orig.youthFacilities ? `${orig.trainingFacilities} / ${orig.youthFacilities}` : undefined}
            />
            <Row
              label="Penonton rata-rata"
              value={`${formatInt(c.attendanceAvg * 10)} (${formatInt(c.attendanceMin * 10)}–${formatInt(c.attendanceMax * 10)})`}
              was={c.attendanceAvg !== orig.attendanceAvg || c.attendanceMin !== orig.attendanceMin || c.attendanceMax !== orig.attendanceMax ? formatInt(orig.attendanceAvg * 10) : undefined}
            />
            <dt className="text-slate-500">Stadion (index)</dt>
            <dd className={c.stadium === NO_STADIUM ? 'text-amber-400' : ''}>{c.stadium === NO_STADIUM ? 'tidak ada' : c.stadium}</dd>
            <dt className="text-slate-500">Skuad / staf</dt>
            <dd>{c.squad.length} pemain · {staffFilled}/12 staf</dd>
            <dt className="text-slate-500">Blok keuangan</dt>
            <dd>{c.hasFinance ? 'ada' : 'tidak ada'}</dd>
          </dl>
          <button type="button" onClick={() => setEditing(true)} className="mt-2 min-h-11 rounded-lg bg-slate-800 px-4 text-sm active:bg-slate-700">
            Edit
          </button>
        </>
      )}
    </li>
  );
}

function Row({ label, value, was }: { label: string; value: string; was?: string }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className={was !== undefined ? 'text-amber-300' : ''}>
        {value}
        {was !== undefined && <span className="ml-1 text-slate-500 line-through">{was}</span>}
      </dd>
    </>
  );
}

function ClubForm({ club, onApply, onCancel }: { club: ClubRecord; onApply: (v: Partial<Record<ClubFixedField, number>>) => void; onCancel: () => void }) {
  const [status, setStatus] = useState(club.status);
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(EDITABLE.map((e) => [e.field, String(club[e.field] * (e.scale ?? 1))])),
  );
  const [error, setError] = useState<string | null>(null);

  function apply() {
    const out: Partial<Record<ClubFixedField, number>> = { status };
    for (const e of EDITABLE) {
      const n = Number(vals[e.field]);
      if (!Number.isFinite(n) || n < e.min || n > e.max) {
        setError(`${e.label}: isi angka ${formatInt(e.min)}–${formatInt(e.max)}`);
        return;
      }
      out[e.field] = Math.round(n / (e.scale ?? 1));
    }
    const attendanceTouched = (['attendanceMin', 'attendanceAvg', 'attendanceMax'] as const).some((f) => out[f] !== club[f]);
    if (attendanceTouched && ((out.attendanceMin ?? 0) > (out.attendanceAvg ?? 0) || (out.attendanceAvg ?? 0) > (out.attendanceMax ?? 0))) {
      setError('Penonton: minimum ≤ rata-rata ≤ maksimum');
      return;
    }
    onApply(out);
  }

  return (
    <div className="mt-2 space-y-2">
      <label className="block text-xs text-slate-400">
        Status
        <select value={status} onChange={(e) => setStatus(Number(e.target.value))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100">
          {Object.entries(CLUB_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </label>
      {EDITABLE.map((e) => (
        <label key={e.field} className="block text-xs text-slate-400">
          {e.label}
          <input
            inputMode="numeric"
            value={vals[e.field]}
            onChange={(ev) => setVals((v) => ({ ...v, [e.field]: ev.target.value.replace(/[^\d]/g, '') }))}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
          />
        </label>
      ))}
      {error && <p className="text-sm text-amber-400">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={apply} className="min-h-11 flex-1 rounded-lg bg-emerald-700 text-sm font-semibold">Terapkan</button>
        <button type="button" onClick={onCancel} className="min-h-11 flex-1 rounded-lg bg-slate-800 text-sm">Batal</button>
      </div>
      <p className="text-xs text-slate-500">Penonton disimpan game dalam kelipatan 10.</p>
    </div>
  );
}

const BATCH_FIELDS: { field: ClubFixedField; label: string; min: number; max: number }[] = [
  { field: 'status', label: 'Status (1 pro, 2 semi-pro, 3 amatir)', min: 1, max: 3 },
  { field: 'reputation', label: 'Reputasi', min: 0, max: 10000 },
  { field: 'trainingFacilities', label: 'Fasilitas latihan', min: 1, max: 20 },
  { field: 'youthFacilities', label: 'Fasilitas akademi', min: 1, max: 20 },
];

function BatchPanel({ comp, db, session, onChange }: { comp: CompetitionRecord; db: Database; session: ClubEditSession; onChange: () => void }) {
  const indices = useMemo(() => clubsInCompetitionTree(db.clubs, db.competitions, comp.index), [db, comp]);
  const [field, setField] = useState<ClubFixedField>('status');
  const [mode, setMode] = useState<'set' | 'min' | 'max'>('set');
  const [value, setValue] = useState('1');
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const spec = BATCH_FIELDS.find((f) => f.field === field)!;

  function run() {
    const n = Number(value);
    if (!Number.isInteger(n) || n < spec.min || n > spec.max) {
      setMsg(`Isi angka ${spec.min}–${formatInt(spec.max)}`);
      setConfirm(false);
      return;
    }
    if (!confirm) {
      setConfirm(true);
      setMsg(null);
      return;
    }
    const changed = session.batch(indices, field, n, field === 'status' ? 'set' : mode);
    setConfirm(false);
    setMsg(changed ? `${changed} klub diubah. Bisa dibatalkan dengan tombol Urung.` : 'Tidak ada klub yang berubah.');
    onChange();
  }

  if (indices.length === 0) return null;
  return (
    <Card title={`Ubah massal · ${comp.shortName}`}>
      <p className="text-xs text-slate-400">Berlaku untuk {indices.length} klub di kompetisi ini beserta grup/turunannya.</p>
      <div className="mt-2 grid grid-cols-1 gap-2">
        <select value={field} onChange={(e) => { setField(e.target.value as ClubFixedField); setConfirm(false); }} className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm">
          {BATCH_FIELDS.map((f) => (
            <option key={f.field} value={f.field}>{f.label}</option>
          ))}
        </select>
        {field !== 'status' && (
          <select value={mode} onChange={(e) => { setMode(e.target.value as 'set' | 'min' | 'max'); setConfirm(false); }} className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm">
            <option value="set">Samakan semua jadi</option>
            <option value="min">Naikkan yang di bawah (lantai)</option>
            <option value="max">Turunkan yang di atas (atap)</option>
          </select>
        )}
        <input inputMode="numeric" value={value} onChange={(e) => { setValue(e.target.value.replace(/[^\d]/g, '')); setConfirm(false); }} className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm" />
        <button type="button" onClick={run} className={`min-h-11 rounded-lg text-sm font-semibold ${confirm ? 'bg-amber-600' : 'bg-slate-800'}`}>
          {confirm ? `Yakin? Ketuk lagi untuk mengubah ${indices.length} klub` : 'Terapkan ke semua'}
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-slate-300">{msg}</p>}
    </Card>
  );
}
