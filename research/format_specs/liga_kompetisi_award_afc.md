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

> **KOREKSI 23 Nov:** ekor 102 byte berisi u16 benua, i16 negara, **i16 index kompetisi** (bukan UID). Award bisa ditambah untuk Indonesia. Lihat `awards_dat.md`.

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

### ⚠️ KOREKSI (22 Nov malam) — temuan di atas SALAH, dibuktikan langsung di game oleh Bacad

**Bukti nyata membantah kesimpulan di atas:** Bacad kirim screenshot — **Gresik United (GUFC) benar-benar tampil di layar "Competitions" sedang ikut "Asian Champions League Two"**, dengan papan (board) **PLEASED** ("on course to win the Champions League Two"). Jadi klaim lama "Indonesia tidak terdaftar sama sekali, jatah AFC nol" **TERBUKTI KELIRU**.

Dicek ulang `asi.xml` (file yang sama dengan temuan lama) lebih teliti: ternyata file ini punya **4 daftar `nation_list` berbeda**, bukan satu:
- List paling atas file (47 negara) — kemungkinan daftar induk anggota konfederasi untuk kualifikasi tingkat bawah. **Indonesia (113) ADA di sini.**
- Dua list di dalam blok `grouped_nations_list` (tipe `west` 25 negara, tipe `east` 22 negara) — ini **bukan** gerbang kualifikasi, tapi **pengelompokan wilayah untuk undian** (drawing) babak grup ACL Two. **Indonesia ADA di grup "east"**, tidak ada di "west" (karena memang secara geografis masuk Asia Timur/Tenggara dalam pengelompokan ini, bukan karena "tidak terdaftar").
- 1 list kecil berisi 1 negara (kemungkinan override khusus Jepang).

**Analisa sebelumnya cuma mengecek satu dari empat list ini** (kemungkinan list `west`, yang kebetulan tidak memuat Indonesia) dan salah menyimpulkan itu sebagai satu-satunya daftar keanggotaan. Permintaan maaf atas kekeliruan ini — seharusnya dicek semua list sebelum menyimpulkan.

**Mekanisme ACL Two yang benar (dicek di `continental/asi/men/asi_champions_league_2.xml`):**
- Tipe kompetisinya **`cup_winners_cup`** (Piala Juara Piala) — BUKAN liga elite berbasis koefisien 8 tahun seperti ACL Elite.
- Tim diambil lewat `get_main_cup_winner` / `get_qualified_teams_for_comp`, yaitu **juara piala domestik tiap negara anggota** (bukan peringkat liga papan atas).
- Ini pas betul dengan dugaan Bacad: **kemungkinan besar GUFC masuk ACL Two karena juara Piala Liga Indonesia** (kompetisi `jenis 3`, "piala liga" di `competition.dat`) musim sebelumnya — cocok dengan tampilan papan GUFC yang menandai Piala Liga Indonesia sebagai "Not important" (artinya kompetisi itu sudah selesai/dimenangkan musim lalu, bukan musim ini).
- Belum ditemukan rujukan UID eksplisit dari file aturan Indonesia (`comp_idn_cup`/`comp_idn_league_cup`) ke UID ACL Two (2000347776) — jadi penautannya kemungkinan besar **generik/dinamis per negara** (engine otomatis ambil juara piala domestik negara yang terdaftar), bukan ditautkan manual per kompetisi.

**Kesimpulan baru:** Indonesia **SUDAH** punya jalur ke ACL Two lewat juara piala domestik, dan ini **sudah aktif berjalan di game Bacad saat ini** — bukan "pekerjaan baru yang belum dieksekusi" seperti ditulis sebelumnya. Yang **masih belum dicek**: apakah Indonesia juga terdaftar untuk ACL Elite (tier teratas) dan ACGL (kalau ada tier ketiga terpisah), dan apakah jalur via Piala Liga Indonesia ini disengaja desain SEGA atau kebetulan ikutan dari daftar negara konfederasi yang luas.

