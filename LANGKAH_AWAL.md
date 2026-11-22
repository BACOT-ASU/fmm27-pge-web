# Langkah awal Bacad — FMM27 PGE (rencana v6)

Urutannya seperti membangun warung: sewa tempat (repo), pindahkan barang yang sudah ada (catatan + skrip), baru pasang etalase (aplikasi).

## A. Siapkan repo (sekali, ±15 menit)
1. Buat akun/masuk GitHub → **New repository** → nama `fmm27-pge-web` → **Private** → Create.
2. Ekstrak `fmm27-pge-web-starter.zip`. Isinya sudah tersusun:
   `CLAUDE.md`, `PROJECT_CONTEXT.md`, `LANGKAH_AWAL.md`, `CHANGELOG.md`, `.gitignore`, `research/format_specs/`, `scripts/`, `legacy/app/`, `data/`.
3. Upload semua isi zip ke repo (GitHub web: **Add file → Upload files**; seret seluruh folder).
   - Pastikan file `.gitignore` ikut (di HP kadang tersembunyi karena diawali titik).
   - **Jangan** upload file game (`.fmf`, `.dat`, `.so`, `.apk`).

## B. Catat file masukan (±10 menit, di HP)
4. Buka `research/format_specs/input_manifest.md`, isi ukuran + SHA-256 untuk file yang **sedang terpasang**:
   `db_archive_2706.fmf` (B7b), `sicomps.fmf` (B7b), `pictures_logos.fmf` (B7b), `libgame.so` (B2c).
   SHA-256 bisa dilihat di MT Manager (tekan lama file → Properties / Hash), atau nanti dari aplikasi di Fase 2.
5. Simpan salinan asli keempat file itu di folder `ORIGINAL/` di HP. Uji selalu pada salinan.

## C. Mulai sesi Claude Code
6. Buka Claude Code (web atau HP), hubungkan ke repo `fmm27-pge-web`.
7. **Sesi 01** — tempel prompt ini:
   ```
   PROJECT: FMM27 WEB-BASED PRE-GAME EDITOR
   Baca CLAUDE.md dan PROJECT_CONTEXT.md.
   TUGAS: Fase 0. Buat Vite + React + TypeScript strict + Tailwind, PWA (manifest + service worker),
   Vitest dengan proyek Node untuk src/core, aturan ESLint agar src/core bebas API browser,
   dan workflow GitHub Pages. Halaman awal cukup judul + tombol "Pilih file" yang menampilkan nama dan ukuran.
   Jangan menyentuh research/, scripts/, legacy/, data/. Perbarui CHANGELOG.md.
   ```
8. Aktifkan GitHub Pages (Settings → Pages → Source: GitHub Actions). Buka link-nya di Chrome HP → menu ⋮ → **Install app**.
9. **Sesi 02** (Fase 1–2): pecah panduan jadi spesifikasi per file, cek flag `sicomps.fmf`, port `legacy/app/fmmcore.js` ke `src/core/fmf/` dengan `ByteSource` + tes.

## D. Graphify (boleh belakangan)
10. Tidak wajib sekarang. Hubungkan setelah ada kode lumayan banyak (sekitar Fase 3).

## Yang tidak perlu dilakukan sekarang
- Tidak perlu menunggu B3 (`people.dat`). Aplikasi mulai dari Club Editor.
- Tidak perlu memutuskan Capacitor/Tauri.
- B7c **boleh** tetap dibuat dengan skrip Python di chat kalau ingin cepat; atau ditunda supaya jadi uji pertama aplikasi (Fase 6). Pilih salah satu.
