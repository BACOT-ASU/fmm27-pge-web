# Changelog

## 2026-11-22 — Sesi 03 (Fase 3, sebagian): adapter competition.dat + club.dat
- `src/core/formats/competition/competitionDat.ts`: parse/serialize (round-trip identik), ubah field tetap-ukuran (jenis, benua, negara, reputasi, tingkat, induk), ganti nama, validator (index urut, UID ganda, induk, nama > 21 huruf).
- `src/core/formats/club/clubDat.ts`: parse/serialize (round-trip identik), `withClubField` untuk negara, status, fasilitas, penonton, divisi, stadion, reputasi; `withClubNames`; validator (UID ganda, status, fasilitas, reputasi, divisi/stadion tidak ada, klub liga tanpa stadion). Setiap record menyimpan byte aslinya; bagian tak dikenal (kit, blok keuangan, daftar 21 byte, blok akhir) tidak disentuh.
- `src/core/formats/nation/nationNames.ts`: nama negara (LIKELY, hanya tampilan). `src/core/db/loadDatabase.ts`: muat kompetisi + klub + negara dari arsip.
- `src/core/binary/cursor.ts`: pembaca/penulis berurutan dengan pesan galat berposisi. `src/core/formats/types.ts`: `FormatAdapter`, `Issue`.
- Golden test: `scripts/golden/make_db_fixtures.py` membuat competition.dat/club.dat sintetis dan membacanya dengan `comp.py`/`club.py`; `tests/db.test.ts` mencocokkan semua field + round-trip + edit di tempat (maks 2 byte berubah). `scripts/golden/dump_db.py` + `tests/samples.test.ts` untuk db asli di `samples/`.
- UI: penjelajah database baca-saja untuk `db_archive*.fmf` — pilih negara (bawaan Indonesia), daftar kompetisi (jenis, tingkat, reputasi, induk, jumlah klub), kartu klub (reputasi, status, fasilitas, penonton, stadion, skuad/staf, blok keuangan), pencarian klub nama/UID.
- ESLint: variabel berawalan `_` boleh tidak dipakai.

## 2026-11-22 — Uji ulang sicomps.fmf (setelah perbaikan bigint)
- `sicomps.fmf` B7b terbuka di HP: flag 0, 1.489 entri; `comps.dbc` = arsip bersarang flag 3, 1.344 entri. Pertanyaan flag terjawab; dicatat di `input_manifest.md`, `status_verifikasi.md`, `fmf_container.md`, `comps_dbc.md`.

## 2026-11-22 — Perbaikan: waktu TOC > 2^53 (sicomps.fmf)
- Uji di HP: `sicomps.fmf` asli gagal dibuka ("u64 terlalu besar untuk number di offset 67"). Penyebab: kolom waktu di TOC sicomps bernilai > 2^53 (diduga FILETIME Windows), padahal pembaca menyimpannya sebagai `number`.
- `FmfEntry.time1/time2` sekarang `bigint` (dibaca/ditulis apa adanya). `patchFmf` tidak lagi menimpa waktu dengan detik Unix: entri yang diganti mempertahankan waktunya, entri baru meniru waktu entri lain di folder yang sama.
- Fixture sintetis ditambah entri berwaktu gaya FILETIME; tes baru memastikan nilai terbaca persis dan bertahan setelah ditambal.
- `pictures_logos.fmf` B7b terbaca di HP (flag 0, 142.934 entri); ukuran sicomps B7b (49.620.118) masuk daftar versi.

## 2026-11-22 — Uji file asli pertama
- Aplikasi terbit di `https://fmm27-pge-web.bcdsu1.workers.dev` (Cloudflare Worker static assets).
- `db_archive_2706.fmf` asli dibuka di HP: 149.842.446 byte, flag 0, 76 entri, SHA-256 `eb1d7164…bcf5cc`. Dicatat di `input_manifest.md` dan `src/core/versions.ts` (versi diduga B7b).

## 2026-11-22 — Analisa liga/kompetisi, koneksi data, award, dan jatah AFC
- Dokumen riset baru `research/format_specs/liga_kompetisi_award_afc.md`: status semua kompetisi Indonesia (aktif/dorman, termasuk liga U21/U18 yang dirancang developer tapi tidak pernah dibangun ke database), peta koneksi data antar file, temuan `awards.dat` (file baru yang belum pernah dibongkar, nihil entri untuk kompetisi Indonesia), dan analisis akar masalah jatah AFC (Indonesia tidak terdaftar di `nation_list` benua Asia untuk sistem koefisien 8 tahun / seeding 6-4-2).
- `research/format_specs/fmm27_panduan_induk.md` disinkronkan dengan panduan induk terbaru (section 10 item 4/4b/4c + section 12).
- Analisa murni, tidak ada perubahan ke file game.

## 2026-11-22 — Hosting Cloudflare Pages
- `wrangler.jsonc` + devDependency `wrangler`: dashboard Cloudflare membuat proyek Worker (static assets), bukan Pages; `npx wrangler deploy` menyajikan `dist/`.
- `base` Vite default jadi `/` (Cloudflare Pages/Netlify); `.node-version` = 22.
- Workflow GitHub tetap menjalankan lint/tes/build; terbit ke GitHub Pages hanya kalau variabel `DEPLOY_GH_PAGES=true` (berhenti gagal merah tiap push).

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
