import { useState } from 'react';
import { formatBytes } from '../../core/binary/formatBytes';
import { FACES_FOLDER, mergeFacesIntoFmf, parseFaceMapCsv, type FaceMapRow } from '../../core/faces/mergeFaces';
import { findFolder, openFmf, type FmfArchive } from '../../core/fmf';
import type { PickedFile } from '../../platform/types';
import { saveSourcedParts, webFileIO } from '../../platform/web/webFileIO';
import { Btn, Card, errText, Msg } from '../common';

/**
 * Gabung wajah dari pictures_logos.fmf modder ke pictures_logos.fmf yang sedang dibuka (slot Logo).
 * Peta UID dibuat di luar aplikasi: scripts/map_faces_v2710.py → CSV (from,to_uid,...).
 */
export function FacesTab({ target, targetArc }: { target: PickedFile; targetArc: FmfArchive | null }) {
  const [donor, setDonor] = useState<{ file: PickedFile; arc: FmfArchive; faces: number } | null>(null);
  const [rows, setRows] = useState<FaceMapRow[] | null>(null);
  const [csvName, setCsvName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; k: 'ok' | 'err' } | null>(null);

  async function pickDonor() {
    setMsg(null);
    const f = await webFileIO.pickFile({ accept: ['.fmf'] });
    if (!f) return;
    try {
      const arc = await openFmf(f.source);
      const custom = findFolder(arc.root, `${FACES_FOLDER}/custom`);
      if (!custom) throw new Error(`Arsip ini tidak punya ${FACES_FOLDER}/custom`);
      setDonor({ file: f, arc, faces: custom.files.length });
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
    } catch (e) {
      setMsg({ t: errText(e), k: 'err' });
    }
  }

  async function run() {
    if (!targetArc || !donor || !rows) return;
    setBusy(true);
    setMsg(null);
    try {
      if (!target.blob || !donor.file.blob) throw new Error('File sumber tidak tersedia');
      const res = mergeFacesIntoFmf(targetArc, donor.arc, rows);
      await saveSourcedParts('pictures_logos.fmf', res.parts, [target.blob, donor.file.blob]);
      setMsg({
        t: `pictures_logos.fmf diunduh (${formatBytes(res.size)}): ${res.added} wajah dimasukkan` +
          (res.missing.length ? `, ${res.missing.length} file tidak ada di arsip modder` : '') +
          (res.duplicateUids.length ? `, ${res.duplicateUids.length} UID ganda dilewati` : '') +
          '. Masukkan ke APK dengan Level Store.',
        k: 'ok',
      });
    } catch (e) {
      setMsg({ t: errText(e), k: 'err' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Gabung wajah (dari pictures_logos modder)">
      <p className="text-xs text-slate-400">
        Tujuan: <b>{target.name}</b> (slot Logo). Wajah disalin langsung dari file modder tanpa dimuat utuh ke memori,
        lalu ditulis ke <code>{FACES_FOLDER}</code> dengan UID database kita. Belum diuji di game.
      </p>
      <div className="mt-2 space-y-2">
        <Btn full onClick={() => void pickDonor()}>{donor ? `Modder: ${donor.file.name} (${donor.faces} wajah)` : '1. Pilih pictures_logos.fmf modder'}</Btn>
        <label className="block text-sm">
          <span className="text-slate-300">2. Peta wajah (CSV dari Claude): {csvName ? `${csvName} (${rows?.length ?? 0} baris)` : 'belum dipilih'}</span>
          <input type="file" accept=".csv,text/csv" className="mt-1 block w-full text-xs" onChange={(e) => void pickCsv(e.target.files?.[0])} />
        </label>
        <Btn kind="primary" full disabled={busy || !donor || !rows || !targetArc} onClick={() => void run()}>
          {busy ? 'Menyiapkan…' : '3. Gabung & unduh pictures_logos.fmf'}
        </Btn>
      </div>
      <Msg text={msg?.t ?? null} kind={msg?.k} />
    </Card>
  );
}
