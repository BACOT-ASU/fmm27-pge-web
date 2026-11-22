/** Masalah yang ditemukan validator/parser. */
export interface Issue {
  level: 'error' | 'warning' | 'info';
  message: string;
  /** Lokasi opsional, mis. "club.dat#123". */
  where?: string;
}

/**
 * Antarmuka adapter per format (PROJECT_CONTEXT.md 4.3).
 * Bagian yang tidak dikenal disimpan apa adanya (opaque bytes).
 */
export interface FormatAdapter<TModel> {
  id: string;
  /** Nama entri di arsip yang ditangani adapter ini, mis. "club.dat". */
  entryName: string;
  parse(bytes: Uint8Array): TModel;
  serialize(model: TModel): Uint8Array;
  validate(model: TModel): Issue[];
}
