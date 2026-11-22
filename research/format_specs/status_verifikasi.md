# Status verifikasi format (per 22 Nov 2026)

| Format | Baca | Tulis | Round-trip | Uji game | Port TS | Spesifikasi |
|---|---|---|---|---|---|---|
| Kontainer `.fmf` flag 0 | VERIFIED | VERIFIED (logo) / UNKNOWN (db, sicomps via tambal) | VERIFIED | VERIFIED | **Sesi 02 ✓** | `fmf_container.md` |
| Kontainer `.fmf` flag 3 | VERIFIED | HYPOTHESIS (tambal raw) | VERIFIED (Python) | – | **Sesi 02 ✓** (baca + tulis) | `fmf_container.md` |
| Arsip bersarang (prefix 8 byte) | VERIFIED | VERIFIED (Python) | VERIFIED | VERIFIED | **Sesi 02 ✓** (pisah prefix) | `fmf_container.md` |
| `competition.dat` | VERIFIED | VERIFIED | VERIFIED | VERIFIED | belum | `competition_dat.md` |
| `club.dat` | VERIFIED | VERIFIED (field tetap ukuran, klon di ujung) | VERIFIED | VERIFIED | belum | `club_dat.md` |
| Blok keuangan klub 68 byte | struktur VERIFIED | – | – | – | belum | `club_dat.md` (HYPOTHESIS) |
| `rivalries.dat` | VERIFIED | VERIFIED | VERIFIED | VERIFIED | belum | `db_archive_lainnya.md` |
| `.lng` | sebagian | VERIFIED (tambah di ujung) | – | VERIFIED | belum | `db_archive_lainnya.md` |
| `stadium.dat` | VERIFIED | VERIFIED | VERIFIED | menunggu (B7a/B7b) | belum | `db_archive_lainnya.md` |
| `nation.dat` | sebagian | youth rating HYPOTHESIS | – | – | belum | `db_archive_lainnya.md` |
| File nama | VERIFIED | – | – | – | belum | `db_archive_lainnya.md` |
| `people.dat`, `players.dat`, `non_players.dat`, kontrak | UNKNOWN | – | – | – | – | B3 |
| `comps.dbc` | VERIFIED | VERIFIED | VERIFIED | VERIFIED | belum | `comps_dbc.md` |
| `fmm_*.dat` | VERIFIED | VERIFIED | – | VERIFIED | belum | `fmm_lists.md` |
| Logo | VERIFIED | VERIFIED | – | VERIFIED | legacy (fmmcore.js) | `logos.md` |
| `libgame.so` tabel | VERIFIED | (di luar lingkup) | – | VERIFIED | belum (read-only) | `libgame_tables.md` |

**Uji file asli pertama (22 Nov, HP Bacad):** `db_archive_2706.fmf` (149.842.446 byte) terbuka di aplikasi: flag 0, 76 entri — cocok dengan panduan (76 file). Pembaca TS VERIFIED untuk db asli. `pictures_logos.fmf` (1.818.029.973 byte = B7b) juga terbuka: flag 0, 142.934 entri. `sicomps.fmf` (49.620.118 byte) gagal di versi awal karena waktu TOC > 2^53 → diperbaiki (waktu disimpan sebagai bigint), menunggu uji ulang.

Pertanyaan terbuka yang bisa dijawab dengan aplikasi (layar "Arsip .fmf"): flag `sicomps.fmf`, flag arsip `comps.dbc`.
