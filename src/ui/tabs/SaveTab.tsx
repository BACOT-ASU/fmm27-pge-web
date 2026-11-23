import { useState } from 'react';
import { formatBytes } from '../../core/binary/formatBytes';
import { buildDbDocumentsZip, workspaceReportText } from '../../core/export/clubExport';
import type { FmfOutput } from '../../core/fmf';
import type { Workspace } from '../../core/workspace/workspace';
import type { PickedFile } from '../../platform/types';
import { saveOutputParts, webFileIO } from '../../platform/web/webFileIO';
import { Btn, Card, errText, Msg } from '../common';

const te = new TextEncoder();
function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

export function SaveTab({ ws, files }: { ws: Workspace; files: Record<'db' | 'sc' | 'logos', PickedFile | null> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ t: string; k: 'ok' | 'err' } | null>(null);
  const changes = ws.changes();
  const dbDirty = ws.dirty('db:').length > 0;
  const scDirty = ws.dirty('sc:').length > 0;
  const logoDirty = ws.dirty('logo:').length > 0;
  const lngDirty = ws.dirty('db:').includes('db:lng');
  // nama arsip db mengikuti file yang dibuka (27.0: db_archive_2706, 27.1.0: db_archive_2707)
  const dbName = ws.db?.root.name || 'db_archive_2706';
  const report = () => workspaceReportText(changes, { sources: Object.values(files).filter(Boolean).map((f) => `${f!.name} (${f!.size} byte)`), createdAt: new Date() });

  async function run(id: string, fn: () => Promise<string>) {
    setBusy(id);
    setMsg(null);
    try {
      setMsg({ t: await fn(), k: 'ok' });
    } catch (e) {
      setMsg({ t: errText(e), k: 'err' });
    } finally {
      setBusy(null);
    }
  }
  async function saveArchive(name: string, out: FmfOutput, src: PickedFile | null) {
    if (!src?.blob) throw new Error('File sumber tidak tersedia');
    await saveOutputParts(name, out.parts, src.blob);
    return `${name} diunduh (${formatBytes(out.size)}). Masukkan ke APK dengan Level Store.`;
  }

  if (!changes.length) return <Card title="Simpan"><p className="text-sm text-slate-400">Belum ada perubahan.</p></Card>;
  return (
    <>
      <Card title={`Perubahan (${changes.length})`}>
        <ul className="max-h-72 divide-y divide-slate-800 overflow-auto text-xs">
          {changes.slice(0, 300).map((c, i) => (
            <li key={i} className="py-1">
              <span className="text-slate-500">[{c.file}]</span> {c.what}
              {(c.from !== undefined || c.to !== undefined) && <>: <span className="text-slate-500">{c.from}</span> → <span className="text-amber-300">{c.to}</span></>}
            </li>
          ))}
        </ul>
      </Card>

      {dbDirty && (
        <Card title={`Database (${dbName}.fmf)`}>
          <Btn kind="primary" full disabled={!!busy} onClick={() => void run('docs', async () => {
            const tag = stamp(new Date());
            await webFileIO.saveFile(`fmm27_documents_db_${tag}.zip`, [buildDbDocumentsZip(ws.dbChangedEntries(), report(), dbName)]);
            return 'Paket Documents diunduh (cek folder Download).';
          })}>{busy === 'docs' ? 'Menyiapkan…' : 'Unduh paket Documents (uji cepat, tanpa APK)'}</Btn>
          <p className="mt-1 text-xs text-slate-400">Ekstrak, salin folder <code>{dbName}</code> ke <code className="break-all">Android/data/com.netflix.NGP.FootballManagerMobile/files/Documents/</code>, buat karier baru. Terbukti untuk club.dat; file lain memakai pola yang sama (belum diuji).{lngDirty && <span className="text-amber-300"> Ada perubahan .lng: jalur Documents untuk .lng belum pernah diuji — lebih aman pakai db_archive utuh.</span>}</p>
          <div className="mt-3" />
          <Btn full disabled={!!busy} onClick={() => void run('db', () => saveArchive(`${dbName}.fmf`, ws.buildDbFmf(), files.db))}>{busy === 'db' ? 'Menyiapkan…' : `Unduh ${dbName}.fmf (untuk APK)`}</Btn>
          <p className="mt-1 text-xs text-amber-300">Ganti <code>assets/data/game/{dbName}.fmf</code> dengan Level <b>Store</b>, lalu sign ulang.</p>
        </Card>
      )}

      {scDirty && (
        <Card title="Aturan & daftar muat (sicomps.fmf)">
          <Btn kind="primary" full disabled={!!busy} onClick={() => void run('sc', async () => saveArchive('sicomps.fmf', await ws.buildSicompsFmf(), files.sc))}>{busy === 'sc' ? 'Menyiapkan…' : 'Unduh sicomps.fmf (untuk APK)'}</Btn>
          <p className="mt-1 text-xs text-amber-300">Ganti <code>assets/shared/data/sicomps.fmf</code> dengan Level <b>Store</b>. Arsip dalam (comps.dbc, fmm_*.dat) ditulis aplikasi dengan frame zstd tanpa kompresi — belum diuji di game.</p>
        </Card>
      )}

      {logoDirty && (
        <Card title="Logo (pictures_logos.fmf)">
          <Btn kind="primary" full disabled={!!busy} onClick={() => void run('logo', () => saveArchive('pictures_logos.fmf', ws.buildLogosFmf(), files.logos))}>{busy === 'logo' ? 'Menyiapkan…' : 'Unduh pictures_logos.fmf (±1,8 GB, untuk APK)'}</Btn>
          <p className="mt-1 text-xs text-amber-300">Wajib <b>Store</b> di APK (kalau dikompres, game macet di splash). Pastikan ruang penyimpanan cukup.</p>
        </Card>
      )}

      <Card title="Laporan">
        <Btn full disabled={!!busy} onClick={() => void run('rep', async () => {
          await webFileIO.saveFile(`LAPORAN_PERUBAHAN_${stamp(new Date())}.txt`, [te.encode(report())]);
          return 'Laporan diunduh.';
        })}>Unduh laporan perubahan (.txt)</Btn>
      </Card>
      {msg && <Msg text={msg.t} kind={msg.k} />}
      <p className="text-xs text-slate-500">File asli yang kamu pilih tidak berubah. Perubahan terlihat di karier baru.</p>
    </>
  );
}
