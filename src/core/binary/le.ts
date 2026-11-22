/** Pembantu baca/tulis little-endian. u64 dikembalikan sebagai number (aman sampai 2^53). */

export function view(b: Uint8Array): DataView {
  return new DataView(b.buffer, b.byteOffset, b.byteLength);
}

export function readU64(dv: DataView, p: number): number {
  const lo = dv.getUint32(p, true);
  const hi = dv.getUint32(p + 4, true);
  if (hi >= 0x200000) throw new RangeError(`u64 terlalu besar untuk number di offset ${p}`);
  return hi * 0x1_0000_0000 + lo;
}

export function writeU64(dv: DataView, p: number, v: number): void {
  if (!Number.isSafeInteger(v) || v < 0) throw new RangeError(`u64 tidak sah: ${v}`);
  dv.setUint32(p, v % 0x1_0000_0000, true);
  dv.setUint32(p + 4, Math.floor(v / 0x1_0000_0000), true);
}

export function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let q = 0;
  for (const p of parts) {
    out.set(p, q);
    q += p.length;
  }
  return out;
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
