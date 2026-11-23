import { useMemo, useState } from 'react';
import { JOB_NAMES, PLAYER_ATTRS, PLAYER_POSITIONS, PLAYER_SIGNED_ATTRS, STAFF_NAMED, dayYearToIso, readContract, readNonPlayer, readPlayer } from '../../core/formats/people/fixedRecords';
import { PERSONALITY } from '../../core/formats/people/peopleDat';
import { nameAt } from '../../core/formats/people/namesDat';
import type { Workspace } from '../../core/workspace/workspace';
import { Btn, errText, Msg, NumField, TextField } from '../common';

/**
 * Isi klub (permintaan Bacad 23 Nov): manajer, staf, pemain tim utama & cadangan; ketuk nama → halaman edit orang.
 * Tim utama = daftar skuad club.dat; "cadangan" = pemain klub ini yang tidak ada di daftar skuad (game menaruhnya di
 * tim cadangan). Staf yang tampil di game = slot staf club.dat (log 63).
 */
export function RosterPanel({ ws, clubIndex, onChange }: { ws: Workspace; clubIndex: number; onChange: () => void }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [, setTick] = useState(0);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      await ws.loadPeople();
      setTick((t) => t + 1);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setLoading(false);
    }
  }

  if (!ws.peopleLoaded) {
    return (
      <div className="mt-2">
        <Btn disabled={loading} onClick={() => void load()}>{loading ? 'Memuat pemain & staf…' : 'Lihat pemain, manajer & staf'}</Btn>
        <Msg text={err} kind="err" />
      </div>
    );
  }
  if (open !== null) {
    return <PersonEditor ws={ws} index={open} onBack={() => setOpen(null)} onChange={onChange} />;
  }
  return <RosterList ws={ws} clubIndex={clubIndex} onOpen={setOpen} />;
}

function RosterList({ ws, clubIndex, onOpen }: { ws: Workspace; clubIndex: number; onOpen: (i: number) => void }) {
  const r = useMemo(() => ws.roster(clubIndex), [ws, clubIndex]);
  const playerLine = (i: number) => {
    const p = ws.person(i);
    if (p.playerIndex < 0) return '';
    const v = readPlayer(ws.players.records[p.playerIndex]!);
    const best = PLAYER_POSITIONS.filter((_, k) => v.positions[k]! >= 18).join('/') || '-';
    return `${best} · CA ${v.ca} · PA ${v.pa}`;
  };
  const sortByCa = (l: number[]) => [...l].sort((a, b) => {
    const pa = ws.person(a).playerIndex, pb = ws.person(b).playerIndex;
    return (pb >= 0 ? readPlayer(ws.players.records[pb]!).ca : 0) - (pa >= 0 ? readPlayer(ws.players.records[pa]!).ca : 0);
  });
  return (
    <div className="mt-2 rounded-lg border border-slate-800 p-2">
      <h4 className="text-xs font-semibold text-slate-400">Manajer</h4>
      <ul>{r.managers.length ? r.managers.map((i) => <PersonRow key={i} ws={ws} onOpen={onOpen} i={i} sub="Manajer" />) : <li className="px-2 text-xs text-amber-300">tidak ada</li>}</ul>
      <SlotList ws={ws} onOpen={onOpen} title="Pelatih & asisten" slots={r.coachSlots} />
      <SlotList ws={ws} onOpen={onOpen} title="Scout" slots={r.scoutSlots} />
      <SlotList ws={ws} onOpen={onOpen} title="Physio" slots={r.physioSlots} />
      {r.staffOutsideSlots.length > 0 && (
        <>
          <h4 className="mt-2 text-xs font-semibold text-amber-300">Staf klub ini di luar slot (tidak tampil di halaman Staff game)</h4>
          <ul>{r.staffOutsideSlots.map((i) => <PersonRow key={i} ws={ws} onOpen={onOpen} i={i} sub={JOB_NAMES[ws.jobOf(i)]} />)}</ul>
        </>
      )}
      <h4 className="mt-3 text-xs font-semibold text-slate-400">Tim utama — daftar skuad club.dat ({r.squad.length})</h4>
      <ul>{sortByCa(r.squad).map((i) => <PersonRow key={i} ws={ws} onOpen={onOpen} i={i} sub={playerLine(i)} />)}</ul>
      <h4 className="mt-3 text-xs font-semibold text-slate-400">Cadangan — pemain klub ini di luar daftar skuad ({r.outsideSquad.length})</h4>
      <p className="px-2 text-xs text-slate-500">Pemain cadangan buatan game tidak ada di database (dibuat saat karier dimulai).</p>
      <ul>{sortByCa(r.outsideSquad).map((i) => <PersonRow key={i} ws={ws} onOpen={onOpen} i={i} sub={playerLine(i)} />)}</ul>
    </div>
  );
}

