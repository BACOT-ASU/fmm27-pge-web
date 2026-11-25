# Spesifikasi: `comps.dbc` dan `comps.txt` (di `sicomps.fmf`)

Sumber: panduan induk §6; skrip `scripts/dbc.py`, `dbcarc.py`, `dbcshow.py`, `build_b4*/b5*/b6*/b7*_rules.py`.

## Identifikasi
`sicomps.fmf` berisi 1.489 file: XML aturan, `.md` developer, **`comps.dbc` (yang dibaca game)**, `comps.txt`, `2700/fmm_*.dat`. Bukti game membaca dbc: Serie C hanya ada di dbc.
`comps.dbc` = arsip bersarang (prefix `03 01 "cbd." 04 00` + kontainer `.fmf`) **flag 3** (tiap entri satu frame zstd), **1.344 entri** di sicomps B7b (dibaca aplikasi, 22 Nov). Catatan lama: parse/build identik untuk 1.272 entri — selisih 72 diduga `fixtures_N.dbc` (HYPOTHESIS).

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

## Tag `qurl` (kualifikasi kontinental piala) — VERIFIED pemetaan (23 Nov 2026)
Sama dengan XML `qualification` pada piala tipe main_cup: 0 = winner_qualifies_only, 1 = no_team_qualifies, 2 = runner_up_can_qualify; tanpa tag = 41 piala (perilaku bawaan). Dicocokkan dari 36 piala utama 27.1.0. Build 27.1.0: Piala Indonesia → 1.

## Tag `CcQR` (cont_cup_qual_rules) dan `vlys` (valid_years) — 23 Nov 2026
- `CcQR`: daftar urutan tim penerima jatah kontinental negara. Record: type (1 = league_stage, 5 = custom_team, 0 = …), HdRl (hide_rule), stag, RkIn (ranked_team_info: 1 league_position, 2 …, 7, 14 cup_performance), comp (opsional), ind1. LIKELY.
- `vlys`: aturan pemilihan format entri: {type 1/2} (versi fm/fmm), {mntm, mxtm} (jumlah tim), {} kosong; versi AFC `_first_year` memakai comp_format_to_use "First Year". LIKELY.
- Jatah AFC per peringkat koefisien: `asi.xml` list teams (lihat log poin 40).

## Liga bergrup sebagai SATU kompetisi (fase grup di dalam induk) — 25 Nov 2026 (log 83)
Bukti ori 27.1.0 (VERIFIED isi file, arti LIKELY):
- `comp_jpn_first_2026_special_0`: `ftye 1`, stage 0 `type 2`, `tems` = [{id 1, comp = kompetisi itu sendiri}], `strq` = [{comp diri, orss True, bsyo 0, stag 0}], `ngps 2`, `grrl 8192`, `gnty 0`, `gpdt` kosong, `rank` per posisi grup ({team k, crk, hgrk, lwrk}). Klub J1 terdaftar (club.dat `div`) di J1.
- `comp_idn_league_two_1442` versi SI (ori): `relr`/`prmr`/`tppr`/`btpr`/`qurl` dipasang di stage fase grup (`type 2`) → berlaku per grup; `tppr`/`btpr`/`qurl` menunjuk nama babak (`nmsn`) di stage playoff (`stag` = index stage tujuan).
- `comp_bra_nat_third_21_teams_1439`: `grrl 8192` + `crl2` = daftar {gpid, lcrl.lcrg = UID region (regions.dat)} → grup menurut provinsi/negara bagian. Tanpa `crl2` (J1 2026) pembagian ditentukan game.
- `comp_inter_asia_nations_cup_1440`: `exfp` {nrpl jumlah tambahan, olpl 255, nwpl 0, nptc 1} = peringkat-3 terbaik ikut lolos bersama `qurl`.
- Objek comp bentuk hash: `{id 'comp', comp (i64) = (uid<<32)|uid, DBID (i32) uid}`.
- regions.dat: header 10 byte (u16 jumlah di offset 8); record = u16 idx, u32 UID, u32 panjang + nama UTF-8, FF, u16 negara, FF FF. city.dat record 20 byte: u16 idx, u32 UID, u16 negara, f32 lintang, f32 bujur, u8, **u16 index region (offset 17)**, u8.
Penerapan: `scripts/unify_idn_leagues_v2710.py` (Championship 2 × 10, Liga Nusantara 3 grup 23 klub + `exfp` 2 → 8 besar). File grup `comp_idn_league_two_groups_1442`, `comp_idn_league_three_group_a_1439`, `comp_idn_league_three_groups_bc_1439` dibuang; Piala Indonesia, `nation_idn_comps` (`retm`), `nation_idn_reserve_comps` (tanggal) dialihkan ke induk; club.dat `div`/divisi lalu → induk. HYPOTHESIS sampai diuji di game.
- **Header dbc byte 0 = `ftye`** (VERIFIED di 1.278 file ori). Kalau `ftye` diubah, header wajib ikut; kalau tidak, game tidak memuat kompetisi itu (uji v16, log 84). Kompetisi tunggal: `dvlv` tanpa `nccc`.
