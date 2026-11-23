import { useMemo, useState } from 'react';
import { formatInt } from '../../core/binary/formatBytes';
import { INDONESIA_NATION_INDEX } from '../../core/db/loadDatabase';
import { clubsInCompetitionTree } from '../../core/edit/competitionTree';
import { CLUB_STATUS, NO_STADIUM, type ClubFixedField, type ClubRecord } from '../../core/formats/club/clubDat';
import { COMPETITION_TYPE, type CompetitionRecord } from '../../core/formats/competition/competitionDat';
import type { Workspace } from '../../core/workspace/workspace';
import { Btn, Card, errText, ListEntryChecks, Msg, NumField, parseIntIn, StadiumPicker, TextField } from '../common';

export function NationSelect({ ws, value, onChange }: { ws: Workspace; value: number; onChange: (n: number) => void }) {
  const comps = ws.competitions.records;
  const nationName = useMemo(() => new Map(ws.nations.map((n) => [n.index, n.name])), [ws.nations]);
  const ids = useMemo(() => [...new Set(comps.filter((c) => c.nation >= 0).map((c) => c.nation))].sort((a, b) => (nationName.get(a) ?? `~${a}`).localeCompare(nationName.get(b) ?? `~${b}`)), [comps, nationName]);
  return (
    <label className="block text-xs text-slate-500">
      Negara
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100">
        {ids.map((n) => (
          <option key={n} value={n}>{nationName.get(n) ?? `Negara #${n}`} (index {n})</option>
        ))}
      </select>
    </label>
  );
}

export function sortComps(list: CompetitionRecord[]): CompetitionRecord[] {
  return [...list].sort((a, b) => Number(a.type > 1) - Number(b.type > 1) || a.level - b.level || a.index - b.index);
}

