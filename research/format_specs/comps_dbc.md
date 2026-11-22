# Spesifikasi: `comps.dbc` dan `comps.txt` (di `sicomps.fmf`)

Sumber: panduan induk §6; skrip `scripts/dbc.py`, `dbcarc.py`, `dbcshow.py`, `build_b4*/b5*/b6*/b7*_rules.py`.

## Identifikasi
`sicomps.fmf` berisi 1.489 file: XML aturan, `.md` developer, **`comps.dbc` (yang dibaca game)**, `comps.txt`, `2700/fmm_*.dat`. Bukti game membaca dbc: Serie C hanya ada di dbc.
`comps.dbc` = arsip bersarang (prefix `03 01 "cbd." 04 00` + kontainer `.fmf`), 1.272 entri.

## Entri — VERIFIED
Nama: `comp_<nama>_<branch>.dbc`, `nation_<x>_<branch>.dbc`, `continent_…`, `fixtures_N.dbc` (tabel biner 25 byte per baris; salin apa adanya).
- Header 4 byte: byte 1 = jenis file (1 kompetisi, 2 grup-sebagai-liga, 3 divisi induk, 8 tanggal mulai, 10 daftar kompetisi negara, 11 cadangan, 12 aturan negara), byte 2 = `vers`.
- Lalu kunci (`01` + nilai), u32 jumlah field, field.
- Field = tag 4 huruf (tersimpan terbalik) + `01` + nilai.

### Kode tipe nilai — VERIFIED
| Kode | Tipe |
|---|---|
| 00 | kosong |
| 01 | i32 |
| 02 | u32 / kode 4 huruf |
| 03 | bool |
| 05 | f64 |
| 0a | record (u32 jumlah + field) |
| 0b | daftar (u32 jumlah + item; tiap item diawali `01`) |
| 0c / 1a | teks (u32 + byte) |
| 0f / 18 | i64 |
| 11 | i8 |
| 12 | i16 |
| 19 | f32 |
| 20 | tanggal (4 byte) |

`parse` lalu `build` tanpa perubahan = identik (1.272 entri). VERIFIED.

## Tag penting — arti LIKELY kecuali disebut
`ftye` jenis file, `vers`, `comp`, `ntms` jumlah tim, `nrds` putaran, `nmdt` pekan, `dyow` hari (1 Minggu … 7 Sabtu); `qurl` kualifikasi (`nmsn`, `nrpl`, `topp`/`btpl`, `comp`, `stag`); `tppr`/`btpr` playoff; `prmr`/`relr` promosi/degradasi; `exfp`; `tems` (id 1 tim divisi, id 2 tim lolos, id 5 tim terdaftar); grup `gpdt`, `gnty`, `ngrt`, `crgt`, `gptm`, `UGGT`; `rkli`, `Tp3t`, `sfal`, `strq`, `inac`, `mxto`; induk-anak `cmps`, `vlys` (`mntm`/`mxtm`), `chdc`, `dcin`; negara `nccc` (di `dvlv`), `retm` (`ntms`/`FBkt`/`Bktm`); nama tahap `stgn = (id<<32)|id`.

## Aturan tulis — VERIFIED
- `crgt`/`gptm` hanya berlaku kalau tahunnya = tahun mulai game (2026).
- Grup bertingkat: pola Serie C (B5b): anak `ftye 2` (header `02xx0000`, kunci daftar `{comp}`, `cmps`, `vlys`, `dcin`); induk `ftye 3` (header `03xx0000`, `chdc` setelah `bsyr`, `dcin`; hanya babak cup via `tems id 2`); `dvlv` induk `nccc` = jumlah anak; `retm` induk `Bktm` = total klub.
- `comps.txt`: baris `nama(branch),versi`; urutan alfabet wajib dijaga; versi dinaikkan saat entri diubah.
- Tanggal mulai liga: blok negara 113 di `nation_start_dates_fmm_0`.

## Entri Indonesia
Lihat panduan induk §6.4 (`comp_idn_league_two_groups_1442`, `comp_idn_league_two_1442`, `comp_idn_league_three_*_1439`, `comp_idn_cup_1438`, `nation_idn_comps_1446`, `nation_idn_reserve_comps`).

## Status
Read/Write/Round-trip: VERIFIED (Python). Port TS: belum.
