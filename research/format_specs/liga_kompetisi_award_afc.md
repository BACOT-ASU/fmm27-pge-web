# Liga, kompetisi, koneksi data, award, dan jatah AFC — temuan 22 Nov 2026

> Status keyakinan: VERIFIED kecuali ditandai lain. Sumber: `sicomps.fmf` (folder mentah developer, bukan hasil mod: `sic/u/sicomps/...` di sesi kerja), `competition.dat` hasil parse (`scripts/comp.py`), `dbarch/x/db_archive_2706/awards.dat`.
> Lihat juga `research/format_specs/fmm27_panduan_induk.md` bagian 6 untuk format `comps.dbc` yang sudah lebih dulu dipecahkan.

## 1. Semua kompetisi Indonesia: aktif, tidak aktif, dan baru ditemukan dorman

Developer asli (SEGA/SI, folder `sicomps/asia/idn/men/*.xml` — bukan buatan mod komunitas) ternyata sudah merancang Indonesia jauh lebih lengkap dari yang kita pakai. Ibaratnya rumah ini sudah ada cetak birunya lengkap dari arsitek, tapi kontraktor (mod `fm27-idn`) baru membangun sebagian kamarnya.

| Kompetisi | UID | Status di `competition.dat` (terbukti, dicek langsung) | Status aktif (`nation_idn_comps` `cmps`) |
|---|---|---|---|
| BRI Super League | 41004312 | Ada | **Aktif** |
| Pegadaian Championship (induk) | 41042740 | Ada | **Aktif** |
| Championship Grup Barat/Timur | 41042741/42 | Ada | Anak dari 41042740 |
| Piala Indonesia | 7746536 | Ada | **Aktif** |
| Piala Liga Indonesia | 2000560926 | Ada | **Aktif** (keputusan Bacad) |
| Piala Presiden | 2000189135 | Ada (lvl 4) | **Tidak aktif** (keputusan Bacad) |
| Piala Super Indonesia | 7746537 | Ada (lvl 5) | Belum dikonfirmasi aktif/tidak di `cmps` — perlu dicek |
| Liga Nusantara (+Grup A/B/C) | 41042746 (+2000700101–103) | Ada | **Aktif** (ditambahkan mod) |
| Liga 4 | 41045091 | Ada | Pelengkap Piala Indonesia saja |
| **Liga U21 Satu** | 41053475 | **TIDAK ADA** di `competition.dat` | Dorman |
| **Liga U21 Dua** | 41053476 | **TIDAK ADA** | Dorman |
| **Liga U18 Satu** | 41058630 | **TIDAK ADA** | Dorman |
| **Liga U18 Dua** | 41058631 | **TIDAK ADA** | Dorman |

**Temuan baru:** file XML developer `idn_u21_league_one.xml`, `idn_u21_league_two.xml`, `idn_u18_league_one.xml`, `idn_u18_league_two.xml`, `idn_league_cup.xml`, `idn_super_cup.xml`, `idn_piala_presiden_cup.xml`, `idn_reserve_comps.xml` ada di paket developer, lengkap dengan jumlah tim (U21 Satu 18 tim, U21 Dua 24 tim, U18 Satu 18 tim, U18 Dua 20 tim). Tapi dicek langsung ke `competition.dat` hasil build kita — **UID liga U21/U18 itu sama sekali tidak ada di database**. Artinya liga-liga ini dirancang SEGA tapi tidak pernah benar-benar dibangun, baik oleh SEGA maupun oleh mod `fm27-idn`. Kalau mau diaktifkan, ini pekerjaan baru (bukan sekadar "nyalakan saklar") — perlu dibuat record baru di `competition.dat` + entri `comps.dbc` + daftar klub, mengikuti pola yang sama seperti waktu kita membangun Liga Nusantara.

Catatan: game membaca `comps.dbc` (biner), bukan XML ini — XML cuma dokumentasi sumber dari developer yang ikut terbawa di paket mod. Jadi XML ini berguna sebagai **peta rencana**, bukan sebagai sesuatu yang sudah jalan di game.

## 2. Koneksi data — ke mana dan efeknya apa

