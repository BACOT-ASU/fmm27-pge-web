# Spesifikasi: file lain di `db_archive_2706.fmf`

Sumber: panduan induk §4.3–§4.9. Isi arsip: 76 file.

## `rivalries.dat` — VERIFIED (`scripts/riv.py`)
8 byte header + u16 jumlah. Record: u32 index, u32 UID, nama (u32+teks+1 byte), i32 index klub A, i32 index klub B (urutan di `club.dat`), u8 intensitas (0–200), 14 byte (opaque). Contoh: Persija–Persib 200.

## File `.lng` (16 bahasa) — VERIFIED (struktur jumlah)
Nama klub per bahasa. u32 jumlah di offset 8 harus = jumlah klub. Klub baru: nama ditambah di ujung. Struktur record lengkap: lihat skrip build B1/B4 (LIKELY).

## `stage_names.dat` — VERIFIED
Record: u16 idx, u32 id, 3 teks (+1 byte). ID dipakai: 20 Final, 76–79 Group A–D, 111 Relegation Playoff, 117 Promotion Playoff, 142 Champions Playoff, 176/177 First/Second Phase Group Stage.

## `stadium.dat` — VERIFIED (`scripts/stadium.py`)
8 byte header + **u16** jumlah (12.509). Record: u32 index, u32 UID, u16 index kota, u32 kapasitas, u32 kapasitas maks, nama (u32+teks), nama alternatif (u32+teks, boleh kosong), 8 byte (biasanya `00000000ff000000`).
Aturan: stadion baru di ujung + daftar di `fmm_stadiums` IDN-0/1/2; kota dipinjam dari stadion terdekat (`city.dat` tanpa nama kota). Klub tanpa stadion → penonton 0.

## `nation.dat` — sebagian

**Koefisien AFC (23 Nov, LIKELY):** sesudah penanda `ff 7f d4 00 00 00 ff 7f` + field peringkat, ada `08 00` + 8 × u16 (riwayat peringkat?) lalu byte `09` + 9 × f32 = koefisien klub per musim. Indonesia: 4,1 / 5,05 / 0 / 0 / 3,96 / 3,56 / 7,2 / 11,03 / 0. Negara non-AFC tertentu tidak punya blok ini.

Record diawali u32 UID, u16 index, nama (+ff), kebangsaan (+ff), kode 3 huruf; panjang bervariasi (parser mencari berurutan). Setelah penanda `ff 7f d4 00 00 00 ff 7f`: u8, u16 index negara tetangga, **u8 kandidat youth rating** (HYPOTHESIS, melemah: uji 22 Nov dengan IDN 19 tetap 1 youth intake untuk klub semi-pro; lihat panduan induk 10.2-uji; IDN diubah ke 19 di B7b, belum terbukti), u8 1, u16 peringkat FIFA, u16 poin FIFA. Indonesia: index 58, UID 113.

## File nama — VERIFIED (`scripts/names.py`)
`first_names.dat`, `second_names.dat`, `common_names.dat`: 8 byte header + u32 jumlah. Record: u32 0, u32 index, u8, u32 UID negara, u16, u8 flag, u32 panjang + teks.

## `people.dat`, `players.dat`, `non_players.dat`, `starting_contracts.dat` — struktur VERIFIED (23 Nov)
Dibongkar dari APK 27.1.0 ori: lihat `people_players.md` dan `scripts/people.py` (round-trip identik). 27.0 (2706): 150.430 orang, pola awal sama.

## Belum dibongkar — UNKNOWN
`coaches.dat` dan file tujuan idx2/idx3/idx4 di `people.dat`.
