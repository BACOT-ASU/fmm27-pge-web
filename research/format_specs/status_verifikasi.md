# Status verifikasi format (per 22 Nov 2026)

| Format | Baca | Tulis | Round-trip | Uji game | Port TS | Spesifikasi |
|---|---|---|---|---|---|---|
| Kontainer `.fmf` flag 0 | VERIFIED | VERIFIED (logo) / UNKNOWN (db, sicomps via tambal) | VERIFIED | VERIFIED | **Sesi 02 ✓** | `fmf_container.md` |
| Kontainer `.fmf` flag 3 | VERIFIED | HYPOTHESIS (tambal raw) | VERIFIED (Python) | – | **Sesi 02 ✓** (baca + tulis) | `fmf_container.md` |
| Arsip bersarang (prefix 8 byte) | VERIFIED | VERIFIED (Python) | VERIFIED | VERIFIED | **Sesi 02 ✓** (pisah prefix) | `fmf_container.md` |
| `competition.dat` | VERIFIED | VERIFIED | VERIFIED | VERIFIED | **Sesi 03 ✓** (round-trip + golden comp.py; data asli menunggu `samples/`) | `competition_dat.md` |
| `club.dat` | VERIFIED | VERIFIED (field tetap ukuran, klon di ujung) | VERIFIED | VERIFIED | **Sesi 03 ✓** (round-trip + golden club.py; data asli menunggu `samples/`) | `club_dat.md` |
| Blok keuangan klub 68 byte | struktur VERIFIED | – | – | – | belum | `club_dat.md` (HYPOTHESIS) |
| `rivalries.dat` | VERIFIED | VERIFIED | VERIFIED | VERIFIED | belum | `db_archive_lainnya.md` |
| `.lng` | sebagian | VERIFIED (tambah di ujung) | – | VERIFIED | belum | `db_archive_lainnya.md` |
| `stadium.dat` | VERIFIED | VERIFIED | VERIFIED | menunggu (B7a/B7b) | belum | `db_archive_lainnya.md` |
| `nation.dat` | sebagian | youth rating HYPOTHESIS (melemah: IDN 19 → youth intake tetap 1 di klub semi-pro, 22 Nov) | – | – | nama negara saja (LIKELY, baca) | `db_archive_lainnya.md` |
| File nama | VERIFIED | – | – | – | belum | `db_archive_lainnya.md` |
| `people.dat`, `players.dat`, `non_players.dat`, kontrak | UNKNOWN | – | – | – | – | B3 |
| `comps.dbc` | VERIFIED | VERIFIED | VERIFIED | VERIFIED | belum | `comps_dbc.md` |
| `fmm_*.dat` | VERIFIED | VERIFIED | – | VERIFIED | belum | `fmm_lists.md` |
| Ekspor club.dat (Sesi 04): paket Documents & db_archive tambal | – | dibangun; zip & arsip dibaca ulang oleh Python (club.py, fmfio.py) | – | **menunggu uji game** | ✓ | `club_dat.md`, `fmf_container.md` |
| Logo | VERIFIED | VERIFIED | – | VERIFIED | legacy (fmmcore.js) | `logos.md` |
| `libgame.so` tabel | VERIFIED | (di luar lingkup) | – | VERIFIED | belum (read-only) | `libgame_tables.md` |

**Uji file asli pertama (22 Nov, HP Bacad):** `db_archive_2706.fmf` (149.842.446 byte) terbuka di aplikasi: flag 0, 76 entri — cocok dengan panduan (76 file). Pembaca TS VERIFIED untuk db asli. `pictures_logos.fmf` (1.818.029.973 byte = B7b) juga terbuka: flag 0, 142.934 entri. `sicomps.fmf` (49.620.118 byte) gagal di versi awal karena waktu TOC > 2^53 → diperbaiki (waktu disimpan sebagai bigint). Uji ulang: **flag 0, 1.489 entri** (cocok dengan panduan), `comps.dbc` = arsip bersarang **flag 3, 1.344 entri**.

**Uji db asli di aplikasi (22 Nov, Sesi 03):** `competition.dat` 1.683 kompetisi dan `club.dat` 38.772 klub terbaca habis tanpa galat di HP Bacad (1,1 detik); 251 negara (nama negara, LIKELY). 38.772 = 38.747 klub asli + 25 klon mod (cocok dengan catatan panduan). Parser TS competition/club **VERIFIED pada data asli** (baca); round-trip db asli belum diuji di HP. Kartu Gresik United FC (UID 2000700017) di HP: reputasi 1.500, semi-pro, fasilitas 5/4, penonton 2.500 (1.000–7.000), stadion index 7212, skuad 0, staf 0/12, tanpa blok keuangan → **cocok dengan B7b**, jadi db di HP = B7b dan field club.dat terbaca benar.

**Pertanyaan flag terjawab:** `sicomps.fmf` flag 0; `comps.dbc` flag 3. Akibatnya: menambal `comps.dbc` memakai jalur flag 3 (isi entri dibungkus frame zstd raw) yang statusnya masih HYPOTHESIS — perlu uji game, atau cadangan: kompres ulang dengan zstd sungguhan (WASM) agar sama dengan `fmfio.write`.

**Selisih yang perlu dicek:** panduan menyebut `parse`/`build` identik untuk 1.272 entri, sedangkan arsip berisi 1.344 entri. Dugaan (HYPOTHESIS): 72 sisanya adalah `fixtures_N.dbc` (tabel biner, tidak di-parse) atau entri non-dbc lain. Dicek saat port `dbc.py`.


