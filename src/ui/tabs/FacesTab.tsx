import { useState } from 'react';
import { formatBytes } from '../../core/binary/formatBytes';
import { FACES_FOLDER, mergeFacesIntoFmf, parseFaceMapCsv, type FaceMapRow, type MergeFacesResult } from '../../core/faces/mergeFaces';
import { findFolder, openFmf, type FmfArchive } from '../../core/fmf';
import type { PickedFile } from '../../platform/types';
import { saveSourcedParts, saveSourcedPartsWithProgress, webFileIO } from '../../platform/web/webFileIO';
import { keepScreenOn } from '../../platform/web/wakeLock';
import { Btn, Card, errText, Msg } from '../common';

type Stage = 'idle' | 'processing' | 'processed' | 'writing' | 'done';

function Bar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="mt-2">
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="h-3 bg-emerald-600 transition-all" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-300">{label}</p>
    </div>
  );
}

/**
 * Gabung wajah dari pictures_logos.fmf modder ke pictures_logos.fmf yang sedang dibuka (slot Logo).
 * Dua tombol: PROSES (mencocokkan wajah & menyusun daftar isi, di memori) lalu UNDUH (menulis file ±1,4 GB).
 * Peta UID dibuat di luar aplikasi: scripts/map_faces_v2710.py → CSV (from,to_uid,...).
 */
