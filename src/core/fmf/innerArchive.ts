import { hasFmfMagic } from './openFmf';

/**
 * Arsip bersarang (mis. comps.dbc di sicomps.fmf) = prefix 8 byte + kontainer .fmf.
 * Prefix yang dikenal: 03 01 "tad." 01 00 dan 03 01 "cbd." 04 00. Status: VERIFIED (dbcarc.load_dbc).
 */
export interface InnerArchiveParts {
  prefix: Uint8Array;
  archive: Uint8Array;
}

export const INNER_PREFIX_SIZE = 8;

export function splitInnerArchive(bytes: Uint8Array): InnerArchiveParts {
  if (bytes.length < INNER_PREFIX_SIZE + 26 || !hasFmfMagic(bytes, INNER_PREFIX_SIZE)) {
    throw new Error('Bukan arsip bersarang (tidak ada kontainer .fmf setelah prefix 8 byte)');
  }
  return { prefix: bytes.subarray(0, INNER_PREFIX_SIZE), archive: bytes.subarray(INNER_PREFIX_SIZE) };
}

/** Teks 4 huruf di prefix, dibaca terbalik: "tad." → "dat", "cbd." → "dbc". */
export function innerPrefixKind(prefix: Uint8Array): string {
  return String.fromCharCode(...Array.from(prefix.subarray(2, 6))).split('').reverse().join('').replace(/^\./, '');
}
