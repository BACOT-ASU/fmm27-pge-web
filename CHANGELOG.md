# Changelog

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
