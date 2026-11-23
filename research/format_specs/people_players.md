# Spesifikasi: people.dat, players.dat, non_players.dat, starting_contracts.dat

Skrip: `scripts/people.py` (baca + tulis ulang; `python3 scripts/people.py <folder>` = ringkasan + uji round-trip).
Dibongkar 23 Nov 2026 dari **APK 27.1.0 ori**. Belum dicek ke 27.0 (2706), tapi pola awal `people.dat`
(`scripts/people_scan.py`, dari 27.0) sama persis, jadi kemungkinan besar formatnya sama (LIKELY).

## Identifikasi (27.1.0 ori, diunduh per entri lewat aplikasi)
| File | Ukuran | Jumlah record | SHA-256 |
|---|---|---|---|
| people.dat | 16.733.361 | 163.159 | 841021a151f58607708f7ed259f9dc723082ccb6d1257c3218bfc804d92435bd |
| players.dat | 11.226.632 | 136.910 × 82 byte | 221a28ef880f3289b8e23609766566ab6216233b703486f186336a0154224666 |
| non_players.dat | 744.054 | 19.078 × 39 byte | f87f1a56157347973c3154dda8f7b904d1a943134508c38e424a3e934b407f51 |
| starting_contracts.dat | 7.648.194 | 141.633 × 54 byte | 3183a7823c4a32db511bc80d4b138533d5754f65d7ffc210347a07bb091b1f76 |

## Header
Semua: `03 01 74 61 64 2e 01 00` (8 byte) + u32 jumlah record. `people.dat` punya 1 byte tambahan (`00`)
sesudahnya, jadi record pertama mulai di offset 13. File lain mulai di offset 12.

## Bukti (VERIFIED)
- Keempat file terbaca habis tepat sampai byte terakhir dan ditulis ulang **identik byte demi byte**,
  per file dan per record (163.159 record orang, semua cocok).
- `people.club_index` → index `club.dat`: **141.633/141.633 kontrak** punya UID klub yang sama dengan
  `club.dat[people.club_index].uid`.
- `people.player_index` → `players.dat`: field 0 setiap record `players.dat` = nomor urutnya sendiri;
  136.895 orang merujuk index unik (maks 136.909).
- `people.non_player_index` → `non_players.dat`: 19.078 rujukan unik = jumlah record `non_players.dat`.
- Contoh nyata dicek: Marc Klok → Persib, Witan/Arhan → Persija, Haaland → Man City, Messi → Inter Miami,
  Hilgers → Heerenveen, Idzes → Sassuolo, Mbappé → Real Madrid.

## people.dat — record panjang bervariasi
| # | Field | Tipe | Arti | Keyakinan |
|---|---|---|---|---|
| 1 | pre | i32 | selalu −1 | VERIFIED |
| 2 | uid | u32 | UID orang | VERIFIED |
| 3 | first / second | u32, u32 | index `first_names.dat` / `second_names.dat` | VERIFIED |
| 4 | common | i32 | index `common_names.dat`, −1 = tidak ada | VERIFIED |
| 5 | dob_day, dob_year | u16, u16 | tanggal lahir (hari ke-n mulai 0, tahun) | VERIFIED |
| 6 | nation | u16 | index negara (58 = Indonesia) | VERIFIED |
| 7 | other_nations | u16 n + n × u16 | negara lain (Hilgers: 158 Belanda) | LIKELY |
| 8 | intl_a | u8 | 0–10 | UNKNOWN |
| 9 | intl_b | i32 | −1 atau angka (Reiziger 568) | UNKNOWN |
| 10 | intl_c | u8 | umumnya 1 atau 0 | UNKNOWN |
| 11 | intl_date | u16 hari, u16 tahun | 1/1900 = kosong | UNKNOWN (tanggal timnas?) |
| 12 | caps, intl_goals | u16, u16 | penampilan + gol timnas (Reiziger 72/1, sesuai data nyata) | LIKELY |
| 13 | intl_x | 2 byte | | UNKNOWN |
| 14 | club_index | i32 | index `club.dat`, −1 = tanpa klub | VERIFIED |
| 15 | joined | u16 hari, u16 tahun | tanggal masuk klub | LIKELY |
| 16 | pad0 | 2 byte | selalu 00 00 | VERIFIED (nilai) |
| 17 | personality | 8 × u8 | 1–20 (wasit: ada nilai 0). Urutan arti belum dipetakan | LIKELY |
| 18 | player_index | i32 | index `players.dat`, −1 = bukan pemain | VERIFIED |
| 19 | non_player_index | i32 | index `non_players.dat` | VERIFIED |
| 20 | idx2, idx3, idx4 | 3 × i32 | index ke file lain (9.864 / 1.767 / 3.539 orang). Diduga `coaches.dat` dkk. | UNKNOWN (file tujuan) |
| 21 | staff_extra | 2 byte | **hanya ada** kalau salah satu field 19–20 ≥ 0 | VERIFIED (syarat), UNKNOWN (arti) |
| 22 | official_index | i32 | 2.469 orang, index 0..2.468 (wasit) | LIKELY |
| 23 | flags3 | 3 byte | byte ke-3 = 1 → field 24 ada | VERIFIED (syarat) |
| 24 | main_language | u16 id, u8 tingkat | tingkat umumnya 10 | LIKELY |
| 25 | languages | u8 n + n × (u16 id, u8 tingkat) | bahasa lain | LIKELY |
| 26 | relations | u16 n + n × 8 byte | relasi (klub/orang favorit). Isi 8 byte: u8, u8, u32 UID, u8, u8 tingkat (0x32–0x64) | LIKELY (struktur), UNKNOWN (arti) |

