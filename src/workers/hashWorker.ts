/// <reference lib="webworker" />
import { sha256OfSource } from '../core/hash/sha256';
import { byteSourceFromBlob } from '../platform/web/webFileIO';

export type HashRequest = { file: Blob };
export type HashMessage = { type: 'progress'; done: number; total: number } | { type: 'done'; sha256: string } | { type: 'error'; message: string };

self.onmessage = async (ev: MessageEvent<HashRequest>) => {
  const post = (m: HashMessage) => self.postMessage(m);
  try {
    let last = 0;
    const sha256 = await sha256OfSource(byteSourceFromBlob(ev.data.file), (done, total) => {
      const now = Date.now();
      if (now - last > 200 || done === total) {
        last = now;
        post({ type: 'progress', done, total });
      }
    });
    post({ type: 'done', sha256 });
  } catch (e) {
    post({ type: 'error', message: e instanceof Error ? e.message : String(e) });
  }
};
