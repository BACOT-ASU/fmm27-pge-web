import { useMemo, useState } from 'react';
import { formatInt } from '../../core/binary/formatBytes';
import { NO_STADIUM } from '../../core/formats/club/clubDat';
import { nextStadiumUid } from '../../core/formats/stadium/stadiumDat';
import type { Workspace } from '../../core/workspace/workspace';
import { Btn, Card, ClubPicker, errText, ListEntryChecks, Msg, NumField, parseIntIn, StadiumPicker, TextField } from '../common';

export function StadiumsTab({ ws, onChange }: { ws: Workspace; onChange: () => void }) {
  const [q, setQ] = useState('');
  const [onlyIdn, setOnlyIdn] = useState(true);
  const [edit, setEdit] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const recs = ws.stadiums.records;
  const orig = ws.h.original<typeof ws.stadiums>('db:stadium.dat').records;
  // stadion yang dipakai klub (untuk keterangan "kandang")
  const users = useMemo(() => {
    const m = new Map<number, string[]>();
    for (const c of ws.clubs.records) if (c.stadium !== NO_STADIUM) m.set(c.stadium, [...(m.get(c.stadium) ?? []), c.longName]);
    return m;
  }, [ws.clubs]);
  const idnStadiums = useMemo(() => new Set(ws.clubs.records.filter((c) => c.nation === 58 && c.stadium !== NO_STADIUM).map((c) => c.stadium)), [ws.clubs]);
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    const out: number[] = [];
    for (let i = 0; i < recs.length && out.length < 80; i++) {
      const r = recs[i]!;
      if (n ? r.name.toLowerCase().includes(n) || String(r.uid) === n || String(i) === n : onlyIdn ? idnStadiums.has(i) || !orig[i] : false) out.push(i);
    }
    return out;
  }, [q, recs, onlyIdn, idnStadiums, orig]);

  return (
    <>
      <Card title={`Stadion (stadium.dat · ${formatInt(recs.length)} stadion)`}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama stadion / index / UID" className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm" />
        <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyIdn} onChange={(e) => setOnlyIdn(e.target.checked)} className="h-5 w-5" /> Tampilkan stadion klub Indonesia + stadion baru
        </label>
        <div className="mt-2"><Btn kind="primary" onClick={() => setAdding((x) => !x)}>{adding ? 'Tutup' : '+ Stadion baru'}</Btn></div>
        {adding && <NewStadium ws={ws} onDone={() => { setAdding(false); onChange(); }} />}
        <ul className="mt-3 space-y-2">
          {list.map((i) => {
            const r = recs[i]!;
            return (
              <li key={i} className={`rounded-lg border p-3 ${orig[i] !== r ? 'border-amber-600' : 'border-slate-800'}`}>
                <div className="flex justify-between gap-2"><span className="text-sm font-semibold">{r.name}</span><span className="text-xs text-slate-500">#{i} · UID {r.uid}{!orig[i] ? ' · BARU' : ''}</span></div>
                <div className="text-xs text-slate-500">
                  kapasitas {formatInt(r.capacity)} · maks {formatInt(r.maxCapacity)} · kota #{r.city}{r.altName ? ` · alias: ${r.altName}` : ''}
                  {users.get(i) && <span className="block">kandang: {users.get(i)!.join(', ')}</span>}
                </div>
                {edit === i ? <StadiumForm ws={ws} index={i} onDone={() => { setEdit(null); onChange(); }} /> : <div className="mt-2"><Btn onClick={() => setEdit(i)}>Edit</Btn></div>}
              </li>
            );
          })}
        </ul>
        {list.length === 0 && <p className="mt-3 text-sm text-slate-500">Ketik nama stadion untuk mencari.</p>}
      </Card>
    </>
  );
}