export function FacesTab({ target, targetArc }: { target: PickedFile; targetArc: FmfArchive | null }) {
  const [donor, setDonor] = useState<{ file: PickedFile; arc: FmfArchive; faces: number } | null>(null);
  const [rows, setRows] = useState<FaceMapRow[] | null>(null);
  const [csvName, setCsvName] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [result, setResult] = useState<MergeFacesResult | null>(null);
  const [prog, setProg] = useState<{ pct: number; label: string } | null>(null);
  const [msg, setMsg] = useState<{ t: string; k: 'ok' | 'err' } | null>(null);
  const busy = stage === 'processing' || stage === 'writing';

  function resetResult() {
    setResult(null);
    setStage('idle');
    setProg(null);
  }

  async function pickDonor() {
    setMsg(null);
    const f = await webFileIO.pickFile({ accept: ['.fmf'] });
    if (!f) return;
    try {
      const arc = await openFmf(f.source);
      const custom = findFolder(arc.root, `${FACES_FOLDER}/custom`);
      if (!custom) throw new Error(`Arsip ini tidak punya ${FACES_FOLDER}/custom`);
      setDonor({ file: f, arc, faces: custom.files.length });
      resetResult();
    } catch (e) {
      setMsg({ t: errText(e), k: 'err' });
    }
  }

  async function pickCsv(file: File | undefined) {
    if (!file) return;
    try {
      const r = parseFaceMapCsv(await file.text());
      if (!r.length) throw new Error('CSV kosong atau tidak ada baris dengan to_uid');
      setRows(r);
      setCsvName(file.name);
      setMsg(null);
      resetResult();
    } catch (e) {
      setMsg({ t: errText(e), k: 'err' });
    }
  }

  async function process() {
    if (!targetArc || !donor || !rows || busy || result) return;
    setStage('processing');
    setMsg(null);
    setProg({ pct: 0, label: 'Langkah 1/2 · mencocokkan wajah & logo… 0%' });
    try {
      const res = await mergeFacesIntoFmf(targetArc, donor.arc, rows, (d, t) => {
        const pct = Math.round((d / t) * 100);
        setProg({ pct, label: `Langkah 1/2 · mencocokkan wajah & logo… ${pct}% (${d.toLocaleString('id-ID')} / ${t.toLocaleString('id-ID')})` });
      });
      setResult(res);
      setStage('processed');
      const by = (k: string) => (res.addedBy[k] ?? 0).toLocaleString('id-ID');
      setProg({
        pct: 100,
        label: `Proses selesai · wajah ${by('person/normal')}, logo klub ${by('club/normal')} (+ kecil ${by('club/small')}), logo kompetisi ${by('comp/normal')} (+ kecil ${by('comp/small')}). Ukuran file ${formatBytes(res.size)}. Tekan Unduh.`,
      });
      if (res.missing.length || res.duplicateUids.length) {
        setMsg({ t: `${res.missing.length} file tidak ada di arsip modder, ${res.duplicateUids.length} UID ganda dilewati.`, k: 'ok' });
      }
    } catch (e) {
      setStage('idle');
      setProg(null);
      setMsg({ t: errText(e), k: 'err' });
    }
  }

  /**
   * mode 'file'   : tulis langsung ke file pilihan (progres %). Berjalan di halaman → JANGAN tinggalkan Chrome.
   * mode 'chrome' : serahkan ke pengelola unduhan Chrome (Blob). Lebih tahan di latar belakang; progres di notifikasi Chrome.
   * Laporan Bacad 23 Nov: mode 'file' gagal saat Chrome dipindah ke latar belakang (tab dibekukan Android).
   */
  async function download(mode: 'file' | 'chrome') {
    if (!result || busy || !donor) return;
    setStage('writing');
    setMsg(null);
    let leftTab = false;
    const release = await keepScreenOn(() => {
      leftTab = true;
    });
    try {
      if (!target.blob || !donor.file.blob) throw new Error('File sumber tidak tersedia');
      if (mode === 'chrome') {
        setProg({ pct: 0, label: 'Menyiapkan unduhan untuk Chrome…' });
        await saveSourcedParts('pictures_logos.fmf', result.parts, [target.blob, donor.file.blob]);
        setStage('done');
        setProg({ pct: 100, label: 'Diserahkan ke pengelola unduhan Chrome.' });
        setMsg({ t: `Unduhan (${formatBytes(result.size)}) sekarang ditangani Chrome; progres ada di notifikasi unduhan dan boleh ditinggal. Tunggu sampai selesai, lalu masukkan ke APK dengan Level Store.`, k: 'ok' });
        return;
      }
      setProg({ pct: 0, label: 'Langkah 2/2 · menulis file… 0% (jangan tinggalkan Chrome)' });
      const how = await saveSourcedPartsWithProgress('pictures_logos.fmf', result.parts, [target.blob, donor.file.blob], (w, t) => {
        const pct = Math.floor((w / t) * 100);
        setProg({ pct, label: `Langkah 2/2 · menulis file… ${pct}% (${formatBytes(w)} / ${formatBytes(t)}) · jangan tinggalkan Chrome` });
      });
      setStage('done');
      if (how === 'file') {
        setProg({ pct: 100, label: `Selesai · pictures_logos.fmf tersimpan (${formatBytes(result.size)}).` });
        setMsg({ t: 'Masukkan ke APK dengan Level Store.', k: 'ok' });
      } else {
        setProg({ pct: 100, label: 'Diserahkan ke pengelola unduhan Chrome.' });
        setMsg({ t: `Browser ini tidak mendukung penulisan langsung, jadi progres penulisan (${formatBytes(result.size)}) terlihat di notifikasi unduhan Chrome. Tunggu sampai selesai, lalu masukkan ke APK dengan Level Store.`, k: 'ok' });
      }
    } catch (e) {
      setStage('processed');
      setProg({ pct: 100, label: 'Proses sudah selesai; unduhan gagal atau dibatalkan. Coba lagi, atau pakai "Unduh lewat Chrome".' });
      setMsg({
        t: (leftTab ? 'Chrome sempat ditinggal ke latar belakang sehingga penulisan terhenti. Pakai "Unduh lewat Chrome" kalau ingin bisa ditinggal. ' : '') + errText(e),
        k: 'err',
      });
    } finally {
      release();
    }
  }

  const canProcess = !!donor && !!rows && !!targetArc && !busy && !result;
  const canDownload = !!result && !busy;
  return (
    <Card title="Gabung wajah & logo (dari pictures_logos modder)">
      <p className="text-xs text-slate-400">
        Tujuan: <b>{target.name}</b> (slot Logo). Wajah (<code>{FACES_FOLDER}</code>), logo klub/timnas dan logo kompetisi
        disalin langsung dari file modder tanpa dimuat utuh ke memori, lalu ditulis dengan UID database kita. Pakai CSV
        peta aset dari Claude (format lama berisi wajah saja juga bisa). File hasil ±1,4 GB; menulisnya bisa makan beberapa
        menit. Belum diuji di game.
      </p>
      <div className="mt-2 space-y-2">
        <Btn full disabled={busy} onClick={() => void pickDonor()}>{donor ? `Modder: ${donor.file.name} (${donor.faces} wajah)` : '1. Pilih pictures_logos.fmf modder'}</Btn>
        <label className="block text-sm">
          <span className="text-slate-300">2. Peta aset (CSV dari Claude): {csvName ? `${csvName} (${rows?.length ?? 0} baris)` : 'belum dipilih'}</span>
          <input type="file" accept=".csv,text/csv" disabled={busy} className="mt-1 block w-full text-xs" onChange={(e) => void pickCsv(e.target.files?.[0])} />
        </label>
        <Btn kind={canProcess ? 'primary' : 'plain'} full disabled={!canProcess} onClick={() => void process()}>
          {stage === 'processing' ? 'Memproses…' : result ? '3. Proses ✓ (sudah selesai)' : '3. Proses'}
        </Btn>
        <Btn kind={canDownload ? 'primary' : 'plain'} full disabled={!canDownload} onClick={() => void download('file')}>
          {stage === 'writing' ? 'Menulis…' : '4a. Simpan langsung (ada persen, jangan tinggalkan Chrome)'}
        </Btn>
        <Btn full disabled={!canDownload} onClick={() => void download('chrome')}>
          4b. Unduh lewat Chrome (boleh ditinggal, progres di notifikasi)
        </Btn>
        <p className="text-xs text-slate-500">Layar dijaga tetap menyala selama 4a berjalan. Kalau HP sering membekukan Chrome, pakai 4b.</p>
      </div>
      {prog && <Bar pct={prog.pct} label={prog.label} />}
      <Msg text={msg?.t ?? null} kind={msg?.k} />
    </Card>
  );
}