Status: **VERIFIED (Indonesia terdaftar untuk ACL Two lewat skema cup_winners_cup, dibuktikan langsung di game)**; **HYPOTHESIS (bahwa pemicunya persis juara Piala Liga Indonesia — masuk akal dan konsisten dengan tampilan papan, tapi belum ada rujukan UID eksplisit yang ditemukan)**.

## 5. Ringkasan untuk panduan induk

Tiga hal ini ditambahkan sebagai item baru di masalah terbuka (`00-PANDUAN-INDUK-FMM27-INDONESIA.md` bagian 10):
- Liga U21/U18 Indonesia: dorman, bisa diaktifkan, pekerjaan baru.
- Award (Player/Manager/Team of the Month/Week/Season): kompetisi Indonesia nihil, perlu bongkar `awards.dat` dulu sebelum bisa ditambah.
- Jatah AFC: akar masalah dipastikan (Indonesia tidak ada di `nation_list` benua), langkah perbaikan sudah ada tapi belum dieksekusi.

## 6. Jadwal liga Indonesia, fase grup Liga Nusantara tanpa tabel, dan kepastian slot ACL2 untuk GUFC (22 Nov malam)

Dicek langsung di `comps.dbc` (hasil build B6, `scripts/dbc.py`) untuk BRI Super League, Pegadaian Championship, dan Liga Nusantara.

**6a. Jadwal (`date_range`/`nrtd`) per kompetisi — VERIFIED:**

| Kompetisi | Mulai | Selesai |
|---|---|---|
| BRI Super League | **Juni** | Mei (+1 tahun) |
| Pegadaian Championship (grup & induk) | **Juli** | Mei (+1 tahun) |
| Liga Nusantara (grup A/BC & induk) | **Juli** | Mei (+1 tahun) |
| Piala Presiden | Juni | Juli (musim sama) |
| Piala Super Indonesia | Maret | September (musim sama) |

Championship dan Liga Nusantara mulai **bulan yang sama** (Juli) — jadi **tidak ada jeda kalender** antara klub promosi dari Liga Nusantara dan mulainya musim Championship, dan tanggal "round" (checkpoint musim) persis sama persis di keempat kompetisi (19 Agu, 21 Okt, 11 Nov, 16 Des, 13 Jan, 10 Feb, 10 Mar, 7 Apr) — tanggal ini kemungkinan checkpoint kalender bersama satu negara (bukan jadwal pertandingan per pekan), jadi tidak ada bukti biner liganya "lompat setahun" dari field tanggal ini sendiri.

**Dugaan paling masuk akal (HYPOTHESIS, belum dikonfirmasi Bacad) untuk keluhan papan (board) sudah kecewa padahal liga belum mulai:** Piala Presiden jalan Juni–Juli, **persis bertabrakan dengan awal musim Super League/Championship**. Kemungkinan papan klub menilai performa dari Piala Presiden (klub kalah/tersingkir di piala pra-musim) dan pesan yang muncul di layar tertukar terlihat seperti menilai liga musim itu, padahal liganya sendiri belum resmi mulai. **Belum bisa dipastikan tanpa tangkapan layar pesan papan yang persis** — kalau Bacad bisa kirim screenshot pesan papannya, bisa langsung dicek field pemicu mana yang salah.

Pembanding liga luar **tidak bisa dicek langsung** di `comps.dbc` versi ini karena arsip `sicomps.fmf` Indonesia hanya berisi entri `idn_*` (override), tidak menyertakan entri liga Inggris/negara lain untuk dibandingkan byte-demi-byte. Secara umum (pengetahuan FM, bukan dari file): liga-liga di piramida Inggris (Premier League, Championship, League One, Two) semuanya **mulai di bulan yang sama (Agustus)** — jadi pola Indonesia yang punya selisih 1 bulan antara Super League (Juni) dan Championship/Liga Nusantara (Juli) sedikit tidak lazim, tapi ini **bukan bug** (disengaja di `idn_league_one.xml`/`idn_league_two.xml`), hanya beda konvensi — tidak terbukti jadi penyebab masalah "lompat tahun".

**6b. Fase grup 8-besar Liga Nusantara — VERIFIED bahwa mekanismenya dinamis, bukan daftar statis:**