function StadiumForm({ ws, index, onDone }: { ws: Workspace; index: number; onDone: () => void }) {
  const r = ws.stadiums.records[index]!;
  const [f, setF] = useState({ name: r.name, altName: r.altName, cap: String(r.capacity), max: String(r.maxCapacity) });
  const [city, setCity] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  function apply() {
    try {
      if (!f.name.trim()) throw new Error('Nama wajib diisi');
      const capacity = parseIntIn('Kapasitas', f.cap, 0, 4294967295);
      const maxCapacity = parseIntIn('Kapasitas maks', f.max, 0, 4294967295);
      if (maxCapacity < capacity) throw new Error('Kapasitas maks harus ≥ kapasitas');
      ws.setStadium(index, { name: f.name.trim(), altName: f.altName.trim(), capacity, maxCapacity, ...(city !== null ? { city: ws.stadiums.records[city]!.city } : {}) });
      onDone();
    } catch (e) {
      setErr(errText(e));
    }
  }
  return (
    <div className="mt-2 space-y-2">
      <TextField label="Nama" value={f.name} onChange={(v) => setF((x) => ({ ...x, name: v }))} />
      <TextField label="Nama alternatif (boleh kosong)" value={f.altName} onChange={(v) => setF((x) => ({ ...x, altName: v }))} />
      <NumField label="Kapasitas" value={f.cap} onChange={(v) => setF((x) => ({ ...x, cap: v }))} />
      <NumField label="Kapasitas maksimal" value={f.max} onChange={(v) => setF((x) => ({ ...x, max: v }))} />
      <StadiumPicker ws={ws} label="Pinjam kota dari stadion (opsional)" value={city} onPick={setCity} />
      <Msg text={err} kind="err" />
      <div className="flex gap-2"><Btn kind="primary" onClick={apply}>Terapkan</Btn><Btn onClick={onDone}>Batal</Btn></div>
    </div>
  );
}

function NewStadium({ ws, onDone }: { ws: Workspace; onDone: () => void }) {
  const [f, setF] = useState({ name: '', altName: '', cap: '10000', max: '15000', uid: String(nextStadiumUid(ws.stadiums)) });
  const [cityFrom, setCityFrom] = useState<number | null>(null);
  const [club, setClub] = useState<number | null>(null);
  const [reg, setReg] = useState<string[]>(['IDN-0', 'IDN-1', 'IDN-2']);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setErr(null);
    try {
      if (!f.name.trim()) throw new Error('Nama wajib diisi');
      if (cityFrom === null) throw new Error('Pilih stadion terdekat untuk meminjam kota (city.dat tidak memuat nama kota)');
      const capacity = parseIntIn('Kapasitas', f.cap, 0, 4294967295);
      const maxCapacity = parseIntIn('Kapasitas maks', f.max, 0, 4294967295);
      if (maxCapacity < capacity) throw new Error('Kapasitas maks harus ≥ kapasitas');
      setBusy(true);
      await ws.addStadium({ uid: parseIntIn('UID', f.uid, 1, 4294967295), city: ws.stadiums.records[cityFrom]!.city, capacity, maxCapacity, name: f.name.trim(), altName: f.altName.trim() }, cityFrom, { registerIn: ws.sicomps ? reg : [], assignToClub: club ?? undefined });
      onDone();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-emerald-800 p-3">
      <TextField label="Nama stadion" value={f.name} onChange={(v) => setF((x) => ({ ...x, name: v }))} />
      <TextField label="Nama alternatif (boleh kosong)" value={f.altName} onChange={(v) => setF((x) => ({ ...x, altName: v }))} />
      <NumField label="Kapasitas" value={f.cap} onChange={(v) => setF((x) => ({ ...x, cap: v }))} />
      <NumField label="Kapasitas maksimal (B7a: 1,5 × kapasitas)" value={f.max} onChange={(v) => setF((x) => ({ ...x, max: v }))} />
      <NumField label="UID (otomatis lanjut dari 2000700201 dst.)" value={f.uid} onChange={(v) => setF((x) => ({ ...x, uid: v }))} />
      <StadiumPicker ws={ws} label="Kota dipinjam dari stadion terdekat" value={cityFrom} onPick={setCityFrom} />
      <ClubPicker ws={ws} label="Jadikan kandang klub (opsional)" value={club} onPick={setClub} />
      {ws.sicomps ? (
        <div className="text-xs text-slate-400">Daftarkan di sicomps fmm_stadiums:<ListEntryChecks value={reg} onChange={setReg} /></div>
      ) : (
        <p className="text-xs text-amber-300">sicomps.fmf belum dibuka: stadion baru belum terdaftar di fmm_stadiums. Buka sicomps supaya stadion ikut dimuat.</p>
      )}
      <Msg text={err} kind="err" />
      <Btn kind="primary" disabled={busy} onClick={() => void run()}>{busy ? 'Memproses…' : 'Tambah stadion'}</Btn>
      <span className="ml-2" />
      <Btn onClick={onDone}>Batal</Btn>
    </div>
  );
}