export function ClubsTab({ ws, onChange }: { ws: Workspace; onChange: () => void }) {
  const [nation, setNation] = useState(INDONESIA_NATION_INDEX);
  const [compIdx, setCompIdx] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const comps = ws.competitions.records;
  const clubsRecs = ws.clubs.records;

  const clubsByDiv = useMemo(() => {
    const m = new Map<number, number[]>();
    clubsRecs.forEach((c, i) => {
      const l = m.get(c.division);
      if (l) l.push(i);
      else m.set(c.division, [i]);
    });
    return m;
  }, [clubsRecs]);
  const nationComps = useMemo(() => sortComps(comps.filter((c) => c.nation === nation)), [comps, nation]);
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (n) {
      const isNum = /^\d+$/.test(n);
      const out: number[] = [];
      for (let i = 0; i < clubsRecs.length && out.length < 60; i++) if (isNum ? String(clubsRecs[i]!.uid) === n : clubsRecs[i]!.longName.toLowerCase().includes(n)) out.push(i);
      return out;
    }
    if (compIdx === null) return [];
    if (compIdx === -1) return clubsRecs.flatMap((c, i) => (c.nation === nation && c.division === -1 ? [i] : []));
    return [...(clubsByDiv.get(compIdx) ?? [])].sort((a, b) => clubsRecs[b]!.reputation - clubsRecs[a]!.reputation);
  }, [q, compIdx, clubsRecs, clubsByDiv, nation]);
  const original = ws.h.original<{ records: ClubRecord[] }>('db:club.dat').records;
  const selected = compIdx !== null && compIdx >= 0 ? comps[compIdx] : undefined;

  return (
    <>
      <Card title="Klub">
        <NationSelect ws={ws} value={nation} onChange={(n) => { setNation(n); setCompIdx(null); }} />
        <ul className="mt-3 divide-y divide-slate-800">
          {nationComps.map((c) => (
            <li key={c.index}>
              <button type="button" onClick={() => { setQ(''); setCompIdx(c.index); }} className={`flex min-h-11 w-full justify-between gap-2 py-2 text-left ${compIdx === c.index ? 'text-emerald-400' : ''}`}>
                <span className={c.parent >= 0 ? 'pl-4' : ''}>
                  <span className="text-sm">{c.longName}</span>
                  <span className="block text-xs text-slate-500">{COMPETITION_TYPE[c.type] ?? `jenis ${c.type}`}{c.level !== 100 ? ` · tingkat ${c.level + 1}` : ''} · rep {c.reputation}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-500">{clubsByDiv.get(c.index)?.length ?? 0} klub</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => { setQ(''); setCompIdx(-1); }} className={`min-h-11 w-full py-2 text-left text-sm ${compIdx === -1 ? 'text-emerald-400' : 'text-slate-400'}`}>Klub tanpa liga (divisi −1)</button>
          </li>
        </ul>
      </Card>

      {selected && !q && <BatchPanel key={selected.index} ws={ws} comp={selected} onChange={onChange} />}

      <Card title="Daftar klub">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari klub mana pun (nama atau UID)" className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm" />
        {list.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Pilih kompetisi di atas, atau cari nama klub.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {list.map((i) => (
              <ClubCard key={i} ws={ws} index={i} orig={original[i]} onChange={onChange} />
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function ClubCard({ ws, index, orig, onChange }: { ws: Workspace; index: number; orig: ClubRecord | undefined; onChange: () => void }) {
  const c = ws.clubs.records[index]!;
  const [mode, setMode] = useState<'view' | 'edit' | 'clone'>('view');
  const comps = ws.competitions.records;
  const div = c.division >= 0 ? comps[c.division] : undefined;
  const st = c.stadium !== NO_STADIUM ? ws.stadiums.records[c.stadium] : undefined;
  const changed = !orig || orig !== c;
  const was = (f: keyof ClubRecord, fmt = (v: unknown) => String(v)) => (orig && orig[f] !== c[f] ? fmt(orig[f]) : undefined);

  return (
    <li className={`rounded-lg border bg-slate-950 p-3 ${changed ? 'border-amber-600' : 'border-slate-800'}`}>
      <div className="flex justify-between gap-2">
        <span className="font-semibold">{c.longName}</span>
        <span className="text-xs text-slate-500">UID {c.uid}{!orig ? ' · BARU' : ''}</span>
      </div>
      <div className="text-xs text-slate-500">{div ? div.longName : 'tanpa liga'} · #{index}</div>
      {mode === 'edit' && <ClubForm ws={ws} index={index} onDone={() => { setMode('view'); onChange(); }} />}
      {mode === 'clone' && <CloneForm ws={ws} index={index} onDone={() => { setMode('view'); onChange(); }} />}
      {mode === 'view' && (
        <>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
            <Row label="Reputasi" value={formatInt(c.reputation)} was={was('reputation', (v) => formatInt(v as number))} />
            <Row label="Status" value={CLUB_STATUS[c.status] ?? String(c.status)} was={was('status', (v) => CLUB_STATUS[v as number] ?? String(v))} />
            <Row label="Fasilitas latihan / akademi" value={`${c.trainingFacilities} / ${c.youthFacilities}`} was={orig && (orig.trainingFacilities !== c.trainingFacilities || orig.youthFacilities !== c.youthFacilities) ? `${orig.trainingFacilities} / ${orig.youthFacilities}` : undefined} />
            <Row label="Penonton rata-rata" value={`${formatInt(c.attendanceAvg * 10)} (${formatInt(c.attendanceMin * 10)}–${formatInt(c.attendanceMax * 10)})`} was={was('attendanceAvg', (v) => formatInt((v as number) * 10))} />
            <Row label="Stadion" value={st ? `${st.name} (${formatInt(st.capacity)})` : 'tidak ada'} was={was('stadium', (v) => (v === NO_STADIUM ? 'tidak ada' : (ws.stadiums.records[v as number]?.name ?? String(v))))} warn={!st} />
            <dt className="text-slate-500">Skuad / staf</dt>
            <dd>{c.squad.length} pemain · {c.staff.filter((x) => x > 0).length}/12 staf</dd>
            <dt className="text-slate-500">Blok keuangan</dt>
            <dd>{c.hasFinance ? 'ada' : 'tidak ada'}</dd>
          </dl>
          <div className="mt-2 flex gap-2">
            <Btn onClick={() => setMode('edit')}>Edit</Btn>
            <Btn onClick={() => setMode('clone')}>Klon jadi klub baru</Btn>
          </div>
        </>
      )}
    </li>
  );
}

function Row({ label, value, was, warn }: { label: string; value: string; was?: string; warn?: boolean }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className={was !== undefined ? 'text-amber-300' : warn ? 'text-amber-400' : ''}>
        {value}
        {was !== undefined && <span className="ml-1 text-slate-500 line-through">{was}</span>}
      </dd>
    </>
  );
}

const NUMS: { field: ClubFixedField; label: string; min: number; max: number; scale?: number }[] = [
  { field: 'reputation', label: 'Reputasi (0–10.000)', min: 0, max: 10000 },
  { field: 'trainingFacilities', label: 'Fasilitas latihan (1–20)', min: 1, max: 20 },
  { field: 'youthFacilities', label: 'Fasilitas akademi (1–20)', min: 1, max: 20 },
  { field: 'attendanceAvg', label: 'Penonton rata-rata', min: 0, max: 327670, scale: 10 },
  { field: 'attendanceMin', label: 'Penonton minimum', min: 0, max: 327670, scale: 10 },
  { field: 'attendanceMax', label: 'Penonton maksimum', min: 0, max: 327670, scale: 10 },
];

function ClubForm({ ws, index, onDone }: { ws: Workspace; index: number; onDone: () => void }) {
  const c = ws.clubs.records[index]!;
  const [status, setStatus] = useState(c.status);
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(NUMS.map((e) => [e.field, String(c[e.field] * (e.scale ?? 1))])));
  const [names, setNames] = useState({ longName: c.longName, shortName: c.shortName, code3: c.code3 });
  const [stadium, setStadium] = useState<number | null>(c.stadium === NO_STADIUM ? null : c.stadium);
  const [err, setErr] = useState<string | null>(null);

  async function apply() {
    try {
      const out: Partial<Record<ClubFixedField, number>> = { status };
      for (const e of NUMS) out[e.field] = Math.round(parseIntIn(e.label, vals[e.field] ?? '', e.min, e.max) / (e.scale ?? 1));
      const touched = (['attendanceMin', 'attendanceAvg', 'attendanceMax'] as const).some((f) => out[f] !== c[f]);
      if (touched && ((out.attendanceMin ?? 0) > (out.attendanceAvg ?? 0) || (out.attendanceAvg ?? 0) > (out.attendanceMax ?? 0))) throw new Error('Penonton: minimum ≤ rata-rata ≤ maksimum');
      out.stadium = stadium ?? NO_STADIUM;
      if (!names.longName.trim() || !names.shortName.trim()) throw new Error('Nama panjang dan pendek wajib diisi');
      if (names.longName.trim() !== c.longName || names.shortName.trim() !== c.shortName) await ws.loadLng();
      ws.setClub(index, out, { longName: names.longName.trim(), shortName: names.shortName.trim(), code3: names.code3.trim() });
      onDone();
    } catch (e) {
      setErr(errText(e));
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <TextField label="Nama panjang" value={names.longName} onChange={(v) => setNames((n) => ({ ...n, longName: v }))} />
      <TextField label="Nama pendek" value={names.shortName} onChange={(v) => setNames((n) => ({ ...n, shortName: v }))} />
      <TextField label="Kode 3 huruf" value={names.code3} onChange={(v) => setNames((n) => ({ ...n, code3: v.toUpperCase().slice(0, 3) }))} />
      <p className="text-xs text-slate-500">Ganti nama otomatis ikut diterapkan ke 16 file .lng.</p>
      <label className="block text-xs text-slate-400">
        Status
        <select value={status} onChange={(e) => setStatus(Number(e.target.value))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100">
          {Object.entries(CLUB_STATUS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
        </select>
      </label>
      {NUMS.map((e) => (
        <NumField key={e.field} label={e.label} value={vals[e.field] ?? ''} onChange={(v) => setVals((x) => ({ ...x, [e.field]: v }))} />
      ))}
      <StadiumPicker ws={ws} label="Stadion" value={stadium} onPick={setStadium} />
      {stadium !== null && <Btn onClick={() => setStadium(null)}>Lepas stadion</Btn>}
      <Msg text={err} kind="err" />
      <div className="flex gap-2">
        <Btn kind="primary" onClick={() => void apply()}>Terapkan</Btn>
        <Btn onClick={onDone}>Batal</Btn>
      </div>
      <p className="text-xs text-slate-500">Penonton disimpan game dalam kelipatan 10. Klub tanpa stadion → penonton bisa 0.</p>
    </div>
  );
}

function CloneForm({ ws, index, onDone }: { ws: Workspace; index: number; onDone: () => void }) {
  const tpl = ws.clubs.records[index]!;
  const comps = ws.competitions.records;
  const [uid, setUid] = useState(String(ws.nextClubUid()));
  const [f, setF] = useState({ longName: '', shortName: '', name6: '', code4: '', code3: '' });
  const [nation, setNation] = useState(tpl.nation);
  const [division, setDivision] = useState(tpl.division);
  const [reg, setReg] = useState<string[]>(['IDN-0', 'IDN-1', 'IDN-2']);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const leagues = sortComps(comps.filter((c) => c.nation === nation && c.type <= 1));

  async function run() {
    setErr(null);
    try {
      if (!f.longName.trim() || !f.shortName.trim()) throw new Error('Nama panjang dan pendek wajib diisi');
      const u = parseIntIn('UID', uid, 1, 4294967295);
      setBusy(true);
      await ws.cloneClub(index, {
        uid: u,
        longName: f.longName.trim(),
        shortName: f.shortName.trim(),
        name6: (f.name6 || f.shortName).trim().slice(0, 6).toUpperCase(),
        code4: (f.code4 || f.shortName).trim().slice(0, 4).toUpperCase(),
        code3: (f.code3 || f.shortName).trim().slice(0, 3).toUpperCase(),
        nation,
        division,
        registerIn: ws.sicomps ? reg : [],
      });
      onDone();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-slate-400">Klub baru dibuat dari salinan <b>{tpl.longName}</b> (warna, kit, status, fasilitas, reputasi ikut), ditaruh di ujung club.dat, skuad & staf kosong (diisi game). Nama ditambahkan ke 16 file .lng.</p>
      <NumField label="UID baru" value={uid} onChange={setUid} />
      <TextField label="Nama panjang" value={f.longName} onChange={(v) => setF((x) => ({ ...x, longName: v }))} />
      <TextField label="Nama pendek" value={f.shortName} onChange={(v) => setF((x) => ({ ...x, shortName: v }))} />
      <TextField label="Nama 6 huruf (opsional)" value={f.name6} onChange={(v) => setF((x) => ({ ...x, name6: v }))} />
      <TextField label="Kode 4 huruf (opsional)" value={f.code4} onChange={(v) => setF((x) => ({ ...x, code4: v }))} />
      <TextField label="Kode 3 huruf (opsional)" value={f.code3} onChange={(v) => setF((x) => ({ ...x, code3: v }))} />
      <NationSelect ws={ws} value={nation} onChange={setNation} />
      <label className="block text-xs text-slate-400">
        Liga
        <select value={division} onChange={(e) => setDivision(Number(e.target.value))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100">
          <option value={-1}>tanpa liga (−1)</option>
          {leagues.map((c) => (<option key={c.index} value={c.index}>{c.longName}</option>))}
        </select>
      </label>
      {ws.sicomps ? (
        <div className="text-xs text-slate-400">Daftarkan UID di sicomps fmm_clubs:<ListEntryChecks value={reg} onChange={setReg} /></div>
      ) : (
        <p className="text-xs text-amber-300">sicomps.fmf belum dibuka: klub baru belum didaftarkan di fmm_clubs (IDN-0/1/2). Buka sicomps dulu supaya klub ikut dimuat.</p>
      )}
      <p className="text-xs text-amber-300">Klub baru di liga butuh aturan comps.dbc yang menampung jumlah klub (ntms/retm). Cek tab Aturan.</p>
      <Msg text={err} kind="err" />
      <div className="flex gap-2">
        <Btn kind="primary" disabled={busy} onClick={() => void run()}>{busy ? 'Memproses…' : 'Buat klub'}</Btn>
        <Btn onClick={onDone}>Batal</Btn>
      </div>
    </div>
  );
}

const BATCH: { field: ClubFixedField; label: string; min: number; max: number }[] = [
  { field: 'status', label: 'Status (1 pro, 2 semi-pro, 3 amatir)', min: 1, max: 3 },
  { field: 'reputation', label: 'Reputasi', min: 0, max: 10000 },
  { field: 'trainingFacilities', label: 'Fasilitas latihan', min: 1, max: 20 },
  { field: 'youthFacilities', label: 'Fasilitas akademi', min: 1, max: 20 },
];

function BatchPanel({ ws, comp, onChange }: { ws: Workspace; comp: CompetitionRecord; onChange: () => void }) {
  const idx = useMemo(() => clubsInCompetitionTree(ws.clubs, ws.competitions, comp.index), [ws.clubs, ws.competitions, comp]);
  const [field, setField] = useState<ClubFixedField>('status');
  const [mode, setMode] = useState<'set' | 'min' | 'max'>('set');
  const [value, setValue] = useState('1');
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const spec = BATCH.find((f) => f.field === field)!;
  if (!idx.length) return null;

  function run() {
    try {
      const n = parseIntIn(spec.label, value, spec.min, spec.max);
      if (!confirm) return setConfirm(true);
      const changed = ws.batchClubs(idx, field, n, field === 'status' ? 'set' : mode);
      setConfirm(false);
      setMsg(changed ? `${changed} klub diubah. Bisa dibatalkan dengan Urung.` : 'Tidak ada klub yang berubah.');
      onChange();
    } catch (e) {
      setConfirm(false);
      setMsg(errText(e));
    }
  }

  return (
    <Card title={`Ubah massal · ${comp.shortName}`}>
      <p className="text-xs text-slate-400">Berlaku untuk {idx.length} klub di kompetisi ini beserta grup/turunannya.</p>
      <div className="mt-2 grid gap-2">
        <select value={field} onChange={(e) => { setField(e.target.value as ClubFixedField); setConfirm(false); }} className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm">
          {BATCH.map((f) => (<option key={f.field} value={f.field}>{f.label}</option>))}
        </select>
        {field !== 'status' && (
          <select value={mode} onChange={(e) => { setMode(e.target.value as 'set' | 'min' | 'max'); setConfirm(false); }} className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm">
            <option value="set">Samakan semua jadi</option>
            <option value="min">Naikkan yang di bawah (lantai)</option>
            <option value="max">Turunkan yang di atas (atap)</option>
          </select>
        )}
        <input inputMode="numeric" value={value} onChange={(e) => { setValue(e.target.value.replace(/[^\d]/g, '')); setConfirm(false); }} className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm" />
        <Btn kind={confirm ? 'warn' : 'plain'} onClick={run}>{confirm ? `Yakin? Ketuk lagi untuk ${idx.length} klub` : 'Terapkan ke semua'}</Btn>
      </div>
      {msg && <p className="mt-2 text-sm text-slate-300">{msg}</p>}
    </Card>
  );
}