Ringkasan relasi antar file (semua sudah diverifikasi lewat build B1–B7b kecuali disebut lain):

```
competition.dat (idx kompetisi)
   ↑ dirujuk oleh club.dat.div (field 6) dan club.dat.div_musim_lalu (field 8)
   ↑ dirujuk oleh comps.dbc (tag `comp`, `cmps`, `chdc`, `qurl`, `tems`)
   ↑ dirujuk oleh sicomps/2700/fmm_comps.dat (daftar yang dimuat per negara)
   ↑ TIDAK dirujuk oleh awards.dat secara langsung (lihat bag. 3 — koreksi temuan 22 Nov malam: awards.dat tidak menyimpan UID kompetisi sama sekali)

club.dat (idx klub, URUTAN dipakai sebagai index, bukan UID)
   → stadium.dat lewat field 7 (index stadion; 65535 = kosong → penonton dipotong 0)
   → rivalries.dat lewat index klub A/B (bukan UID!) — makanya klub baru WAJIB ditambah di ujung
   → sicomps/2700/fmm_clubs.dat (daftar dimuat)
   → .lng ×16 (nama per bahasa, urutan harus sama persis dengan club.dat)

nation.dat (index negara, dipakai di club.dat field 3 dan competition.dat)
   → sicomps/2700/fmm_people.dat, fmm_stadiums.dat, fmm_comps.dat, fmm_clubs.dat (semua "per negara")
   → continental/*.xml "nation_list" (lihat bag. 4 — INI YANG BELUM TERHUBUNG untuk Indonesia)

libgame.so (kode, bukan data)
   → tabel negara playable & tabel liga terdalam (bag. 7 panduan induk) — kalau kompetisi tidak ada di tabel ini, dia tidak muncul di layar awal karier WALAU datanya lengkap. Ini jebakan paling sering: data benar tapi kelihatannya "tidak ada".
```

**Efek praktis kalau satu mata rantai putus** (semua sudah kejadian nyata di proyek ini):
- Klub tanpa stadion (index 65535) → penonton dan sebagian anggaran ikut 0 (bag. 4.2a panduan induk).
- Klub tidak didaftarkan di `fmm_clubs` negaranya → klub ada di `club.dat` tapi tidak pernah muncul di game.
- Kompetisi tidak ada di tabel `libgame.so` → layar awal tidak menampilkannya walau `comps.dbc` benar (ini akar masalah B2–B2c).
- Kompetisi/negara tidak ada di `nation_list` benua → tidak pernah ikut hitungan jatah kontinental (ini akar masalah "Jatah AFC", lihat bag. 4).

## 3. Award (weekly/monthly) dan Best XI

**Ditemukan file baru yang belum pernah dibongkar:** `assets/data/game/awards.dat` di dalam `db_archive_2706.fmf` (bukan di `sicomps`). Header sama dengan `.dat` lain (`03 01 "tad." 01 00`). Isinya ratusan definisi award bertipe teks berpasangan "nama generik" + "nama bermerek liga", misalnya:

- `Player of the Month` → `Sky Bet Championship Player of the Month`
- `Young Player of the Month` → `Premier League Young Player of the Month`
- `Team of the Week` / `Team of the Season` (**ini yang berfungsi sebagai "Best XI"** — FMM tidak punya award terpisah bernama "Best 11", yang ada adalah "Team of the Week/Season/Year")
- `Manager of the Month`, `Top Goalscorer`, `Goalkeeper of the Year`, dll.

**Hasil pencarian khusus Indonesia: NIHIL.** Tidak ada satu pun entri "Indonesia", "BRI", "Liga Nusantara", dsb. di antara >2.200 string yang terbaca. Liga-liga lain yang namanya kebetulan mirip ("Super League") semuanya liga negara lain (Yunani, Turki, China). **Kesimpulan: BRI Super League, Pegadaian Championship, dan Liga Nusantara tidak punya satu pun award — tidak Player of the Month, tidak Team of the Week/Season, tidak Manager of the Year.** Ini kemungkinan besar alasan kalau Bacad tidak pernah melihat notifikasi award untuk klub/liganya.

