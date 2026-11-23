# Input manifest

Isi untuk setiap file yang sedang terpasang. Hash dipakai aplikasi sebagai gerbang versi.

| File | Versi putaran | Ukuran (byte) | SHA-256 | Path di APK | Catatan |
|---|---|---|---|---|---|
| db_archive_2706.fmf | **B7b (terkonfirmasi 22 Nov: Gresik reputasi 1.500, semi-pro, fasilitas 5/4, stadion 7212 — sesuai build B7b)** | 149.842.446 | eb1d71647dd8de17ceaaf1b133a444717cda5268831c3ddbf4c1009f63bcf5cc | assets/data/game/ | flag 0, 76 entri, area data 143 MB (dibaca aplikasi PWA di HP, 22 Nov 2026). B6b = 149.841.844 byte |
| sicomps.fmf | B7b (diduga) | 49.620.118 | | assets/shared/data/ | B6 = 49.619.693 byte. flag 0, 1.489 entri; `comps.dbc` di dalamnya: arsip bersarang **flag 3**, 1.344 entri (dibaca aplikasi di HP setelah perbaikan bigint, 22 Nov) |
| pictures_logos.fmf | B7b | 1.818.029.973 | | assets/data/game/ | flag 0, 142.934 entri (dibaca aplikasi di HP, 22 Nov). Store wajib |
| libgame.so | B2c | 52.355.608 | | lib/arm64-v8a/ | hanya dibaca |

### APK 27.1.0 ori — db_archive_2707.fmf utuh
| File | Ukuran | SHA-256 | Catatan |
|---|---|---|---|
| db_archive_2707.fmf | 184.134.385 | 278769f0ad58037aeec894ecd0acfa147f90f6ca7d7910999d0b4f230317090b | flag 0, 76 entri; 1.669 kompetisi (tanpa kompetisi Indonesia), 53.182 klub, 16.082 stadion, 1.681 rivalitas |

### APK 27.1.0 ori — file lain (diterima 23 Nov)
| File | Ukuran | SHA-256 | Catatan |
|---|---|---|---|
| libgame.so | 52.515.648 | 5a1eb90a97fdeb61537717355efdd4b072a662e0596d1999638cef4f9544a221 | tabel negara 0x647800, liga terdalam 0x7cf618 |
| sicomps.fmf | 51.681.261 | d9e594ff44ed03ca4601adebd94d56f71b4462d897940d2ced1ba536132ccf6e | flag 0, 1.495 entri; comps.dbc flag 3, 1.346 entri; tanpa IDN-0/1/2 di fmm_* |
| pictures_logos.fmf | 28.030.617 | b50a8a7048b3882e0dc8b9c949909c16cdec986b6327f478cb02008521971b01 | flag 0, 2.006 entri |

### APK 27.1.0 ori — lokasi file (MT Manager, 23 Nov 2026)
| File | Path di APK | Ukuran (MT Manager) |
|---|---|---|
| libgame.so | lib/arm64-v8a/ | 50,08 MB |
| db_archive_2707.fmf | assets/data/game/ | 175,60 MB |
| sicomps.fmf | assets/shared/data/ | 49,29 MB |
| pictures_logos.fmf | assets/data/game/ | 26,73 MB |
Catatan: APK dari situs pihak ketiga (androidoyunclub; ada `lib/arm64-v8a/libandroidoyunclub.so`). `db_archive_2706/2623/2622/2621/2620.fmf` lama juga masih ada di folder yang sama.

### APK 27.1.0 ori (entri db_archive; club/players/people/coaches dikonfirmasi ori lewat salinan kedua yang identik, diunduh per entri 23 Nov 2026; nama arsipnya belum dicatat)
| Entri | Ukuran | SHA-256 |
|---|---|---|
| people.dat | 16.733.361 | 841021a151f58607708f7ed259f9dc723082ccb6d1257c3218bfc804d92435bd |
| players.dat | 11.226.632 | 221a28ef880f3289b8e23609766566ab6216233b703486f186336a0154224666 |
| non_players.dat | 744.054 | f87f1a56157347973c3154dda8f7b904d1a943134508c38e424a3e934b407f51 |
| starting_contracts.dat | 7.648.194 | 3183a7823c4a32db511bc80d4b138533d5754f65d7ffc210347a07bb091b1f76 |
| club.dat | 22.912.176 | f88f43ab80d5269904b41d42662387346bed279eb117b5addca9f20c63ea2867 |
| first_names.dat | 1.762.541 | d5a97395f7e9aebb4ddc57fb57660aa4f9f6a03a290c853868995bff3599f07b |
| second_names.dat | 3.113.643 | 4b01441a38c7d900f440837396b099dd913da6462730bc1ab3b171f35e5c7376 |
| coaches.dat (ori, dikonfirmasi) | 118.424 | c5963f1dcbf8cdd3540911f6effe74d1f0048d9bd026bcdc8a99b85e85c2f1ea |
| scouts.dat (dari APK modder, **identik dengan ori**) | 22.349 | 8a5e4f3c90942cb1e833aeb68019859b03e288a0f65bf6d6aed96e5db6e54c0e |
| physios.dat (dari APK modder, **identik dengan ori**) | 38.456 | 4c8b94a2e7e842be1b2a26d7bc5832adf2711d5075485c8c12171b9e4fef05f9 |
| common_names.dat | 311.760 | 3e01702abe75c1525ebb83297d0484605079c28ca4bac41e035dc4737fe92974 |

Catatan 27.1.0: `club.dat` berisi **53.182 klub** (27.0: 38.747) dan terbaca habis oleh `club.py` lama. Index klub bergeser total dibanding 27.0, jadi skrip build lama (berbasis index) tidak bisa dipakai langsung.

Game: FMM27 Mobile (Netflix, com.netflix.NGP.FootballManagerMobile), database 2706, APK mod komunitas fm27-idn.
Kelengkapan: belum diketahui apakah ada data yang diunduh terpisah di luar APK.
