import { useState } from 'react';
import { formatBytes, formatInt } from '../core/binary/formatBytes';
import type { PickedFile } from '../platform/types';
import { webFileIO } from '../platform/web/webFileIO';
import { ArchiveInfo } from './ArchiveInfo';
import { HashPanel } from './HashPanel';
import { DatabaseExplorer } from './DatabaseExplorer';

export default function App() {
  const [file, setFile] = useState<PickedFile | null>(null);

  async function choose() {
    const picked = await webFileIO.pickFile({ accept: ['.fmf', '.dat', '.dbc', '.so'] });
    if (picked) setFile(picked);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold">FMM27 Pre-Game Editor</h1>
        <p className="mt-1 text-sm text-slate-400">
          Berjalan di HP, offline. File tidak pernah dikirim ke mana pun.
        </p>
      </header>

      <button
        type="button"
        onClick={choose}
        className="min-h-12 rounded-xl bg-emerald-600 px-4 text-base font-semibold active:bg-emerald-700"
      >
        Pilih file
      </button>

      {file && (
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">File terpilih</div>
          <div className="mt-1 break-all font-mono text-sm">{file.name}</div>
          <div className="mt-2 text-sm text-slate-300">
            {formatBytes(file.size)} <span className="text-slate-500">({formatInt(file.size)} byte)</span>
          </div>
        </section>
      )}
      {file && <HashPanel key={`h-${file.name}-${file.size}`} file={file} />}
      {file && /\.fmf$/i.test(file.name) && <ArchiveInfo key={`a-${file.name}-${file.size}`} file={file} />}
      {file && /db_archive.*\.fmf$/i.test(file.name) && <DatabaseExplorer key={`d-${file.name}-${file.size}`} file={file} />}

      <footer className="mt-auto text-xs text-slate-600">Fase 3 · penjelajah kompetisi & klub (baca saja)</footer>
    </main>
  );
}