function PersonRow({ ws, i, sub, onOpen }: { ws: Workspace; i: number; sub?: string; onOpen: (i: number) => void }) {
  return (
    <li>
      <button type="button" onClick={() => onOpen(i)} className="flex w-full min-h-10 items-center justify-between gap-2 rounded px-2 text-left text-sm hover:bg-slate-800">
        <span>{ws.personName(i)}</span>
        <span className="text-xs text-slate-500">{sub}</span>
      </button>
    </li>
  );
}

function SlotList({ ws, title, slots, onOpen }: { ws: Workspace; title: string; slots: number[]; onOpen: (i: number) => void }) {
  return (
    <>
      <h4 className="mt-2 text-xs font-semibold text-slate-400">{title} ({slots.filter((x) => x >= 0).length}/{slots.length} slot)</h4>
      <ul>{slots.filter((x) => x >= 0).map((i) => <PersonRow key={i} ws={ws} onOpen={onOpen} i={i} sub={JOB_NAMES[ws.jobOf(i)] ?? `jabatan ${ws.jobOf(i)}`} />)}</ul>
    </>
  );
}

function PersonEditor({ ws, index, onBack, onChange }: { ws: Workspace; index: number; onBack: () => void; onChange: () => void }) {
  const p = ws.person(index);
  const job = ws.jobOf(index);
  const ci = ws.contractOf(p.uid);
  const con = ci >= 0 ? readContract(ws.contracts.records[ci]!) : null;
  const pv = p.playerIndex >= 0 ? readPlayer(ws.players.records[p.playerIndex]!) : null;
  const nv = p.nonPlayerIndex >= 0 ? readNonPlayer(ws.nonPlayers.records[p.nonPlayerIndex]!) : null;
  const [f, setF] = useState(() => ({
    firstName: p.first !== 0xffffffff ? nameAt(ws.names('first'), p.first) : '',
    secondName: nameAt(ws.names('second'), p.second),
    commonName: p.common >= 0 ? nameAt(ws.names('common'), p.common) : '',
    dob: dayYearToIso(p.dobDay, p.dobYear),
    nation: String(p.nation),
    personality: p.personality.map(String),
    endDate: con ? dayYearToIso(con.endDay, con.endYear) : '',
    wage: con ? String(con.wage) : '',
    ca: String(pv?.ca ?? nv?.ca ?? ''),
    pa: String(pv?.pa ?? nv?.pa ?? ''),
    attrs: Object.fromEntries(PLAYER_ATTRS.map((k) => [k, String(pv?.attrs[k] ?? '')])) as Record<string, string>,
    positions: (pv?.positions ?? []).map(String),
    leftFoot: String(pv?.leftFoot ?? ''),
    rightFoot: String(pv?.rightFoot ?? ''),
    height: String(pv?.height ?? ''),
    weight: String(pv?.weight ?? ''),
    squadNumber: String(pv?.squadNumber ?? ''),
    staff: Object.fromEntries(Object.entries(nv?.attrs ?? {}).map(([o, v]) => [o, String(v)])) as Record<string, string>,
  }));
  const [msg, setMsg] = useState<{ t: string; k: 'ok' | 'err' } | null>(null);
  const nations = useMemo(() => [...ws.nations].sort((a, b) => a.name.localeCompare(b.name)), [ws]);
  const club = p.clubIndex >= 0 ? ws.clubs.records[p.clubIndex]?.longName : 'tanpa klub';
  const num = (s: string) => {
    const n = Number(s);
    if (!Number.isFinite(n) || s.trim() === '') throw new Error(`Angka tidak valid: "${s}"`);
    return Math.round(n);
  };

  function save() {
    try {
      ws.setPersonBasic(index, { firstName: f.firstName, secondName: f.secondName, commonName: f.commonName, dobIso: f.dob, nation: Number(f.nation), personality: f.personality.map(num) });
      if (pv) ws.setPlayer(index, {
        ca: num(f.ca), pa: num(f.pa), attrs: Object.fromEntries(PLAYER_ATTRS.map((k) => [k, num(f.attrs[k]!)])),
        positions: f.positions.map(num), leftFoot: num(f.leftFoot), rightFoot: num(f.rightFoot), height: num(f.height), weight: num(f.weight), squadNumber: num(f.squadNumber),
      });
      if (nv) ws.setNonPlayer(index, { ca: num(f.ca), pa: num(f.pa), attrs: Object.fromEntries(Object.entries(f.staff).map(([o, v]) => [Number(o), num(v)])) });
      if (con) ws.setContract(index, { endIso: f.endDate, wage: num(f.wage) });
      onChange();
      setMsg({ t: 'Tersimpan di ruang kerja. Unduh lewat tab Simpan.', k: 'ok' });
    } catch (e) {
      setMsg({ t: errText(e), k: 'err' });
    }
  }

  const grid = 'grid grid-cols-2 gap-2 sm:grid-cols-3';
  return (
    <div className="mt-2 rounded-lg border border-emerald-800 p-3">
      <div className="flex items-center justify-between gap-2">
        <Btn onClick={onBack}>← Kembali ke daftar</Btn>
        <span className="text-xs text-slate-500">UID {p.uid} · {JOB_NAMES[job] ?? (job ? `jabatan ${job}` : 'tanpa kontrak')} · {club}</span>
      </div>
      <h4 className="mt-3 text-sm font-semibold">{ws.personName(index)}</h4>
      <div className={`mt-2 ${grid}`}>
        <TextField label="Nama depan" value={f.firstName} onChange={(v) => setF({ ...f, firstName: v })} />
        <TextField label="Nama belakang" value={f.secondName} onChange={(v) => setF({ ...f, secondName: v })} />
        <TextField label="Nama umum (tampil di game, boleh kosong)" value={f.commonName} onChange={(v) => setF({ ...f, commonName: v })} />
        <TextField label="Tanggal lahir (YYYY-MM-DD)" value={f.dob} onChange={(v) => setF({ ...f, dob: v })} />
        <label className="block text-xs text-slate-500">
          Negara
          <select value={f.nation} onChange={(e) => setF({ ...f, nation: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100">
            {nations.map((n) => <option key={n.index} value={n.index}>{n.name}</option>)}
          </select>
        </label>
      </div>
      {con && (
        <div className={`mt-3 ${grid}`}>
          <TextField label="Kontrak sampai (YYYY-MM-DD)" value={f.endDate} onChange={(v) => setF({ ...f, endDate: v })} />
          <NumField label="Gaji per minggu" value={f.wage} onChange={(v) => setF({ ...f, wage: v })} />
        </div>
      )}
      {(pv || nv) && (
        <div className={`mt-3 ${grid}`}>
          <NumField label="CA (1–200)" value={f.ca} onChange={(v) => setF({ ...f, ca: v })} />
          <NumField label="PA (1–200)" value={f.pa} onChange={(v) => setF({ ...f, pa: v })} />
        </div>
      )}
      {pv && (
        <>
          <h5 className="mt-3 text-xs font-semibold text-slate-400">Posisi (1–20)</h5>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {PLAYER_POSITIONS.map((pos, k) => (
              <NumField key={pos} label={pos} value={f.positions[k] ?? ''} onChange={(v) => setF({ ...f, positions: f.positions.map((x, j) => (j === k ? v : x)) })} />
            ))}
          </div>
          <div className={`mt-3 ${grid}`}>
            <NumField label="Kaki kiri (1–20)" value={f.leftFoot} onChange={(v) => setF({ ...f, leftFoot: v })} />
            <NumField label="Kaki kanan (1–20)" value={f.rightFoot} onChange={(v) => setF({ ...f, rightFoot: v })} />
            <NumField label="Tinggi (cm)" value={f.height} onChange={(v) => setF({ ...f, height: v })} />
            <NumField label="Berat (kg)" value={f.weight} onChange={(v) => setF({ ...f, weight: v })} />
            <NumField label="Nomor punggung" value={f.squadNumber} onChange={(v) => setF({ ...f, squadNumber: v })} />
          </div>
          <h5 className="mt-3 text-xs font-semibold text-slate-400">Atribut (1–20; yang bertanda * disimpan −100..100, arti pasti belum diketahui)</h5>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PLAYER_ATTRS.map((k) => (
              <NumField key={k} label={`${k}${PLAYER_SIGNED_ATTRS.has(k) ? ' *' : ''}`} value={f.attrs[k] ?? ''} onChange={(v) => setF({ ...f, attrs: { ...f.attrs, [k]: v } })} />
            ))}
          </div>
        </>
      )}
      {nv && (
        <>
          <h5 className="mt-3 text-xs font-semibold text-slate-400">Atribut staf (0–20; nama yang belum dicocokkan dengan layar game ditulis a&lt;offset&gt;)</h5>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.keys(f.staff).map((o) => (
              <NumField key={o} label={STAFF_NAMED[Number(o)] ?? `a${o}`} value={f.staff[o] ?? ''} onChange={(v) => setF({ ...f, staff: { ...f.staff, [o]: v } })} />
            ))}
          </div>
        </>
      )}
      <h5 className="mt-3 text-xs font-semibold text-slate-400">Kepribadian (1–20)</h5>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PERSONALITY.map((k, j) => (
          <NumField key={k} label={k} value={f.personality[j] ?? ''} onChange={(v) => setF({ ...f, personality: f.personality.map((x, q) => (q === j ? v : x)) })} />
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Btn kind="primary" onClick={save}>Simpan perubahan</Btn>
        <Btn onClick={onBack}>Kembali</Btn>
      </div>
      <Msg text={msg?.t ?? null} kind={msg?.k} />
    </div>
  );
}
