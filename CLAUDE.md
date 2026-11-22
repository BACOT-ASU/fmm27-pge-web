# FMM27 PGE — Aturan untuk Claude Code

## Konteks
Baca `PROJECT_CONTEXT.md` dulu (rencana v6). Lingkup: buka file → baca → edit → simpan file. Tidak ada urusan APK/signing.
Sumber kebenaran format: `research/format_specs/` (utama: `fmm27_panduan_induk.md`) dan skrip Python di `scripts/`.
Prinsip: EVIDENCE FIRST. Jangan mengarang field/offset/format/klaim kompatibilitas.
Bahasa dokumentasi dan pesan ke pengguna: Bahasa Indonesia sederhana.

## Cara bekerja
1. Baca hanya file yang relevan (pakai Graphify kalau sudah terhubung). Jangan membaca seluruh repo.
2. Pisahkan VERIFIED/LIKELY dari HYPOTHESIS/UNKNOWN. Rujuk path file dan nama fungsi yang tepat.
3. Bagian format yang tidak dikenal = opaque bytes; jangan dibuang atau diubah.
4. Setiap adapter wajib punya: tes round-trip per entri (identik byte demi byte) + golden test terhadap skrip Python yang setara di `scripts/`.
5. Record baru (klub, stadion, kompetisi) hanya ditambahkan di ujung; rujukan antar file memakai index.
6. Tugas berulang → skrip di `scripts/`, jangan dikerjakan manual lewat chat.
7. Satu tugas = satu branch/commit kecil. Perbarui `CHANGELOG.md` dan dokumen terkait.
8. Jika bukti kurang, berhenti dan sebutkan file atau eksperimen yang dibutuhkan.
9. `legacy/` hanya acuan; jangan diubah.

## Konvensi
- TypeScript strict. Satu adapter per format di `src/core/formats/` (antarmuka `FormatAdapter`).
- `src/core/` murni: tanpa window/document/DOM/IndexedDB/localStorage. Data `Uint8Array`; file besar lewat `ByteSource`.
  Semua akses file/penyimpanan lewat `src/platform/` (`FileIO`, `Store`). Tes `core/` dijalankan di Node.
- Tidak ada file game di repo (`*.fmf *.dat *.dbc *.so *.apk`). Fixture hanya sintetis/potongan kecil.
- File game untuk tes lokal ditaruh di `samples/` (gitignored); tes yang butuh file itu dilewati otomatis kalau filenya tidak ada.
- Nama file dan fungsi deskriptif.
