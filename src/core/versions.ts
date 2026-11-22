/**
 * File FMM27 yang dikenal (gerbang versi). Sumber: panduan induk bagian 2, 8, 9.
 * SHA-256 diisi setelah dihitung dari file asli (lihat research/format_specs/input_manifest.md).
 */
export interface KnownFile {
  name: string;
  version: string;
  size: number;
  sha256?: string;
}

export const KNOWN_FILES: readonly KnownFile[] = [
  { name: 'db_archive_2706.fmf', version: 'B6b', size: 149_841_844 },
  {
    name: 'db_archive_2706.fmf',
    version: 'B7b (diduga)',
    size: 149_842_446,
    sha256: 'eb1d71647dd8de17ceaaf1b133a444717cda5268831c3ddbf4c1009f63bcf5cc',
  },
  { name: 'sicomps.fmf', version: 'B6', size: 49_619_693 },
  { name: 'pictures_logos.fmf', version: 'mod asli', size: 1_805_232_793 },
  { name: 'pictures_logos.fmf', version: 'B6', size: 1_815_037_846 },
  { name: 'pictures_logos.fmf', version: 'B7b', size: 1_818_029_973 },
  { name: 'libgame.so', version: 'B2c (ukuran sama dengan asli)', size: 52_355_608 },
];

/** Cocokkan berdasarkan SHA-256 (kalau ada) atau ukuran. */
export function identifyFile(size: number, sha256?: string): KnownFile[] {
  return KNOWN_FILES.filter((k) => (sha256 && k.sha256 ? k.sha256 === sha256 : k.size === size));
}
