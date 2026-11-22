# Changelog

## 2026-11-22 — Sesi 02 (Fase 1–2)
- Spesifikasi dipecah per file di `research/format_specs/`: `fmf_container.md`, `competition_dat.md`, `club_dat.md`, `db_archive_lainnya.md`, `comps_dbc.md`, `fmm_lists.md`, `logos.md`, `libgame_tables.md`, `status_verifikasi.md` (dengan label VERIFIED/LIKELY/HYPOTHESIS/UNKNOWN).
- `src/core/fmf/`: port kontainer `.fmf` dari `legacy/app/fmmcore.js` ke TypeScript dengan `ByteSource`:
  - `openFmf` (flag 0 **dan** 3; fmmcore.js hanya flag 0), `readEntry`/`readStoredEntry`, `parseToc`/`serializeToc`, `findEntry`, `listEntries`.
  - `patchFmf` (tambal di ujung; data lama dikembalikan sebagai rentang sumber, tidak disalin) + `materializeOutput`.
  - `splitInnerArchive` untuk arsip bersarang (prefix 8 byte, mis. `comps.dbc`).
- `src/core/zstd/`: dekompresi (fzstd) + frame raw multi-blok (memperbaiki batas 128 KiB per blok yang dilanggar `rawFrame` lama untuk data > 128 KiB).
- `src/core/hash/sha256.ts`: SHA-256 bertahap murni TS (untuk file 1,8 GB) + `src/core/versions.ts` (daftar ukuran file yang dikenal).
- Golden test: `scripts/golden/make_fmf_fixtures.py` membuat arsip sintetis flag 0/3 dengan `fmfio.py`; `tests/fmf.test.ts` membandingkan hasil TS, dan arsip hasil tambalan TS dibaca ulang oleh `fmfio.py` (`scripts/golden/read_fmf.py`). `tests/samples.test.ts` untuk file asli di `samples/` (dilewati kalau tidak ada).
- UI: setelah memilih file `.fmf` tampil flag, jumlah entri, daftar entri + pencarian, info `comps.dbc` (kalau ada); tombol "Hitung SHA-256" di Web Worker dengan progres dan tombol salin.
- CI: pasang Python + zstandard supaya golden test lintas bahasa ikut jalan.

## 2026-11-22 — Sesi 01 (Fase 0)
- Kerangka Vite 8 + React 19 + TypeScript 6 (strict) + Tailwind 4.
- PWA: manifest (nama, ikon 192/512/SVG, standalone) + service worker (vite-plugin-pwa, precache offline).
- `src/core/binary/`: antarmuka `ByteSource` + `byteSourceFromBytes`, `formatBytes`/`formatInt`, dengan tes.
- `src/platform/`: antarmuka `FileIO`, `Store`, `PickedFile`; implementasi web `webFileIO` (`<input type=file>`, unduhan Blob) dan `byteSourceFromBlob` (baca potongan via `Blob.slice`).
- Aturan ESLint: `src/core` dilarang memakai API browser (window, document, localStorage, indexedDB, Blob, dll.) dan dilarang mengimpor React/platform/ui. Sudah diuji: pelanggaran terdeteksi.
- Vitest: proyek `core` dijalankan di lingkungan Node.
- Halaman awal: tombol "Pilih file" menampilkan nama dan ukuran file.
- Workflow GitHub Actions: lint + tes + build; terbit ke GitHub Pages dari `main`.

## 2026-11-22
- Rencana v6 (`PROJECT_CONTEXT.md`): gabungan rencana PWA v5 + hasil mod Indonesia (panduan induk 22 Nov 2026).
- Starter repo: `CLAUDE.md`, `.gitignore`, `research/format_specs/` (panduan induk + template manifest), `scripts/` (Python), `legacy/app/` (fmmcore.js + editor logo), `data/` (dataset Indonesia).
