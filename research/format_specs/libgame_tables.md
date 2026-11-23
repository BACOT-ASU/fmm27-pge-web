# Spesifikasi: tabel di `libgame.so` (hanya dibaca)

Sumber: panduan induk §7; Project `claude/tambalan-libgame-negara-dan-strata.md`.
Mengubah `libgame.so` di luar lingkup aplikasi. Aplikasi hanya boleh **membaca** dan memberi peringatan.

## Identifikasi
`lib/arm64-v8a/libgame.so`, ARM64, 52.355.608 byte. Alamat = offset file (`.rodata`).

## Tabel negara playable — VERIFIED
Sekitar 0x643920, tepat setelah teks `22FMH_RULE_GROUP_MANAGER`: 28 × u16 index negara. Mod mengganti Wales (175) dengan Indonesia (58) di 0x643952 (`af` → `3a`). Ukuran tetap 28.

## Tabel liga terdalam yang bisa dimainkan — VERIFIED
0x7cb440–0x7cb4b0: u32 UID kompetisi, diakhiri `FFFFFFFF`. B2c: 0x7cb478 41042740 → 41042746 (Liga Nusantara). Tabel berikutnya untuk liga wanita.
Pelajaran: liga tidak muncul di layar awal padahal data lengkap → cek tabel ini.

## 27.1.0 (libgame.so 52.515.648 byte, 23 Nov 2026)
- Tabel negara playable: 0x647800 (28 × u16). Wales 175 di 0x647832. Tanpa Indonesia. Ditemukan lewat isi (indeks negara besar), bukan lewat penanda teks.
- Tabel liga terdalam pria: 0x7cf618–0x7cf684 (28 × u32) + FFFFFFFF di 0x7cf688. Wales (Cymru North/South, 29236871) di 0x7cf650. Tidak ada UID Indonesia.
- Tambalan yang direncanakan: 0x647832 → 58 (u16), 0x7cf650 → 41042746 (u32). HYPOTHESIS (pola B2c 27.0), belum diuji di 27.1.0.

## Catatan untuk aplikasi
Cari tabel berdasarkan penanda teks, jangan hanya offset tetap (offset bisa beda antar build).