Entri induk `comp_idn_league_three_1439` menarik tim 8-besarnya lewat `tems` id 2 ("tim lolos") yang merujuk ke UID grup A/B/C (2000700101/102/103) plus kode tahap sumber (`stag`/`nmsn`) — **bukan daftar tim yang di-hardcode per tahun**, berbeda dari dugaan lama (`crgt`/`gptm` terkunci ke tahun 2026) yang tercatat di bagian 2 panduan ini. Dicek langsung: **tag `crgt`/`gptm` sama sekali tidak ditemukan** di entri `comp_idn_league_two_groups_1442`, `comp_idn_league_three_group_a_1439`, maupun `comp_idn_league_three_groups_bc_1439` pada build `sicomps.fmf` B6 saat ini. Jadi secara struktur data, mekanisme penarikan tim untuk 8-besar **seharusnya otomatis setiap musim**, tidak terkunci ke musim pertama.

**Kesimpulan (lama, 22 Nov sore):** tidak ditemukan bukti biner yang menjelaskan "fase grup tidak ada tabelnya" dari sisi `comps.dbc` — strukturnya terlihat benar untuk menarik tim secara dinamis. Status saat itu: **UNKNOWN (akar masalah persis)**, **VERIFIED (mekanisme penarikan tim tidak terkunci tahun seperti dugaan lama)**.

### ✅ JAWABAN (22 Nov malam) — bukan bug, 8-besar memang GUGUR bukan tabel liga

Dibongkar langsung struktur stage `comp_idn_league_three_1439.dbc` (field `sgts`/"stages", dibaca via `scripts/dbc.py`). Kompetisi ini punya **2 stage**:

- **Stage 0** (id mentah `dnr1`, `epyt`=2): stage grup — 3 grup (A/B/C, dirujuk lewat 2 file anak `group_a` + `groups_bc`), punya `knar`("rank" — kriteria tie-break tabel klasemen: poin, selisih gol, dst). **Ini yang punya tabel klasemen.**
- **Stage 1** (id mentah `anif` = "fina"/FINAL terbalik, `epyt`=0): stage final/8-besar — **bukan tabel, tapi daftar `sdnr`("rounds") berisi babak-babak diskrit**. Tiap babak punya tanggal main sendiri (`etad`/`emit`), **hadiah uang untuk pemenang DAN kalah** (`zpnw`="winner prize"/`zpsl`="loser prize", masing-masing field `hsac`="cash"), aturan adu penalti (`sapd`=1, boolean "decided by penalty"), dan kriteria peringkat pemenang/kalah babak gugur (`knrw`/`knrl`). Ini **ciri khas sistem GUGUR (knockout)**, bukan liga/grup.

**Kesimpulan: fase 8-besar Liga Nusantara memang tidak punya tabel klasemen KARENA DESAINNYA sistem gugur — bukan bug.** Sistem gugur secara alami tidak punya tabel akumulasi poin, hanya hasil per babak. Yang Bacad lihat ("jadwal ada tapi tabelnya tidak ada") kemungkinan besar sudah **sesuai desain game** — tinggal dicek lagi apakah tampilan di HP memang menunjukkan bracket/hasil babak (bukan tabel), bukan menu yang kosong.

Bonus temuan: field `catf` (daftar slot kualifikasi) di stage FINAL ini menunjuk langsung ke `pmoc` (UID kompetisi) milik **Pegadaian Championship** — mengonfirmasi ulang bahwa **pemenang final Liga Nusantara promosi langsung ke Championship**, bukan ke BRI Super League.

Status: **VERIFIED** (struktur stage dibongkar langsung dari `comps.dbc` build B6).

**6c. Slot ACL2 untuk GUFC musim depan.**

~~Jawaban tegas: TIDAK ADA, dua alasan berlapis (Indonesia tidak di `nation_list`; slot AFC hanya dari liga papan atas).~~ **DIBANTAH, lihat koreksi di bagian 4.** Bacad membuktikan langsung di game: GUFC bermain ACL Two, papan PLEASED. Setelah dicek ulang, `asi.xml` punya 4 daftar `nation_list` (bukan 1) dan Indonesia ADA di 2 dari 4 (master 47-negara + wilayah "east" 22-negara). ACL Two bertipe `cup_winners_cup` — sumber timnya `get_main_cup_winner` (juara piala domestik tiap negara terdaftar), **bukan posisi liga papan atas** — jadi poin kedua di atas (soal "harus dari Super League") juga tidak berlaku untuk ACL Two spesifik (beda dengan ACL Elite, lihat bagian 7).

