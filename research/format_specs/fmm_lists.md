# Spesifikasi: daftar muat `sicomps/2700/fmm_*.dat`

Sumber: panduan induk §6.5, §4.9; skrip `scripts/fmmlists.py`, `fmmdat.py`.

## Identifikasi — VERIFIED
6 file: `fmm_comps`, `fmm_clubs`, `fmm_reserve_clubs`, `fmm_cities`, `fmm_stadiums`, `fmm_people`. Masing-masing arsip bersarang (prefix 8 byte + `.fmf`) berisi entri `<NEGARA>-<n>.dat`.

## Isi entri — VERIFIED
Daftar UID: u32 jumlah di offset 8, lalu jumlah × u32 UID (offset 12). n = kedalaman strata (0 = strata 1 saja). Indonesia: `IDN-0`, `IDN-1`, `IDN-2`.

## Aturan tulis — VERIFIED
Kompetisi/klub/stadion/orang baru harus ditambahkan ke daftar negara terkait supaya ikut dimuat. B7b: 32 UID orang Indonesia ditambah ke `fmm_people` IDN-0/1/2 (14.572 → 14.604).

## Unknown
- 8 byte pertama tiap entri (sebelum u32 jumlah).
- Flag arsip bersarang (0/3) dan apakah isi entri terkompresi: `fmmlists.py` memakai heuristik (cari magic zstd di 8 byte pertama). → cek dengan aplikasi.