Statistik 27.1.0: 136.895 pemain, 19.078 staf (non-player), 2.469 wasit. Kebangsaan utama Indonesia (58): 170 orang,
ditambah 67 orang dengan Indonesia sebagai negara lain.

## players.dat — 82 byte per record
| Offset | Tipe | Arti | Keyakinan |
|---|---|---|---|
| 0 | u32 | nomor urut record (= player_index) | VERIFIED |
| 4 | u32 | (Messi 21.433, Haaland 284.021) | UNKNOWN |
| 8–41 | 34 × u8 | atribut. Sebagian selalu 1–20 (13, 14, 17–29, 33, 34, 37), sebagian 0–255 (diduga bertanda / relatif; 0x9C sering muncul di 35, 36, 38–41) | UNKNOWN (perlu kalibrasi screenshot) |
| 42–56 | 15 × u8 | rating posisi 1–20 (Haaland: 20 di offset 54 = striker). Byte 43 selalu 1 | LIKELY (ada posisi), HYPOTHESIS (urutan) |
| 57 / 58 | u8 / u8 | kaki kiri / kanan 1–20 (Messi 20/12, Haaland 20/11, Hilgers 8/20) | LIKELY |
| 59 | u16 | CA (Messi 172, Haaland 187, Mbappé 192, Klok 105) | LIKELY |
| 61 | u16 | PA (Messi 200, Haaland 195, Mbappé 197, Klok 115) | LIKELY |
| 63 / 65 / 67 | u16 × 3 | reputasi saat ini / di negara asal / dunia (Messi 10.000/8.750/8.750) | LIKELY |
| 69 | u8 | 0/1 | UNKNOWN |
| 72 | u8 | nomor punggung klub (Messi 10, Mbappé 10, Haaland 9, Klok 23) | LIKELY |
| 73 | u8 | nomor punggung timnas (Messi 10, Mbappé 10) | LIKELY |
| 74 | u8 | tinggi cm (Haaland 195, Mbappé 178) | LIKELY |
| 76 | u8 | berat kg (Haaland 89) | LIKELY |
| 70–71, 75, 77–81 | | selalu 0 | VERIFIED (nilai) |

## non_players.dat — 39 byte per record
u32 nomor urut (= non_player_index, VERIFIED); lalu u16 ×2 (contoh 105/120, diduga CA/PA staf), u16 ×3
(diduga reputasi), sisanya kebanyakan nilai 1–20 (atribut staf). Selain nomor urut: UNKNOWN.

## starting_contracts.dat — 54 byte per record
| Offset | Tipe | Arti | Keyakinan |
|---|---|---|---|
| 0 | u32 | UID orang | VERIFIED |
| 4 | u32 | UID klub | VERIFIED |
| 8 | 8 byte | umumnya ff | UNKNOWN |
| 16 / 20 | u16 hari, u16 tahun | mulai / berakhir kontrak | LIKELY |
| 24 | u16 | umumnya 1 | UNKNOWN |
| 26 | u32 | gaji (Haaland 472.500, Messi 404.321, Klok 720) | LIKELY (satuan & periode belum pasti) |
| 30 | 24 byte | umumnya ff; Mbappé berisi angka (diduga klausul) | UNKNOWN |

## Relasi
- `people.club_index` → urutan `club.dat` (index, bukan UID) — VERIFIED.
- `starting_contracts` → UID orang + UID klub — VERIFIED.
- `people.player_index` / `non_player_index` → urutan `players.dat` / `non_players.dat` — VERIFIED.
- Daftar `squad` di `club.dat` (`club.py`) **bukan** UID orang: hanya 752 dari 127.325 nilai cocok dengan UID di `people.dat`. Arti: UNKNOWN.
- Orang yang dimuat per negara: `sicomps/.../fmm_people.dat` (lihat `fmm_lists.md`).

## Aturan tulis (belum diuji di game)
- Orang baru: tambah di ujung `people.dat` (+ record di ujung `players.dat`/`non_players.dat` dengan nomor urut
  = index baru, + kontrak, + nama di file nama, + UID di `fmm_people`). Semua ini **HYPOTHESIS** sampai 1 pemain baru tampil di game.
- Ubah field ukuran tetap (CA/PA, reputasi, tinggi, kaki, klub) = timpa di tempat; aman dari sisi struktur, efek di game belum diuji.

## Status
Baca VERIFIED · Tulis ulang identik VERIFIED · Arti field sebagian LIKELY · Uji game: belum.

## Unknown / langkah berikutnya
1. Urutan 34 atribut + cara baca nilai di atas 20: butuh screenshot profil 3–5 pemain dari game (atribut + posisi), cocokkan byte per byte.
2. File tujuan idx2/idx3/idx4: cek `coaches.dat` dan file lain di db_archive.
3. Uji game: ubah CA/PA 1 pemain Indonesia, lalu tambah 1 pemain baru.