### 3a. Struktur record `awards.dat` — dibongkar 22 Nov malam

Header 8 byte standar (`03 01 "tad." 01 00`), lalu **u32 jumlah record = 1.123**. Tiap record (ukuran berbeda-beda, tidak fixed, karena mengandung 2 string panjang-variabel):

| Field | Tipe | Contoh | Keterangan |
|---|---|---|---|
| `idx` | u32 | 0, 1, 2… | index urut record, naik 1 per record — **bukan UID**, cuma posisi dalam daftar |
| `award_id` | u32 | 102407, 102410, 102411, 102412… lalu lompat ke 106909, 106918… | **VERIFIED**: ID katalog award bawaan SEGA (naik tidak selalu +1 — ada lompatan). Dicoba dicocokkan ke UID 6 kompetisi Indonesia (BRI Super League 41004312, Pegadaian Championship 41042740, Piala Indonesia 7746536, Piala Liga Indonesia 2000560926, Liga Nusantara 41042746, Liga 4 41045091) sebagai raw bytes little-endian di seluruh file — **nihil, tidak satu pun cocok**. Jadi field ini bukan UID kompetisi.
| `name1` | u32 panjang + teks | `"Player of the Month"` | nama generik award (dipakai lintas liga) |
| (pemisah) | 1 byte | `0xFF` | selalu `0xFF` di semua record yang dicek |
| `name2` | u32 panjang + teks | `"Sky Bet Championship Player of the Month"` | nama bermerek/berlisensi untuk liga tertentu |
| (pemisah) | 1 byte | `0xFF` | selalu `0xFF` |
| blok ekor | 102 byte tetap | — | **UNKNOWN sebagian**: tampak berisi hingga 3 "slot riwayat" (masing-masing dipatok oleh field u16 bertahun — contoh `e9 07` = 0x07E9 = 2025 LE), mayoritas terisi `0xFFFFFFFF` (placeholder "belum ada pemenang") karena ini database awal musim/template, bukan save game yang sudah dimainkan. Field persis untuk UID pemenang/kompetisi di dalam blok ini belum dipetakan satu-satu. |

**Urutan 40 record pertama membuktikan pola per-liga** (`Player of the Month` generik lalu diikuti versi bermerek Premier League, Championship, League One, League Two secara berurutan; lalu `Young Player of the Month`, `Team of the Week`, dst, lalu lanjut ke liga lain seperti Skotlandia, Denmark, Prancis, Belanda). Artinya tabel ini memang daftar statis per-kompetisi bawaan SEGA, satu blok per liga resmi yang mereka lisensi — bukan tabel yang bisa "ditambah entri baru" lewat UID kompetisi.

**Pencarian langsung ke seluruh 199.619 byte file untuk UID keenam kompetisi Indonesia DAN untuk string "Indonesia"/"BRI"/"Pegadaian"/"Nusantara"/"Liga 4" — semuanya nihil, tidak ada satupun kemunculan.** Ini membuktikan dua hal sekaligus: (1) koreksi atas temuan pagi — `awards.dat` sendiri **tidak menyimpan rujukan UID kompetisi apa pun** di dalam record-nya, jadi tidak ada "field kosong untuk Indonesia" yang tinggal diisi; (2) perkakas penaut award↔kompetisi, kalau memang ada, **bukan di file ini**. Sudah dicek juga `competition.dat` (lewat `scripts/comp.py`) — parser-nya mengonsumsi persis sampai byte terakhir tiap record, tidak ada field cadangan/belum terpakai yang bisa jadi "kode grup award". Jadi kemungkinan besar penautannya (kalau ada) **hardcoded di `libgame.so`**, sama persis dengan pola tabel negara-playable dan tabel-liga-terdalam yang sudah kita bongkar — bukan kebetulan, ini "tema" berulang di mod ini: Indonesia hilang bukan karena datanya salah, tapi karena tidak terdaftar di tabel kecil yang di-hardcode SEGA di kode biner.

