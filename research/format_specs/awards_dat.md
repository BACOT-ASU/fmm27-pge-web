# Spesifikasi: awards.dat (db_archive)

Dibongkar ulang 23 Nov 2026 (27.1.0 ori; sama dengan B7b 27.0). Skrip: `scripts/add_awards_v2710.py`.
Mengoreksi catatan 22 Nov (`liga_kompetisi_award_afc.md` §3): award **menyimpan rujukan kompetisi**, tetapi sebagai
**index** competition.dat (bukan UID — yang dulu dicari adalah UID, jadi tidak ketemu).

## Header
8 byte (`03 01 "tad." 01 00`) + u32 jumlah (27.1.0: 1.123).

## Record (panjang bervariasi)
| Field | Tipe | Arti | Keyakinan |
|---|---|---|---|
| idx | u32 | nomor urut 0..n−1 | VERIFIED |
| award_id | u32 | ID award (unik, tidak berurutan) | VERIFIED (unik) |
| nama generik | u32 + teks + `FF` | mis. "Player of the Month" | VERIFIED |
| nama bermerek | u32 + teks + `FF` | mis. "Premier League Player of the Month" | VERIFIED |
| ekor | 102 byte | lihat bawah | |

## Ekor 102 byte
| Offset | Tipe | Arti | Keyakinan |
|---|---|---|---|
| 0 | u16 | benua (1 Asia, 2 Eropa, …; FFFF dunia) | LIKELY |
| 2 | i16 | index negara (−1 = semua) | VERIFIED (selalu = negara kompetisi) |
| 4 | i16 | **index kompetisi** di competition.dat (−1 = bukan award liga) | VERIFIED (1.055 award; Premier League = 5, Championship 6, League One 7, League Two 8) |
| 6 | u8 | jenis (37 umum, 4 top skor, 3 manajer, 38, …) | LIKELY |
| 7 | u8 | subjek: 1 pemain, 7 tim (Team of the Week/Season, Best 11), 2 manajer | LIKELY |
| 15 | u8 | frekuensi: 1 mingguan, 2 bulanan, 3 tahunan | LIKELY |
| 18 | u16 | tahun (1900 = kosong) | LIKELY |
| 21 | u8 | batas umur (mis. 0x17/0x18 untuk Young Player) | HYPOTHESIS |
| 23–100 | 3 × 26 byte | riwayat pemenang (UID orang, UID klub, tahun, nilai, …); kosong = pola `ff…ff 00…00 ff…` | LIKELY |
| 101 | u8 | 0 | VERIFIED (nilai) |

## Indonesia
27.0 dan 27.1.0 ori: tidak ada award untuk kompetisi Indonesia.
Build 27.1.0 (`add_awards_v2710.py`): 44 award ditambah di ujung, disalin dari set liga Asia (K League 1, CSL Manager of
the Month, J2, J3, Korea Cup, Japanese League Cup) dengan negara 58, index kompetisi Indonesia, award_id baru
2.100.600.001+, riwayat dikosongkan. BRI Super League punya "Best 11 of the Round" (best 11 mingguan) + 8 award lain;
Championship Grup Barat/Timur dan Liga Nusantara Grup A/B/C punya "Team of the Week", "Monthly MVP", dst.
Status: HYPOTHESIS sampai terlihat di game (belum diketahui apakah game punya daftar award_id di kode).
