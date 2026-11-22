# Input manifest

Isi untuk setiap file yang sedang terpasang. Hash dipakai aplikasi sebagai gerbang versi.

| File | Versi putaran | Ukuran (byte) | SHA-256 | Path di APK | Catatan |
|---|---|---|---|---|---|
| db_archive_2706.fmf | B7b (diduga: ukuran ≠ B6b; konfirmasi Bacad) | 149.842.446 | eb1d71647dd8de17ceaaf1b133a444717cda5268831c3ddbf4c1009f63bcf5cc | assets/data/game/ | flag 0, 76 entri, area data 143 MB (dibaca aplikasi PWA di HP, 22 Nov 2026). B6b = 149.841.844 byte |
| sicomps.fmf | B7b (diduga) | 49.620.118 | | assets/shared/data/ | B6 = 49.619.693 byte. flag 0, 1.489 entri; `comps.dbc` di dalamnya: arsip bersarang **flag 3**, 1.344 entri (dibaca aplikasi di HP setelah perbaikan bigint, 22 Nov) |
| pictures_logos.fmf | B7b | 1.818.029.973 | | assets/data/game/ | flag 0, 142.934 entri (dibaca aplikasi di HP, 22 Nov). Store wajib |
| libgame.so | B2c | 52.355.608 | | lib/arm64-v8a/ | hanya dibaca |

Game: FMM27 Mobile (Netflix, com.netflix.NGP.FootballManagerMobile), database 2706, APK mod komunitas fm27-idn.
Kelengkapan: belum diketahui apakah ada data yang diunduh terpisah di luar APK.
