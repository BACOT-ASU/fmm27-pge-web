/**
 * Global yang tersedia di SEMUA lingkungan target (browser, Web Worker, Node ≥ 18,
 * Capacitor, Tauri, Electron). Hanya ini yang boleh dipakai src/core di luar ES2022.
 * Jangan tambahkan API khusus browser di sini.
 */
declare class TextDecoder {
  constructor(label?: string, options?: { fatal?: boolean; ignoreBOM?: boolean });
  decode(input?: Uint8Array): string;
}
declare class TextEncoder {
  encode(input?: string): Uint8Array;
}
