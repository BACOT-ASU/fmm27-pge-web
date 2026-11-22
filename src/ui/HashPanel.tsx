import { useState } from 'react';
import { identifyFile } from '../core/versions';
import type { PickedFile } from '../platform/types';
import { hashFileInWorker } from '../platform/web/hashFile';
import { Card } from './ArchiveInfo';

export function HashPanel({ file }: { file: PickedFile }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const known = identifyFile(file.size, hash ?? undefined);

  async function run() {
    if (!file.blob) return;
    setError(null);
    setHash(null);
    setProgress(0);
    try {
      setHash(await hashFileInWorker(file.blob, (d, t) => setProgress(t ? d / t : 1)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProgress(null);
    }
  }

  async function copy() {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tidak tersedia: pengguna bisa menyalin manual */
    }
  }

  return (
    <Card title="Versi & SHA-256">
      <p className="text-sm">
        {known.length ? (
          <>Cocok (dari ukuran): {known.map((k) => `${k.name} ${k.version}`).join(', ')}</>
        ) : (
          <span className="text-slate-400">Ukuran belum dikenal di daftar versi.</span>
        )}
      </p>
      {hash ? (
        <div className="mt-3">
          <div className="break-all font-mono text-xs">{hash}</div>
          <button type="button" onClick={copy} className="mt-2 min-h-11 rounded-lg bg-slate-800 px-4 text-sm active:bg-slate-700">
            {copied ? 'Tersalin' : 'Salin'}
          </button>
        </div>
      ) : progress !== null ? (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded bg-slate-800">
            <div className="h-full bg-emerald-500" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <div className="mt-1 text-xs text-slate-400">Menghitung… {Math.round(progress * 100)}%</div>
        </div>
      ) : (
        <button
          type="button"
          onClick={run}
          disabled={!file.blob}
          className="mt-3 min-h-11 rounded-lg bg-slate-800 px-4 text-sm active:bg-slate-700"
        >
          Hitung SHA-256
        </button>
      )}
      {error && <p className="mt-2 text-sm text-amber-400">{error}</p>}
    </Card>
  );
}