**Kesimpulan praktis:** menambahkan award untuk Indonesia kemungkinan besar **tidak bisa** lewat menambah record baru di `awards.dat` saja (berbeda dari kompetisi/klub yang bisa ditambah "di ujung"), karena belum ada bukti ada mekanisme apa pun yang menghubungkan kompetisi baru ke blok award mana pun. Ini butuh riset tambahan di `libgame.so` (cari tabel kecil serupa tabel negara-playable) sebelum bisa dipastikan bisa/tidaknya — ditandai **UNKNOWN (mekanisme penautan)**, **VERIFIED (struktur record, lokasi, dan ketiadaan rujukan Indonesia)**.

## 4. Jatah Liga Champions (AFC untuk Asia; Eropa dicek sebagai pembanding cara kerja)

Mekanisme kualifikasi ke kompetisi kontinental (dicek di `continental/asi/men/asi_champions_league*.xml` dan `continental/eur/men/...` sebagai pembanding) **sama di kedua benua**, lewat tag generik `get_qualified_teams_for_comp` dengan `qualified_teams_seeding` (jumlah tim yang lolos per level, ditemukan nilai 6/4/2 tergantung peringkat koefisien negara).

Alurnya:
1. Tiap negara anggota benua didaftarkan di `continental/<benua>/men/<benua>.xml`, list `nation_list` — isinya UID negara dalam format gabungan `(UID<<32)|UID`.
2. Negara punya **koefisien 8 tahun berjalan** (`number_of_years_for_coefficients: 8`, bobot tahun terbaru 1.0 turun bertahap ke 0.3 di tahun ke-8) yang menentukan negaranya masuk kelompok mana (dan dapat jatah 6, 4, atau 2 slot).
3. Slot itu diisi lewat `tems` (sumber tim) yang mengambil dari kompetisi domestik negara itu (liga papan atas + kadang juara piala).

**Hasil cek untuk Indonesia (dihitung manual, UID negara 113): tidak ditemukan di `nation_list` benua Asia** (95 negara terdaftar, Indonesia tidak di antaranya). Artinya **"Jatah AFC" memang benar-benar kosong, bukan karena kurang parameter tapi karena Indonesia belum pernah didaftarkan sebagai anggota benua untuk tujuan kualifikasi.** Ini mirip persis dengan kasus `libgame.so` dulu (liga sudah ada datanya tapi tidak terdaftar di tabel yang menentukan apakah dia "ikut main").

**Yang dibutuhkan untuk mengaktifkan** (pekerjaan baru, belum dikerjakan — tunggu giliran setelah hal yang lebih mendesak):
1. Tambahkan Indonesia ke `nation_list` benua Asia (atau cari tahu apakah ada cara "override" per-negara seperti pola `branch` yang sudah dipakai untuk kompetisi Indonesia, supaya tidak perlu mengubah file developer utama).
2. Beri Indonesia entri koefisien (bisa mulai dari slot terkecil, 2, karena liga baru).
3. Hubungkan sumber tim (`tems`) dari BRI Super League (peringkat 1–2 atau 1–3) ke ACL Two/ACGL (kompetisi tier bawah AFC) — realistisnya Indonesia tidak akan masuk tier ACL Elite (tim top Asia) dalam waktu dekat.

Status: **HYPOTHESIS pada langkah 1–3** (belum diuji di game); **VERIFIED pada diagnosis akar masalahnya** (Indonesia memang tidak terdaftar).

## 5. Ringkasan untuk panduan induk

Tiga hal ini ditambahkan sebagai item baru di masalah terbuka (`00-PANDUAN-INDUK-FMM27-INDONESIA.md` bagian 10):
- Liga U21/U18 Indonesia: dorman, bisa diaktifkan, pekerjaan baru.
- Award (Player/Manager/Team of the Month/Week/Season): kompetisi Indonesia nihil, perlu bongkar `awards.dat` dulu sebelum bisa ditambah.
- Jatah AFC: akar masalah dipastikan (Indonesia tidak ada di `nation_list` benua), langkah perbaikan sudah ada tapi belum dieksekusi.

Tidak ada perubahan file game di temuan ini — murni analisa (sesuai aturan "jangan eksekusi sebelum bilang eksekusi").
