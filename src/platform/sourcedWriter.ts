/**
 * Tulis keluaran multi-sumber (potongan baru + rentang dari file sumber) ke sebuah tujuan secara berurutan.
 *
 * Laporan Bacad 23 Nov: menulis pictures_logos ±1,4 GB macet di 32 % (4a) dan unduhan Blob tidak muncul (4b) di Chrome
 * Android. Penyebab (LIKELY): ratusan ribu Blob.slice kecil yang dirangkai jadi satu Blob. Di sini sumber dibaca
 * per JENDELA besar (arrayBuffer), disalin ke buffer keluaran 8 MB, lalu ditulis. Setiap baca diberi batas waktu,
 * jadi kalau Chrome berhenti membaca file, muncul pesan galat (bukan macet diam).
 */
export type SourceRange = { source: number; start: number; end: number };
export type OutputPart = Uint8Array | SourceRange;

export interface ChunkSink {
  write(chunk: Uint8Array): Promise<void>;
}

export interface WriteOptions {
  chunkSize?: number;
  windowSize?: number;
  readTimeoutMs?: number;
}

export type WriteProgress = (written: number, total: number) => void;

export function totalSize(parts: readonly OutputPart[]): number {
  return parts.reduce((n, p) => n + (p instanceof Uint8Array ? p.length : p.end - p.start), 0);
}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${what} tidak selesai dalam ${Math.round(ms / 1000)} detik (Chrome berhenti membaca file?)`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(t);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

export async function writeSourcedParts(
  parts: readonly OutputPart[],
  sources: readonly Blob[],
  sink: ChunkSink,
  onProgress?: WriteProgress,
  opts: WriteOptions = {},
): Promise<number> {
  const CHUNK = opts.chunkSize ?? 8 * 1024 * 1024;
  const WINDOW = opts.windowSize ?? 16 * 1024 * 1024;
  const TIMEOUT = opts.readTimeoutMs ?? 120_000;
  const total = totalSize(parts);
  const cache = new Map<number, { start: number; bytes: Uint8Array }>();
  let out = new Uint8Array(Math.min(CHUNK, Math.max(1, total)));
  let fill = 0;
  let written = 0;

  const flush = async () => {
    if (!fill) return;
    await withTimeout(sink.write(fill === out.length ? out : out.subarray(0, fill)), TIMEOUT, 'Menulis potongan file');
    written += fill;
    onProgress?.(written, total);
    out = new Uint8Array(Math.min(CHUNK, Math.max(1, total - written)));
    fill = 0;
  };
  const put = async (b: Uint8Array) => {
    let i = 0;
    while (i < b.length) {
      const n = Math.min(b.length - i, out.length - fill);
      out.set(b.subarray(i, i + n), fill);
      fill += n;
      i += n;
      if (fill === out.length) await flush();
    }
  };

  for (const p of parts) {
    if (p instanceof Uint8Array) {
      await put(p);
      continue;
    }
    const src = sources[p.source];
    if (!src) throw new Error(`Sumber ${p.source} tidak ada`);
    if (p.end > src.size) throw new Error(`Rentang ${p.start}-${p.end} melewati ukuran sumber ${p.source} (${src.size})`);
    let s = p.start;
    while (s < p.end) {
      let c = cache.get(p.source);
      if (!c || s < c.start || s >= c.start + c.bytes.length) {
        const e = Math.min(src.size, s + WINDOW);
        const bytes = new Uint8Array(await withTimeout(src.slice(s, e).arrayBuffer(), TIMEOUT, 'Membaca file sumber'));
        if (bytes.length !== e - s) throw new Error(`Baca file sumber ${p.source} kurang: ${bytes.length} dari ${e - s} byte`);
        c = { start: s, bytes };
        cache.set(p.source, c);
      }
      const from = s - c.start;
      const n = Math.min(p.end - s, c.bytes.length - from);
      await put(c.bytes.subarray(from, from + n));
      s += n;
    }
  }
  await flush();
  if (written !== total) throw new Error(`Tertulis ${written} byte, seharusnya ${total}`);
  return written;
}
