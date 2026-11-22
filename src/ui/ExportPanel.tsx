import { useState } from 'react';
import { formatBytes } from '../core/binary/formatBytes';
import type { ClubChange, ClubEditSession } from '../core/edit/clubEditSession';
import { buildDocumentsZip, buildPatchedDbArchive, changeReportText } from '../core/export/clubExport';
import type { FmfArchive } from '../core/fmf';
import { CLUB_STATUS, serializeClubDat } from '../core/formats/club/clubDat';
import type { PickedFile } from '../platform/types';
import { saveOutputParts, webFileIO } from '../platform/web/webFileIO';
import { Card } from './ArchiveInfo';

const te = new TextEncoder();

function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

export function ExportPanel({ file, arc, session, changes, onClose }: { file: PickedFile; arc: FmfArchive; session: ClubEditSession; changes: ClubChange[]; onClose: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function report(now: Date) {
    return changeReportText(changes, { sourceName: file.name, sourceSize: file.size, createdAt: now });
  }

  async function run(kind: 'documents' | 'fmf' | 'report') {
    setError(null);
    setDone(null);
    setBusy(kind);
    try {
      const now = new Date();
      const tag = stamp(now);
      if (kind === 'report') {
        await webFileIO.saveFile(`LAPORAN_PERUBAHAN_${tag}.txt`, [te.encode(report(now))]);
        setDone('Laporan diunduh.');
        return;
      }
      const club = serializeClubDat(session.build());
      if (kind === 'documents') {
        await webFileIO.saveFile(`fmm27_documents_club_${tag}.zip`, [buildDocumentsZip(club, report(now))]);
        setDone('Paket Documents diunduh (cek folder Download).');
      } else {
        if (!file.blob) throw new Error('File sumber tidak tersedia untuk ditulis ulang');
        const out = buildPatchedDbArchive(arc, club);
        await saveOutputParts('db_archive_2706.fmf', out.parts, file.blob);
        setDone(`db_archive_2706.fmf diunduh (${formatBytes(out.size)}). Unduh juga laporannya untuk catatan.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card title="Simpan perubahan">
      <ul className="max-h-48 divide-y divide-slate-800 overflow-auto text-xs">
        {changes.slice(0, 100).map((c, i) => (
          <li key={i} className="py-1">
            <span className="font-semibold">{c.name}</span> · {c.field}:{' '}
            <span className="text-slate-500">{c.field === 'status' ? CLUB_STATUS[c.from] : c.from}</span> → <span className="text-amber-300">{c.field === 'status' ? CLUB_STATUS[c.to] : c.to}</span>
          </li>
        ))}
      </ul>
      {changes.length > 100 && <p className="text-xs text-slate-500">…dan {changes.length - 100} lainnya (lengkap di laporan).</p>}

      <div className="mt-3 space-y-3">
        <div>
          <button type="button" disabled={!!busy} onClick={() => run('documents')} className="min-h-12 w-full rounded-lg bg-emerald-700 px-4 text-sm font-semibold disabled:opacity-50">
            {busy === 'documents' ? 'Menyiapkan…' : 'Unduh paket Documents (uji cepat, tanpa APK)'}
          </button>
          <p className="mt-1 text-xs text-slate-400">
            Ekstrak zip, salin folder <code>db_archive_2706</code> ke <code>Android/data/com.netflix.NGP.FootballManagerMobile/files/Documents/</code>, lalu buat karier baru. Kalau daftar negara kosong: hapus data aplikasi (cadangkan save dulu). Hapus folder itu kalau sudah tidak dipakai.
          </p>
        </div>
        <div>
          <button type="button" disabled={!!busy} onClick={() => run('fmf')} className="min-h-12 w-full rounded-lg bg-slate-800 px-4 text-sm font-semibold disabled:opacity-50">
            {busy === 'fmf' ? 'Menyiapkan…' : 'Unduh db_archive_2706.fmf (untuk APK)'}
          </button>
          <p className="mt-1 text-xs text-amber-300">
            Ganti <code>assets/data/game/db_archive_2706.fmf</code> di APK dengan MT Manager memakai Level <b>Store</b> (tanpa kompresi), lalu sign ulang. Belum pernah diuji: arsip db yang ditulis aplikasi ini.
          </p>
        </div>
        <button type="button" disabled={!!busy} onClick={() => run('report')} className="min-h-11 w-full rounded-lg bg-slate-800 px-4 text-sm disabled:opacity-50">
          Unduh laporan perubahan (.txt)
        </button>
        <button type="button" onClick={onClose} className="min-h-11 w-full rounded-lg px-4 text-sm text-slate-400">
          Tutup
        </button>
      </div>
      {done && <p className="mt-2 text-sm text-emerald-400">{done}</p>}
      {error && <p className="mt-2 text-sm text-amber-400">{error}</p>}
      <p className="mt-2 text-xs text-slate-500">File asli yang kamu pilih tidak berubah. Perubahan terlihat di karier baru.</p>
    </Card>
  );
}
