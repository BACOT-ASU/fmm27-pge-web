import type { HashMessage } from '../../workers/hashWorker';

/** Hitung SHA-256 file di Web Worker supaya tampilan tidak macet. */
export function hashFileInWorker(file: Blob, onProgress: (done: number, total: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../../workers/hashWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (ev: MessageEvent<HashMessage>) => {
      const m = ev.data;
      if (m.type === 'progress') onProgress(m.done, m.total);
      else {
        worker.terminate();
        if (m.type === 'done') resolve(m.sha256);
        else reject(new Error(m.message));
      }
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || 'Worker gagal'));
    };
    worker.postMessage({ file });
  });
}