Tidak ada perubahan file game di temuan ini — murni analisa (sesuai aturan "jangan eksekusi sebelum bilang eksekusi").

## 7. Slot ACL Elite (koefisien liga) — dicek 22 Nov malam, atas permintaan Bacad

Bacad ingin tahu apakah bisa dapat slot **ACL Elite** (bukan cuma ACL Two) dengan menaikkan koefisien liga. Dicek `asi_champions_league.xml` (Comp ID 127286, "Asian Champions League Elite").

**VERIFIED — mekanismenya memang berbasis koefisien, bukan posisi liga langsung:**
- File ini memakai `number_of_years_for_coefficients: 8` dan `type: multi_year_coefficient` — koefisien dihitung dari **akumulasi hasil 8 musim terakhir**, dengan bobot musim terbaru 100% turun ke 30% di musim ke-8 (`coefficient_weighting_list`: 1.0, 0.9, 0.8, ... 0.3).
- Babak kualifikasi ACL Elite dibagi jadi beberapa **bracket bertingkat** berdasar region (`West`/`East`) dan jumlah tim: `wc4t` (4 tim), `wc6t` (6 tim), `wc8t` (8 tim) — masing-masing sumber timnya `get_qualified_teams_for_comp` dengan `qualified_teams_seeding` berbeda (6 untuk wc6t/wc8t). Semakin rendah koefisien sebuah negara dibanding negara lain di region yang sama, kemungkinan besar wakilnya masuk dari bracket kualifikasi paling awal (lebih banyak babak yang harus dilewati), bukan langsung ke grup utama.
- Urutan rumah/tandang di undian bahkan dipatok ke koefisien: `draw_rules: highest_cont_cup_nation_coefficient_plays_at_home` — negara dengan koefisien lebih tinggi main di kandang.

**Soal Indonesia:** karena `nation_list` yang dipakai `asi_champions_league.xml` berasal dari mesin yang sama di `asi.xml` (yang sudah dibuktikan memuat Indonesia di 2 dari 4 daftarnya), **kemungkinan besar Indonesia juga sudah masuk kolam kualifikasi ACL Elite** — hanya saja karena koefisiennya masih rendah/nol (belum ada riwayat hasil continental), wakil Indonesia (kalau ada) akan start dari bracket kualifikasi paling bawah, bukan dapat slot langsung.

**Status:**
- **VERIFIED**: mekanisme ACL Elite = koefisien 8-musim berbobot, bukan jatah tetap per negara.
- **HYPOTHESIS (belum dikonfirmasi langsung di game)**: Indonesia sudah ada di kolam kualifikasi ACL Elite juga (sama seperti ACL Two), tapi start dari bracket paling bawah karena koefisien masih kosong.
- **UNKNOWN**: angka ambang (threshold) koefisien yang memindahkan sebuah negara dari satu bracket ke bracket lain — tidak ditemukan di XML, kemungkinan dihitung dan dibandingkan lintas-negara di `libgame.so` saat runtime, bukan nilai tetap per negara.

**Jawaban untuk rencana Bacad ("menaikkan koefisien liga"):** ya, itu memang jalurnya yang benar — koefisien naik dengan **hasil klub Indonesia di kompetisi AFC** (menang/jauh di ACL Two atau Challenge League menyumbang poin musiman, diakumulasi 8 musim). Tidak ada cara pintas lain yang ditemukan di data (tidak ada field "paksa slot ACLE" per negara). Belum dicek: apakah Indonesia sudah benar-benar start dari bracket kualifikasi di game Bacad sekarang (perlu dicek langsung di menu AFC Indonesia musim ini) atau belum muncul sama sekali — ini perlu konfirmasi dari Bacad untuk memastikan HYPOTHESIS di atas.
