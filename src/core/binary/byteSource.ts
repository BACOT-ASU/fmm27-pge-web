/**
 * Sumber byte dengan akses acak. Dipakai agar arsip besar (mis. pictures_logos.fmf 1,8 GB)
 * tidak perlu dimuat utuh ke memori. Implementasi per platform ada di src/platform/.
 */
export interface ByteSource {
  /** Ukuran total dalam byte. */
  readonly size: number;
  /** Baca byte [start, end). end tidak boleh melebihi size. */
  read(start: number, end: number): Promise<Uint8Array>;
}

/** ByteSource dari buffer yang sudah ada di memori (tes, file kecil). */
export function byteSourceFromBytes(bytes: Uint8Array): ByteSource {
  return {
    size: bytes.length,
    read(start, end) {
      checkRange(start, end, bytes.length);
      return Promise.resolve(bytes.subarray(start, end));
    },
  };
}

export function checkRange(start: number, end: number, size: number): void {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > size) {
    throw new RangeError(`Rentang baca tidak sah: [${start}, ${end}) dari ukuran ${size}`);
  }
}
