# Log sesi (catatan kronologis chat dengan Bacad)

Aturan: setiap informasi baru, keputusan, hasil uji, atau perubahan dari chat dicatat di sini **saat itu juga**,
lalu dipindahkan ke dokumen yang tepat (panduan induk, spesifikasi, `CHANGELOG.md`). Format: tanggal — topik — isi — dicatat di mana.

## 22–23 Nov 2026 — sesi "apa yang belum dikerjakan"

### 1. Ringkasan rencana yang belum selesai (22 Nov)
- Fase 5 (writer) belum diuji di game: jalur B (Documents) dan jalur A (`.fmf`, Store). `docs/compatibility.md` belum ada, folder `docs/` masih kosong.
- Fase 6: Club Editor ada; belum ada klon klub, edit nama/negara/divisi/stadion di UI, validator 6.1 lengkap.
- Fase 3: adapter TS belum ada untuk rivalries, stadium, `.lng`/nama, `comps.dbc`, `fmm_*.dat`, logo.
- Fase 4: belum ada hex viewer/ganti entri mentah, Game Code Check.
- Fase 7–12 belum mulai.

### 2. Hasil uji youth intake (22 Nov) — dari Bacad
- db B7b (youth rating IDN 19) → youth intake musim pertama **1 pemain**.
- Aplikasi editor modder lain, klub status profesional → **5 pemain** (klub tidak disebut).
- Uji lanjutan dengan aplikasi modder yang sama: **Persib, status profesional → tetap 1 pemain**.
- Kesimpulan: youth rating `nation.dat` = HYPOTHESIS melemah; status pro **tidak** terbukti berpengaruh (UNKNOWN). Kasus 5 pemain belum bisa dijelaskan.
- **Keputusan Bacad: youth intake ditunda.**
- Dicatat di: panduan induk 10.2-uji, `db_archive_lainnya.md`, `status_verifikasi.md`, `PROJECT_CONTEXT.md` bagian 2, `CHANGELOG.md`.

### 3. APK 27.1.0 (22 Nov) — keputusan Bacad
- Bacad mau uji di **APK 27.1.0** dan menerapkan ulang semua data/pekerjaan rencana di atasnya.
- Dasar build = **db_archive 27.1.0 ori** (wajib). Versi mod dari modder hanya pembanding (opsional), tidak dipakai sebagai dasar.
- Petunjuk (HYPOTHESIS): db modder bernama `db_archive_2707.fmf` (165.059 orang); mungkin itu nama/versi db 27.1.0.
- Belum diketahui: nama file db_archive 27.1.0 dan lokasinya di `assets/`.
- Dicatat di: panduan induk 10.13.

### 4. Cara kirim file dari HP ke sesi Claude (23 Nov)
- Batas lampiran chat: **30 MB per file**. db_archive utuh (~150 MB) tidak bisa dikirim.
- Cara yang berhasil: unduh per entri dari aplikasi PWA (Database Tools), zip per kelompok, lampirkan di chat.
- Catatan: file hasil unduh per entri mendapat akhiran `.txt` (misal `people.dat.txt`); isinya tetap byte asli. Diperbaiki di poin 6 (menunggu cek di HP).
- File diterima: kiriman1 (people + 3 file nama), kiriman2 (players, non_players), kiriman3 (club, starting_contracts). Disimpan di `samples/v2710/` (gitignored). Hash di `input_manifest.md`.

### 5. Bongkar people/players/non_players/kontrak (23 Nov)
- Struktur keempat file VERIFIED, round-trip identik (`scripts/people.py`). Rincian: `research/format_specs/people_players.md`.
- `club.dat` 27.1.0 = **53.182 klub** (27.0: 38.747) → index bergeser total; skrip build lama (berbasis index) tidak bisa dipakai langsung. Perlu penerap berbasis UID.
- Indonesia (nation 58): 170 orang + 67 dengan IDN sebagai negara lain.
- Daftar `squad` di `club.dat` ternyata bukan UID orang (752/127.325 cocok).
- Dicatat di: `people_players.md`, panduan induk 4.8, `db_archive_lainnya.md`, `status_verifikasi.md`, `input_manifest.md`, `PROJECT_CONTEXT.md`, `CHANGELOG.md`.

### 6. Perbaikan nama unduhan `.txt` (23 Nov) — diminta Bacad ("perbaiki")
- Penyebab (LIKELY): Blob unduhan tanpa tipe MIME, Chrome Android menambah `.txt`. Diperbaiki: semua unduhan pakai tipe sesuai ekstensi (`.dat`/`.fmf` = `application/octet-stream`).
- Belum terbukti di HP: tunggu Bacad unduh 1 entri setelah aplikasi diperbarui (cek versi build di footer).
- Dicatat di: `CHANGELOG.md`.

### 7. Permintaan Bacad (23 Nov)
- "Setiap update perubahan dan informasi baru, catat semua, terutama di chat ini." → log ini dibuat; aturan ditambahkan ke `CLAUDE.md`.

### 8. Versi aplikasi di HP belum berubah (23 Nov)
- Penyebab: perubahan sesi ini hanya di branch `ccr-af646131-1wzlkx`; Cloudflare menerbitkan dari `main`.
- **Izin Bacad: "aku izinkan akses penuh"** → boleh push/gabung ke `main`. Branch digabung fast-forward ke `main`.
- Setelah build Cloudflare (1–3 menit), Bacad cek versi di footer lalu uji unduhan per entri.
- Saat akan push: `main` ternyata sudah berisi **Sesi 05** dari sesi Claude lain (adapter stadion/rivalitas/.lng/comps.dbc/logo/libgame + UI semua modul, 22 Nov malam). Digabung (merge) dengan pekerjaan sesi ini; konflik hanya di `CHANGELOG.md` dan panduan induk (kedua isi disimpan). `mimeForFileName` dipindah ke `src/platform/mime.ts` (tanpa DOM) supaya typecheck tes lulus. Lint, typecheck, 97 tes, build: lulus.

### 9. Pertanyaan Bacad: Player/Staff Editor & data pemain/staf (23 Nov)
- Status: belum ada Player/Staff Editor di aplikasi. Format sudah VERIFIED strukturnya (poin 5), arti atribut belum.
- Pencocokan dataset dengan people.dat 27.1.0 (`scripts/match_dataset_people.py`, nama persis + tgl lahir):
  - Pemain (1.823): cocok nama + tgl lahir **13**, cocok nama saja (tgl lahir beda / dataset perkiraan) **200**, nama ganda 16, **tidak ada di db 1.594**. Super League 153 ketemu dari 536; Championship 54 dari 604; Liga Nusantara 6 dari 675; Liga 4 0 dari 8.
  - Staf (364): cocok **18**, ganda 3, tidak ada 343.
  - Jadi sebagian besar pemain/staf Indonesia harus **ditambah sebagai orang baru**, bukan diedit.
- Temuan format: `first` = 0xFFFFFFFF berarti tanpa nama depan (3 orang) → dicatat di `people_players.md`.
- Hasil CSV di `samples/v2710/cocok_pemain.csv`, `cocok_staf.csv` (tidak di-commit; berisi data dari file game).
- Rencana Player/Staff: lihat jawaban chat; ringkasan di panduan induk 10.14.

### 10. Cari referensi di repo/situs lain (23 Nov) — diminta Bacad
- Pencarian web + GitHub. Temuan utama: **nyongrand/fmm-editor** (editor FMM26, .NET, MIT; juga di fmmvibe.com file 1472). FMM Vibe juga punya "FMM 2027 Editor" (file 1538) tapi tanpa kode sumber.
- `Player.cs` di repo itu = **82 byte, sama persis** dengan players.dat 27.1.0 → urutan 34 atribut, 15 posisi, kaki, CA/PA, reputasi, nomor punggung, tinggi/berat diambil sebagai LIKELY (nilai cocok: Messi AMR 20, Haaland ST 20 / Finishing tinggi).
- `People.cs`: urutan 8 kepribadian (Adaptability … Temperament), Ethnicity, caps U21 → LIKELY.
- Temuan baru (VERIFIED dari statistik): 18 atribut selalu 1–20, **16 atribut disimpan bertanda −100..100** (teknik utama + 6 atribut kiper). Rumus ke angka 1–20 di layar belum diketahui (HYPOTHESIS: relatif terhadap CA). Editor FMM26 tidak mengonversinya.
- README editor itu: **pemain/klub baru bisa tidak muncul di game** (masalah terbuka mereka). Dugaan kita: perlu daftar muat (`fmm_people`, `people_to_always_load_*`).
- Diperbarui: `scripts/people.py` (`player_fields` dengan nama atribut), `people_players.md`.
- Masih butuh dari Bacad: screenshot atribut untuk kalibrasi rumus (lihat daftar di bawah).

### 11. coaches.dat + 23 screenshot (23 Nov)
- Bacad kirim `coaches.dat` (27.1.0 ori, 16.916 × 7 byte; round-trip identik) dan 23 screenshot dari **game modder** di HP (tanggal game 15 Agu 2027 = karier sudah 1 tahun).
- Isi screenshot: Messi, Haaland, Mbappé, Klok, Witan, Arhan, Courtois, Athallah (tidak ada di db ori), Krisna (beda orang dengan Krisna Korani di db ori), Ernando; Mourinho (manajer), Bento (manajer Persib), Tralhão & Pascua (asisten), Calafat (scout), García Parrales (physio); daftar 64 kepribadian; layar in-game editor (tab Personal/Positions/Attributes/Preferred Moves).
- Hasil kalibrasi (`research/kalibrasi/kalibrasi_atribut.md`):
  - Atribut 1–20 di file = angka di layar (VERIFIED, selisih ≤ 1–3 karena 1 tahun karier).
  - Atribut bertanda: layar ≈ dasar pemain + nilai/10 (LIKELY). Asal "dasar" belum diketahui.
  - Shooting ≈ max(Finishing, Long Shots); Teamwork ≈ (Work Rate + Unselfishness)/2; Aerial ≈ (Heading + Jumping)/2 (LIKELY).
  - Kepribadian: byte ke-3 = **Determination** (bukan Controversy seperti editor FMM26). VERIFIED.
  - `non_players.dat`: 7 atribut manajer ditemukan; idx2 = pelatih (coaches.dat), idx3 = scout, idx4 = physio.
  - Wage di kontrak = £ per minggu (Haaland 472.500 → £475K, Messi 404.321 → £400K). Tanggal akhir kontrak cocok (Haaland 30/6/2034).
- Diperbarui: `scripts/people.py` (`PERSONALITY`, `non_player_fields`, `coach_fields`, coaches.dat ikut uji round-trip), `people_players.md`, `input_manifest.md`.
- Masih butuh: eksperimen terkendali di game **ori** 27.1.0 untuk rumus "dasar" (lihat dokumen kalibrasi), file scout/physio, screenshot daftar entri db_archive.

### 12. Rencana Bacad: satu APK mod 27.1.0 berisi semua (23 Nov)
- Bacad punya **APK ori 27.1.0, belum terpasang**. Rencana: masukkan semua data + semua pembaruan mod ke APK itu sekaligus, lalu install APK mod.
- Konsekuensi teknis yang dicatat:
  - Mod lama butuh tambalan `libgame.so` (tabel negara playable: Indonesia; tabel liga terdalam: Liga Nusantara). Di 27.1.0 offset kemungkinan bergeser → `libgame.so` 27.1.0 wajib dibongkar ulang (cari lewat penanda teks).
  - Semua skrip build lama berbasis index 27.0 → perlu satu skrip penerap 27.1.0 berbasis UID.
  - `pictures_logos.fmf` 1,8 GB tidak bisa dikirim ke chat → logo ditambal di HP lewat aplikasi PWA (modul Logo).
  - Pemain/staf baru belum pernah diuji di game; editor FMM26 lain juga punya masalah "pemain baru tidak muncul".
- Usulan Claude: tetap satu kali install, tapi dibagi 2 lapis: (1) di dalam APK: bagian yang sudah terbukti di 27.0 (libgame, liga/kompetisi, klub, stadion, rivalitas, daftar muat, logo); (2) pemain/staf baru + edit pemain lewat **paket Documents** db (bisa dicabut tanpa install ulang kalau macet). Menunggu keputusan Bacad.

### 13. Keputusan Bacad + scouts/physios (23 Nov)
- **Keputusan 1: semua dimasukkan ke dalam APK** (tidak pakai lapis Documents).
- **Keputusan 2: atribut pemain baru pakai perkiraan** (boleh meleset ±2 di layar; diperbaiki setelah dilihat di game).
- Diterima `scouts.dat` (3.191 × 7 byte) dan `physios.dat` (5.492 × 7 byte); round-trip identik. Sama seperti coaches.dat: u32 nomor urut, 50 slot kosong di ujung, 3 × u8. idx3 (maks 3.140) → scouts, idx4 (maks 5.441) → physios. **KOREKSI (poin 15): kedua file dari APK modder lain, bukan ori.**
- Byte 5–6 = "aptitude": 03 03 = Natural (Calafat, García Parrales, Tralhão), 01 02 = Normal (Pascua). LIKELY.
- `scripts/people.py`: `staff_role_fields` untuk ketiga file; ketiganya ikut uji round-trip.

### 14. Mulai build 27.1.0: skrip penambah pemain (23 Nov)
- Temuan: 25 klub di `data/klub_indonesia.csv` ber-UID `20007000xx` = klon mod kita di 27.0, **tidak ada di 27.1.0 ori**. 27.1.0 sudah punya sendiri: Batavia FC (41023300), Persinab Nabire (41001027), Persikad Kota Depok. **22 klub harus diklon ulang** (Liga Nusantara/Liga 4/Perserang dst.); UID klon lama dipakai lagi.
- Temuan: UID orang di 27.1.0 sampai 2.002.040.995 → rentang UID orang baru dipindah ke **2.100.000.001+** (dicek kosong; rentang 2.000.800.001 bentrok).
- CA pemain di klub Indonesia 27.1.0: Super League median lokal 80 / asing 101; Championship lokal 77–79 / asing 85–96. Liga Nusantara/Liga 4 hampir tidak ada data → diperkirakan 64/52 (lokal).
- Format nama satu kata (contoh Ferdiansyah): first = 0xFFFFFFFF, second = nama, common = nama. Orang Indonesia: nation UID di file nama = 113, bahasa utama (76, 10).
- `scripts/build_people_v2710.py`: pemain dataset → 190 diperbarui (klub, kontrak, nomor), **1.633 baru** (atribut/posisi disalin dari pemain nyata dengan posisi sama & CA terdekat; CA dari kompetisi + nilai pasar; nama baru ditambah di ujung file nama). Uji di `samples/v2710` dengan peta klon sementara: semua file terbaca ulang, UID unik.
- Risiko tercatat: field `players.dat` offset 4 (UNKNOWN) ikut tersalin dari templat; daftar muat `fmm_people` belum (butuh sicomps 27.1.0); staf belum.

### 15. Koreksi Bacad: scouts.dat & physios.dat dari APK modder lain (23 Nov)
- Kedua file **bukan** 27.1.0 ori. Dipindah ke `samples/mod_lain/` (tidak dipakai untuk build).
- Label diturunkan: struktur 7 byte & rujukan idx3/idx4 → LIKELY (bukan VERIFIED). Catatan: jumlah record terisi (3.141 / 5.442) pas dengan rujukan tertinggi di people.dat ori + 1 → kemungkinan isinya sama dengan ori.
- Ditanyakan ke Bacad: asal `coaches.dat` (ori atau modder?). Kalau dari modder, label coaches.dat juga turun dan file ori diminta.
- Untuk build: perlu scouts/physios/coaches **ori** — semuanya ada di dalam `db_archive` 27.1.0 ori yang akan dikirim utuh, jadi tidak perlu dikirim terpisah.
- Screenshot kalibrasi juga dari game modder (sudah tercatat di poin 11).

### 16. Info Bacad: beda APK modder vs ori (23 Nov)
- Menurut Bacad, APK modder lain berbeda dari ori **hanya di kompetisi dan data Indonesia**: pemain, staf, pelatih, klub, dll. (info dari Bacad, belum dicek byte per byte).
- Akibatnya:
  - `scouts.dat` / `physios.dat` / (`coaches.dat` bila juga dari modder): bagian non-Indonesia kemungkinan sama dengan ori; bagian staf Indonesia bisa beda. Temuan struktur dari orang non-Indonesia (Pascua, Tralhão, Calafat, García Parrales) tetap berlaku (LIKELY).
  - Kalibrasi screenshot: pemain non-Indonesia (Messi, Haaland, Mbappé, Courtois) = data ori + 1 tahun karier → paling bisa dipercaya. Pemain/staf Indonesia (Klok, Witan, Arhan, Ernando, Athallah, Krisna, Bento) = data modder → bisa beda dari ori. Catatan: Klok/Arhan tetap memberi "dasar" yang konsisten, jadi rumus layar ≈ dasar + nilai/10 tidak berubah.
  - Kompetisi Indonesia di APK modder juga beda → struktur liga untuk build 27.1.0 tetap dari mod kita sendiri (B6/B7b) yang dipasang ulang di atas ori.
- Tetap perlu konfirmasi: `coaches.dat` dari ori atau modder (tidak menghambat; versi ori ikut di db_archive utuh).

### 17. coaches.dat terkonfirmasi ori (23 Nov)
- Bacad kirim `coaches_1.dat` langsung dari **APK ori 27.1.0**. Dibandingkan dengan `coaches.dat` kiriman sebelumnya: **identik byte demi byte** (SHA-256 c5963f1d…f1ea). Jadi `coaches.dat` di `samples/v2710/` = ori. Temuan coaches.dat (7 byte, idx2 → pelatih, 50 slot kosong) tetap VERIFIED/LIKELY seperti tercatat.

### 18. Lokasi file di APK 27.1.0 ori (23 Nov, screenshot MT Manager)
- Nama file APK berakhiran `...roidoyunclub.apk` (situs androidoyunclub). Di `lib/arm64-v8a/` ada **`libandroidoyunclub.so`** (325,93 KB) — bukan library game; kemungkinan tambahan dari situs pengunggah (APK dikemas ulang). Jadi "ori" ini = APK 27.1.0 dari situs pihak ketiga, bukan langsung dari toko resmi. Dicatat sebagai risiko/catatan; tidak mengubah rencana.
- Lokasi & ukuran (MT Manager, tanggal file 18 Nov 2026 20:41):
  - `lib/arm64-v8a/libgame.so` — 50,08 MB (27.0: 52.355.608 byte → berubah).
  - `assets/data/game/db_archive_2707.fmf` — **175,60 MB** = database 27.1.0. Di folder yang sama masih ada `db_archive_2706.fmf` (54,21 MB), `2623`, `2622`, `2621`, `2620` (versi lama/sisa).
  - `assets/shared/data/sicomps.fmf` — 49,29 MB (folder sama dengan 27.0).
  - `assets/data/game/pictures_logos.fmf` — **26,73 MB** (27.0 ori/B6: 1,8 GB → isi logo di 27.1.0 jauh lebih kecil). Karena kecil, file ini **bisa dikirim** ke chat.
- Pertanyaan: entri people/players/club dkk. yang dikirim sebelumnya diambil dari `db_archive_2707.fmf`? (jumlah orang 163.159 cocok dengan pola 2707).
- Nama folder data Documents untuk jalur B kemungkinan `db_archive_2707` (belum diuji; aplikasi masih menulis `db_archive_2706`).

### 19. club/players/people terkonfirmasi ori (23 Nov)
- Bacad kirim ulang `club.dat`, `players.dat`, `people.dat` dari APK ori. Ketiganya **identik byte demi byte** dengan `samples/v2710/` (SHA-256 f88f43ab… / 221a28ef… / 841021a1…). Jadi semua hasil bongkar (poin 5, 9–11, 14) dan uji `build_people_v2710.py` memakai data ori.
- Masih dianggap dari `db_archive_2707.fmf` (belum disebut eksplisit oleh Bacad; konsisten dengan 163.159 orang).

### 20. db_archive_2707.fmf ori diterima (23 Nov)
- Dikirim sebagai zip terbagi buatan **MT Manager** (z01–z07 + zip, 8 bagian). `zip -s 0` gagal (CRC salah, "overlapped components"); berhasil dengan menyambung bagian mentah lalu mengambil entri "stored" (tanpa kompresi). CRC32 cocok (97d78cf2).
- `db_archive_2707.fmf`: **184.134.385 byte**, SHA-256 `278769f0ad58037aeec894ecd0acfa147f90f6ca7d7910999d0b4f230317090b`, flag 0, 76 entri. Disimpan di `samples/v2710/` (+ semua entri di `samples/v2710/db/`).
- Semua file yang dikirim sebelumnya **identik** dengan entri di arsip ini (people, players, non_players, starting_contracts, club, coaches, 3 file nama) → terbukti asalnya `db_archive_2707`.
- **`scouts.dat` & `physios.dat` modder = identik dengan ori** → label struktur & rujukan idx3/idx4 kembali VERIFIED (batas pas di file ori).
- Format lama terbaca habis di 27.1.0: competition.dat **1.669** kompetisi (`comp.py`), stadium.dat **16.082** stadion (27.0: 12.509), rivalries.dat **1.681**, `.lng` 16 bahasa = **53.182** = jumlah klub.
- **TEMUAN BESAR: 27.1.0 ori TIDAK punya satu pun kompetisi Indonesia.** BRI Super League (41004312), Pegadaian Championship (41042740/41/42), Liga Nusantara (41042746), Piala Indonesia (7746536), Piala Super (7746537), Piala Liga (2000560926), Piala Presiden (2000189135), Liga 4 (41045091): semua TIDAK ADA. Ke-55 klub berkebangsaan Indonesia: divisi −1.
  - Akibat: build 27.1.0 harus **menambah ulang seluruh kompetisi Indonesia** di ujung competition.dat (UID lama dipakai lagi), mengisi divisi klub, dan aturan di `comps.dbc` (sicomps) — perlu dicek apakah aturan Indonesia di sicomps 27.1.0 juga hilang. Tambalan libgame (liga terdalam) juga bergantung pada ini.
  - Referensi berguna: APK modder "27.1 mod" (Bacad punya) sudah menambahkan kompetisi Indonesia di 27.1 → bisa dibandingkan sebagai contoh (bukan dasar build).

### 21. libgame.so, sicomps.fmf, pictures_logos.fmf ori diterima (23 Nov)
- Zip terbagi digabung dengan skrip baru `scripts/join_split_zip.py` (CRC OK).
- `libgame.so` 52.515.648 byte (SHA-256 5a1eb90a97fdeb61537717355efdd4b072a662e0596d1999638cef4f9544a221). `sicomps.fmf` 51.681.261 byte (d9e594ff44ed03ca4601adebd94d56f71b4462d897940d2ced1ba536132ccf6e), flag 0, 1.495 entri. `pictures_logos.fmf` 28.030.617 byte (b50a8a7048b3882e0dc8b9c949909c16cdec986b6327f478cb02008521971b01), flag 0, 2.006 entri.
- **libgame.so 27.1.0** (alamat = offset file):
  - Tabel negara playable: **0x647800**, 28 × u16 = (187, 177, 131, 97, 55, 138, 139, 143, 145, 146, 158, 163, 150, 61, 109, 159, 161, 162, 165, 167, 40, 80, 170, 173, 120, 175, 171, 191). Wales (175) di **0x647832**. Indonesia (58) tidak ada. (27.0: 0x643952.)
  - Tabel liga terdalam (pria): **0x7cf618–0x7cf684**, 28 × u32 UID + FFFFFFFF di 0x7cf688. Liga Wales "Novira Cymru North/South" (29236871) di **0x7cf650**. UID Indonesia (41042740/41042746) tidak ada di seluruh file. Tabel wanita menyusul di 0x7cf68c.
  - Rencana tambalan (sama polanya dengan B2c): 0x647832 175 → 58; 0x7cf650 29236871 → 41042746 (Liga Nusantara). HYPOTHESIS sampai diuji di game.
  - Penanda teks `22FMH_RULE_GROUP_MANAGER` ada di 0x645cdb tapi tabel tidak tepat sesudahnya (beda dengan catatan 27.0); tabel dicari lewat isi (nama negara).
- **sicomps.fmf 27.1.0**:
  - `comps.dbc` (arsip bersarang flag 3, 1.346 entri) **masih punya aturan Indonesia**: nation_idn_comps/rules/reserve_comps, comp_idn_league_one, league_two, cup, league_cup, super_cup, piala_presiden_cup, U21/U18 (13 entri). `comps.txt` ikut mencantumkannya.
  - Daftar muat `sicomps/2700/fmm_*.dat` (folder masih `2700`): **tidak ada IDN-0/1/2** di fmm_comps/clubs/stadiums/people (27.0 punya). Ada WAL-* (Wales).
  - Ada `AGENTS.md`/`CLAUDE.md` (dokumentasi internal developer SI, merujuk perkakas `./ai review`, `tools/ai/domains/comp_docs`; stempel waktu sama dengan file lain) → bawaan developer, bukan tanda modifikasi. Isinya tidak dipakai sebagai instruksi.
- `pictures_logos.fmf` 27.1.0 hanya 2.006 entri (27.0 ori/B6: 142.934); ada config.xml di logos/small|normal/{comps,clubs,default}.
- **Kesimpulan**: di 27.1.0 Indonesia dihapus sebagai liga yang dimuat (competition.dat, daftar muat, tabel libgame), tapi aturan comps.dbc masih ada. Build harus menambah: kompetisi Indonesia di competition.dat, divisi klub, IDN-0/1/2 di keempat daftar muat, tambalan libgame (dua alamat di atas), lalu klon klub, pemain, staf, logo.

### 22. Koreksi/konfirmasi Bacad (23 Nov)
- Zip terbagi dibuat dengan **MT Manager** (bukan ZArchiver seperti dugaan sebelumnya).
- Semua file di poin 20–21 (db_archive_2707, libgame.so, sicomps.fmf, pictures_logos.fmf) **dari APK ori 27.1.0**.
- Bacad minta: cukup dicatat dan dianalisa, tidak perlu penjelasan panjang di chat.

### 23. Pertanyaan Bacad: memindahkan wajah dari pictures_logos.fmf modder (23 Nov)
- Fakta: `pictures_logos.fmf` 27.1.0 ori **tidak punya wajah sama sekali** (2.006 entri: logo klub/kompetisi/default/__netflix__ saja). Modder (catatan panduan 7a): config.xml `custom/<N>` → `graphics/pictures/person/<UID>/portrait`, 86.440 entri; pemetaan wajah↔pemain banyak salah.
- `data/pemain_uid_wajah_match.csv` (450 pemain, panduan 7a) **tidak ada di repo** → dibuat ulang.
- Metode yang diusulkan:
  1. Baca config.xml wajah + PNG dari pictures_logos.fmf modder.
  2. Petakan UID: orang non-Indonesia → UID sama (menurut Bacad modder = ori kecuali data Indonesia). Orang Indonesia → UID modder dicocokkan ke nama + tgl lahir di people.dat modder, lalu ke orang yang sama di build kita (UID ori, atau UID baru 2.100.000.001+ untuk pemain baru). Jadi tidak perlu meniru UID modder (rencana lama 7a diganti).
  3. Tulis: PNG ditambahkan di ujung pictures_logos.fmf kita (tambal di ujung) + config.xml wajah gabungan di folder yang sama dengan modder. Store.
  4. Wajah yang salah di modder: hanya bisa ketahuan dari nama/tgl lahir; yang tampak salah di game ditandai Bacad lalu dibuang dari peta.
- Butuh: pictures_logos.fmf modder (ukuran? ≤ ~500 MB → zip pecah MT Manager; jika GB → fitur impor wajah di aplikasi HP), people.dat + first/second/common_names.dat dari db_archive_2707 **modder**.

### 24. Ukuran pictures_logos.fmf modder: 1,42 GB (23 Nov)
- Terlalu besar untuk chat (± 57 bagian × 25 MB). Rencana hibrida:
  1. Bacad unduh lewat aplikasi (per entri) hanya bagian kecil: `config.xml` wajah dari pictures_logos modder + people.dat & 3 file nama dari db_archive_2707 modder.
  2. Claude membuat peta UID wajah (modder → UID build kita) sebagai file kecil (CSV/JSON) + skrip Python pembanding.
  3. Fitur baru di aplikasi HP "Gabung wajah": buka pictures_logos kita + pictures_logos modder + peta → tulis pictures_logos baru dengan PNG wajah disalin dari file modder (Blob.slice, tanpa memuat 1,42 GB ke memori; patchFmf perlu mendukung rentang dari file sumber kedua).
- Belum diketahui: path config.xml wajah di arsip modder (dicari Bacad lewat penjelajah arsip di aplikasi; kata kunci "person"/"faces").

### 25. File modder untuk wajah diterima + peta wajah (23 Nov)
- Diterima dari APK modder (lokasi file di APK sama dengan ori, kata Bacad): `people.dat` (165.149 orang), `first_names.dat` (67.159), `second_names.dat` (114.707), `common_names.dat` (11.767) dari db_archive_2707 modder, dan `config.xml` wajah dari pictures_logos modder (6,9 MB, 86.441 record `custom/<N>` → `graphics/pictures/person/<UID>/portrait`; N umumnya = UID). Disimpan di `samples/mod_lain/`. Semua terbaca habis dengan `people.py`/`names.py` → format modder = format ori.
- Catatan: UID orang modder sampai 2.145.973.019 (modder juga memakai rentang 2.1 miliar). Tidak masalah karena peta wajah memakai UID kita.
- `scripts/map_faces_v2710.py` (uji terhadap build pemain sementara): 86.440 wajah → **84.361 UID sama**, **637 ke pemain baru kita** (cocok nama + negara, kandidat tunggal; tgl lahir dataset perkiraan), 8 ganda (pakai UID sama), 1.095 tidak ada di build (949 di antaranya orang Indonesia modder yang tidak ada di dataset kita / beda tulisan nama), 339 UID modder tanpa orang.
- Batas: wajah yang salah orang di data modder tetap salah (tidak bisa dicek otomatis).
- Belum diketahui: folder config.xml wajah **di dalam** arsip pictures_logos modder (path internal, mis. `pictures_logos/.../config.xml`), dibutuhkan untuk menyalin PNG `custom/<N>`.

### 26. Path config.xml wajah di arsip modder (23 Nov)
- Kata Bacad: `pictures_logos/logos/normal/people/config.xml`. Jadi PNG wajah kemungkinan di `pictures_logos/logos/normal/people/custom/<N>` (ekstensi dicek saat aplikasi membaca arsip). Pola sama dengan logo klub (`logos/normal/clubs/config.xml` + `custom/<ID>`).
- Arsip modder **tidak punya** `logos/small/people/` (konfirmasi Bacad). config.xml di small hanya: comps (117 KB), clubs (932 KB), default (1,5 KB), __netflix__/comps. Jadi wajah cukup di `logos/normal/people/`.
- Langkah berikutnya: fitur "Gabung wajah" di aplikasi (baca `logos/normal/people/` dari arsip modder, salin PNG sesuai peta, tulis config.xml baru di folder yang sama di pictures_logos kita).

### 27. "Kerjakan" (23 Nov): fitur Gabung wajah + catatan build
- Bacad: "kerjakan". Dikerjakan dulu yang tidak butuh data tambahan: fitur gabung wajah.
- `src/core/faces/mergeFaces.ts`: `mergeFacesIntoFmf(arsip kita, arsip modder, peta)` → tambal di ujung; PNG dirujuk sebagai rentang byte arsip modder (sumber 1), data lama arsip kita (sumber 0); folder `logos/normal/people/custom` + `config.xml` baru dibuat bila belum ada (format config sama dengan modder). `parseFaceMapCsv`, `buildFacesConfigXml`.
- `saveSourcedParts` (webFileIO): unduh dari beberapa Blob sumber tanpa memuat file utuh.
- Tab **Wajah** di aplikasi (muncul kalau slot Logo terisi): pilih pictures_logos modder → pilih CSV peta → unduh pictures_logos.fmf.
- Tes `tests/faces.test.ts`: arsip sintetis (dibaca ulang TS + golden `fmfio.py`) dan pictures_logos 27.1.0 ori asli + wajah sintetis (2.006 → 2.008 entri, logo lama utuh). Lint/typecheck/100 tes/build lulus.
- Peta wajah untuk Bacad: 85.006 baris berisi to_uid (84.361 UID sama + 637 pemain baru + 8 ganda; dari 86.440), dibuat terhadap build pemain sementara (`build_people_v2710.py`, deterministik). Harus dibuat ulang kalau daftar pemain baru berubah.
- Untuk build kompetisi/klub: 27.1.0 tidak punya kompetisi Indonesia; sumber paling tepat = **mod B7b kita sendiri** (db_archive_2706.fmf + sicomps.fmf B7b yang sudah jalan) → diminta ke Bacad.
- Catatan perbaikan aplikasi: tab Kode masih memakai alamat 27.0 (0x643920 / 0x7cb440) → perlu ikut alamat 27.1.0 (0x647800 / 0x7cf618). Tab Simpan masih menulis nama `db_archive_2706.fmf`.

### 28. File B7b diterima + build database 27.1.0 (23 Nov)
- Diterima (zip pecah MT Manager): `db_archive_2706.fmf` B7b (149.842.446 byte, SHA-256 eb1d7164… = hash B7b yang tercatat) dan `sicomps.fmf` B7b (49.620.118 byte, SHA-256 296242b5e90b9dacd45a468a4559d2213bac82cce898ba43b385d4804ab10322, ukuran sama dengan catatan B7b). Disimpan di `samples/b7b/`.
- Analisa B7b vs 27.1.0:
  - competition.dat B7b: 13 kompetisi Indonesia ada di **ujung** (index 1670–1682) → di 27.0 pun kompetisi ini tambahan mod. Semua tidak ada di 27.1.0.
  - Klub IDN B7b: 77; 52 ada di 27.1.0 (UID sama); 3 klon B7b punya padanan asli di 27.1.0 (Batavia FC 41023300, Persinab Nabire 41001027, Persikad Kota Depok 2000465973); 22 klon harus ditambah.
  - 13 stadion B7a (2000700201–213) tidak ada di 27.1.0; `city.dat` berubah (7.747 → 9.956 kota; header 8 + **u16** jumlah, record 20 byte diawali UID kota). UID kota stadion baru tidak ada di 27.1.0 → kota dipinjam dari stadion saudara (hasilnya sama dengan sumber B7a: Wergu Wetan, 17 Mei, GBK, dst.).
  - Rivalitas IDN: UID sama di 27.1.0; intensitas beda: Persija–Persib 182 → 200, Arema–Persebaya 17 → 190 (nilai B7b).
  - comps.dbc: mod hanya mengubah entri Indonesia. 9 entri IDN identik B7b = 27.1.0; B7b mengubah idn_cup, league_two, nation_idn_comps/rules/reserve_comps dan menambah league_three (+group_a, groups_bc), league_two_groups.
  - Daftar muat B7b IDN-0/1/2 ada di 6 file fmm_*; sebagian UID (orang: 3.758) tidak ada lagi di 27.1.0 → akan disaring.
- `scripts/build_v2710_db.py` (ori 27.1.0 + B7b → db_archive_2707.fmf): +13 kompetisi (index 1669–1681, induk dipetakan), +13 stadion, 55 klub diperbarui (field B7b: status/fasilitas/penonton/divisi/stadion/reputasi), 22 klon + 16 .lng, rivalitas 2, youth IDN 1 → 19, Noah Adnan 120 → 58, pemain dataset (1.633 baru, 190 diperbarui). Hasil 184.586.800 byte; semua entri dibaca ulang dan cocok. Struktur liga = B7b (SL 18, CH 10+10, LN 7+8+8, L4 3); semua klub liga punya stadion valid.

### 29. Build sicomps 27.1.0 + koreksi city.dat (23 Nov)
- **Koreksi format city.dat**: header 8 + u16 jumlah; record 20 byte = **u16 nomor urut**, u32 UID kota, u16 negara, f32, f32, 4 byte. (Catatan poin 28 "record diawali UID" salah; skrip sudah diperbaiki.) Dengan UID yang benar, ke-13 stadion baru langsung dapat kota lewat UID (tidak perlu pinjam).
- `scripts/build_v2710_sicomps.py`: comps.dbc 5 entri IDN diganti versi B7b (idn_cup, league_two, nation_idn_comps/rules/reserve_comps) + 4 ditambah (league_three, league_three_group_a, league_three_groups_bc, league_two_groups); blok `idn_*` di comps.txt = B7b; IDN-0/1/2 di 6 daftar muat (dari B7b, disaring ke UID yang ada + ditambah klub/kompetisi/stadion/kota/orang Indonesia + pemain baru).
  - IDN-0: kompetisi 1.173, klub 2.134 (6 dibuang), cadangan 18, kota 3.237 (326 dibuang), stadion 4.903, orang 12.585 (3.758 orang B7b sudah tidak ada di 27.1.0).
  - Hasil sicomps.fmf 51.836.876 byte; dibaca ulang (entri baru ada, 3 daftar IDN per file).

### 30. Build lengkap 27.1.0 selesai (23 Nov) — "jika sudah analisa, langsung kerjakan"
- **Bug diperbaiki** di `build_people_v2710.py`: templat kontrak pertama kebetulan kontrak manajer → 1.633 pemain baru tercatat jabatan 16 (manajer). Sekarang templat = kontrak pemain di klub IDN, byte 24 dipaksa 1.
- **Temuan format kontrak** (`starting_contracts.dat` byte 24, u16) = jabatan: 1 pemain, 2 pelatih, 12 physio, 14 scout, 16 manajer, 20 asisten manajer (gabungan: 3, 17, 21, 35 = pemain-pelatih dst.). Dicek dari staf Real Madrid (Mourinho 16, Tralhão 20, Calafat 14, García Parrales 12). Pola file per jabatan (data asli): 16 → non_players; 20 & 2 → non_players + coaches; 12 → physios; 14 → scouts. Slot staf 12 × i32 di club.dat selalu −1 (juga di Persib) → peran staf hanya lewat kontrak.
- `scripts/build_staff_v2710.py`: staf dataset → 312 baru, 9 diperbarui, 43 dilewati (Analyst/Doctor/Technical director dll. tidak ada padanan), 1 manajer lama dilepas (klub −1, kontrak dihapus). Record coaches/physios/scouts baru disisipkan sebelum 50 slot kosong. Hasil di klub liga IDN: 61 manajer, 58 asisten, 178 pelatih, 19 physio, 2 scout; tidak ada klub dengan 2 manajer; 3 klub tanpa manajer (dataset tidak punya Head coach).
- Validasi db akhir: 7 file orang round-trip identik; tidak ada rujukan index rusak; kontrak = club_index.
- `scripts/build_v2710_logos.py`: 23 logo `data/logo_klub` → pictures_logos (normal 180×180, small 25×18, config.xml); klon Batavia/Persinab/Persikad → UID klub asli (tidak ada logo resmi di 27.1.0, jadi logo Bacad dipakai).
- `scripts/patch_libgame_v2710.py`: 0x647832 175 → 58, 0x7cf650 29236871 → 41042746 (tepat 5 byte berubah; hash ori dicek).
- sicomps dibangun ulang (staf ikut daftar muat): fmm_people IDN 12.897.
- Peta wajah dibuat ulang terhadap db akhir: 85.004 baris (84.361 UID sama + 635 pemain baru + 8 ganda). 2 berkurang karena nama kembar dengan staf baru (sengaja tidak dipetakan).
- `tests/build_v2710.test.ts`: pembaca TS aplikasi membuka db/sicomps/logo hasil build (13 kompetisi IDN, Grup B 8 klub).
- **Keluaran** (`samples/out_v2710/`, dikirim ke Bacad sebagai zip pecah 24 MB, deflate):
  | File | Ukuran | SHA-256 | Tempat di APK |
  |---|---|---|---|
  | db_archive_2707.fmf | 184.655.484 | 5c60cfbd…cf98 | assets/data/game/ |
  | sicomps.fmf | 51.837.583 | 9f647431…14ce | assets/shared/data/ |
  | pictures_logos.fmf | 29.002.900 | e04a0cb4…2918 | assets/data/game/ (sesudah digabung wajah di aplikasi) |
  | libgame.so | 52.515.648 | 53dde79e…a813 | lib/arm64-v8a/ |
- Belum: uji game. Wajah digabung Bacad di aplikasi (tab Wajah) memakai pictures_logos hasil build + CSV peta baru.

### 31. Tab Wajah: progres + tombol Proses/Unduh terpisah (23 Nov)
- Bacad (screenshot tab Wajah, versi 738962b): modder 86.440 wajah + CSV 85.004 baris siap; tanya apakah lama, minta keterangan proses & persentase; lalu minta tombol Proses dan Unduh dibedakan, Proses tidak bisa diklik kalau sudah diproses.
- Jawaban: pencocokan cepat (detik); yang lama menulis file ±1,4 GB (beberapa menit).
- Perubahan: `mergeFacesIntoFmf` jadi async dengan progres (lapor tiap 2.000 baris, memberi jeda ke UI); `saveSourcedPartsWithProgress` (webFileIO): tulis bertahap 8 MB lewat showSaveFilePicker dengan progres byte, kalau tidak didukung → unduhan Blob biasa (progres di notifikasi Chrome, aplikasi memberi tahu). `setTimeout` ditambahkan ke global universal core.
- UI: tombol **3. Proses** (nonaktif saat berjalan dan sesudah selesai; aktif lagi kalau file modder/CSV diganti) dan **4. Unduh** (aktif hanya sesudah proses), bilah progres + teks langkah 1/2 dan 2/2 dengan persen dan MB.
- Lint/typecheck/104 tes/build lulus. Belum dicoba di HP.

### 32. Pertanyaan Bacad: logo klub/kompetisi luar negeri, nama klub, bendera, nama pemain luar negeri (23 Nov)
- pictures_logos build kita: wajah (lewat tab Wajah) + 23 logo klub IDN + logo bawaan ori (± 900 klub, 64 kompetisi). Logo tambahan modder (klub/kompetisi) BELUM disalin; nama klub dari .lng modder BELUM; bendera ada di `assets/data/game/flags.fmf` (belum disentuh). Diminta: config.xml clubs/comps (normal+small) dari pictures_logos modder, eng.lng (atau bahasa lain yang dipakai) dari db modder, flags.fmf modder & ori.
- **Nama pemain**: people.dat + file nama modder vs ori 27.1.0: semua 163.159 UID ori ada di modder; nama berbeda hanya **226** orang (112 berkebangsaan Indonesia; sisanya kebanyakan pemain asing di liga Indonesia — modder memakai nama lengkap + nama umum, mis. "Zé Valente" → "Jose Pedro Magalhaes Valente"/"Ze Valente"). Modder menambah 1.990 orang (pemain Indonesia). Jadi nama pemain luar negeri di build kita = nama ori, praktis sama dengan modder.

### 33. Nama pemain asing versi modder (23 Nov)
- Bacad: "iya termasuk pemain luar yang bermain di indonesia dan pemain luar yang bermain di luar negeri".
- `scripts/apply_modder_names_v2710.py` (dipanggil build_v2710_db.py dengan argumen ke-4 = folder db modder): orang non-Indonesia dengan nama beda → first/second/common versi modder (nama baru ditambah di ujung file nama). **114 orang** diubah; orang Indonesia tidak.
- Build ulang: db_archive_2707.fmf 184.661.269 byte, SHA-256 797dfb4c…6961. sicomps/pictures_logos/libgame **tidak berubah** (hash sama dengan poin 30).
- Peta wajah dibuat ulang: 85.069 baris (+66 wajah cocok karena nama sekarang sama dengan modder, −1). Dikirim sebagai `peta_wajah_27.1.0_v2.csv`.
- Dikirim: db_archive_2707_27.1.0_mod_v2 (zip pecah, CRC dicek identik), peta v2, SHA256_v2.

### 34. Wajah pemain asing di luar negeri (23 Nov)
- Bacad minta wajah pemain luar yang bermain di luar negeri ikut dimasukkan. Dicek: **sudah termasuk** di peta v2 (85.069): asing di klub luar negeri 72.573, asing tanpa klub 11.652, asing di klub Indonesia 176, orang Indonesia 668. Yang tidak terpetakan: 1.032 orang modder yang tidak ada di build kita (kebanyakan tambahan Indonesia modder) + 339 UID modder tanpa orang.

### 35. Klarifikasi: "logo negara" = logo tim nasional, bukan bendera (23 Nov)
- Tim nasional disimpan sebagai klub di club.dat (mis. klub "Indonesia", nat 58), jadi logonya ada di `pictures_logos/logos/{normal,small}/clubs/config.xml` (`graphics/pictures/club/<UID>/logo|icon`) — ikut tercakup permintaan config clubs. flags.fmf tidak diperlukan.
- Daftar file yang diminta dari APK modder: config.xml clubs & comps (normal + small) dari pictures_logos; club.dat, competition.dat, eng.lng (+ id.lng bila dipakai) dari db_archive_2707.

### 36. File modder: config logo, club.dat, competition.dat, eng/id.lng → nama & logo asli (23 Nov)
- Diterima dari APK modder: config.xml normal/small clubs (953.894 byte) & comps (119.350 byte) dari pictures_logos; club.dat, competition.dat, eng.lng, id.lng dari db_archive_2707. Disimpan `samples/mod_lain/`.
- Logo modder: klub 12.713 (ori 901), kompetisi 1.559 (ori 73), semua `custom/<UID>`; 886 logo klub ori + 64 kompetisi ori dialihkan modder ke versi custom.
- Nama: modder memakai **nama asli** untuk klub/kompetisi tanpa lisensi (Casciavit Milano → AC Milan, Blu-neri Milano → FC Internazionale Milano, A. Madrid → Atlético de Madrid, Italian Serie A → Serie A Enilive). club.dat: 144 klub non-IDN beda; eng.lng 2.553, id.lng 2.552; competition.dat 1.179 kompetisi non-IDN beda.
- Keputusan (sesuai permintaan Bacad): nama & logo versi modder dipakai untuk semua klub/kompetisi **non-Indonesia**; data Indonesia tetap milik kita; 23 logo Bacad dipertahankan.
- `scripts/apply_modder_club_names_v2710.py` (segmen nama club.dat/competition.dat + record .lng eng/id diganti versi modder; dipanggil build_v2710_db.py) → db v3: 184.682.293 byte, SHA-256 64fc047b…49fc.
- `scripts/map_logos_v2710.py` → `peta_aset_27.1.0.csv` (jenis,ukuran,from,to_uid): logo klub 11.906 × 2 (804 UID modder tidak ada di db kita; 3 logo Bacad dipertahankan), kompetisi 1.546 × 2 (13 tidak ada), wajah 85.069; total 111.973 baris.
- Aplikasi: `mergeFacesIntoFmf` diperluas jadi gabung aset (person/club/comp × normal/small); config klub/kompetisi diedit sekali jalan (baris lama UID dibuang, baris custom/<UID> ditambah, BOM dipertahankan); indeks file modder (sebelumnya cari linear per baris → sangat lambat). Tab "Wajah & logo". Tes skala penuh: 111.973 baris digabung < 1 detik di server; hasil dibaca pembaca TS (fmfio.py hanya baca TOC satu frame; TOC rangkaian frame raw = format B6/B7b yang VERIFIED diterima game).
- Dikirim: db v3 (zip pecah, CRC identik), peta_aset_27.1.0.csv, SHA256_v3. sicomps/pictures_logos/libgame tidak berubah.

### 37. Pertanyaan Bacad: award & best 11 weekly untuk kompetisi Indonesia (23 Nov)
- **Belum termasuk** di build. Dicek ulang: `awards.dat` 27.1.0 (199.218 byte, 1.123 record) dan B7b (199.619 byte, 1.123 record) sama-sama tanpa entri Indonesia/BRI. "Best 11 weekly" di FMM = "Team of the Week" (ada untuk liga lain).
- Temuan 22 Nov (liga_kompetisi_award_afc.md §3, panduan 4c): awards.dat tidak menyimpan UID kompetisi → penautan award↔kompetisi belum diketahui; dugaan HYPOTHESIS: tabel di libgame.so (seperti tabel negara playable/liga terdalam) atau tag di comps.dbc. Perlu riset sebelum bisa ditambah.

### 38. Award & best 11 mingguan Indonesia (23 Nov) — "sekalian bongkar dan masukkan update"
- Bacad membatalkan dulu proses di aplikasi web (tab Wajah & logo).
- **Koreksi temuan 22 Nov**: awards.dat MENYIMPAN rujukan kompetisi, sebagai **index competition.dat** di ekor record (offset 4, i16), bukan UID. 1.055 dari 1.123 award menautkan liga; negara (offset 2) selalu = negara kompetisi. Contoh Premier League = index 5. Spesifikasi baru `research/format_specs/awards_dat.md`.
- `scripts/add_awards_v2710.py` (dipanggil build_v2710_db.py): 44 award Indonesia di ujung awards.dat, disalin dari set Asia: BRI Super League ← K League 1 (8, termasuk **Best 11 of the Round**) + CSL Manager of the Month; Championship Grup Barat/Timur ← J2 (6 tiap grup, termasuk **Team of the Week**, Monthly MVP); Liga Nusantara Grup A/B/C ← J3 (6 tiap grup); Piala Indonesia ← Korea Cup (3); Piala Liga ← Japanese League Cup (2). award_id 2.100.600.001–044, negara 58, riwayat dikosongkan.
- db v4: 184.689.968 byte (CRC zip dicek identik). sicomps/pictures_logos/libgame & peta aset tidak berubah.
- HYPOTHESIS: belum diketahui apakah game membatasi award_id lewat kode; award untuk grup (bukan induk) dipilih karena klub & jadwal ada di kompetisi grup.

### 39. Slot ACL: juara Piala Indonesia tidak dapat jatah (23 Nov)
- Bacad: sebelumnya juara Piala Indonesia dapat slot Asian Champions League (Two), seharusnya tidak.
- Analisa: ACL Two (UID 2000347776) bertipe `cup_winners_cup` → mengambil juara **piala utama** negara. Piala Indonesia (`idn_cup`, type main_cup) punya XML `qualification = runner_up_can_qualify`. Tag biner di comps.dbc = **`qurl`** (u8). Pemetaan dari 36 piala utama 27.1.0 (XML ↔ dbc): **0 winner_qualifies_only (27 piala), 1 no_team_qualifies (Piala FA Wanita Inggris), 2 runner_up_can_qualify (8 piala, termasuk idn_cup)**; 41 piala tanpa tag. Piala Liga/Presiden/Super Indonesia tidak punya `qurl`.
- `build_v2710_sicomps.py`: comp_idn_cup_1438 `qurl` 2 → **1** (no_team_qualifies), XSvC 38 → 39, comps.txt `idn_cup(1438),39`. sicomps v2 (ukuran sama 51.837.583 byte, isi berubah).
- HYPOTHESIS: jatah Indonesia di ACL lalu diisi dari posisi liga (mekanisme `get_qualified_teams_for_comp` per koefisien negara) — perlu dilihat di game siapa yang dapat slot setelah musim pertama.

### 40. Slot AFC sesuai koefisien + analisa jadwal lompat (23 Nov)
- Bacad: juara liga → ACL2, runner-up → Challenge League; slot bertambah sesuai poin/koefisien liga; pelajari liga Asia lain; tanya apakah jadwal lompat sudah diperbaiki.
- **Tabel jatah AFC** (`asi.xml`, list teams; per peringkat koefisien negara dalam wilayah; Indonesia = wilayah timur, 22 negara): ACL Elite: tim liga peringkat 1–6/1–3/1–2/1 + juara piala 1–4 & 5, tim liga 7. **ACL Two**: tim liga peringkat 1–5, juara piala 6–7, tim liga 8–10, juara piala 8–10 (unggulan 5), tim liga 11–12. **Challenge League**: juara piala 11–12, tim liga 13–22. Jadi slot naik otomatis bila koefisien Indonesia naik (sama untuk semua negara Asia). GUFC dulu masuk ACL2 lewat "juara piala" (cocok dengan peringkat 6–10).
- Urutan penerima jatah per negara = `cont_cup_qual_rules` (dbc **`CcQR`**). Ada di liga India, Jepang, Australia; BRI Super League tidak punya. India: {type 1 league_stage, stag 0, RkIn 1 league_position, comp liga}. Jepang: aturan terakhir {type 1, stag 0, RkIn 1} tanpa comp.
- `build_v2710_sicomps.py`: comp_idn_league_one ditambah CcQR = [{type 1, HdRl false, stag 0, RkIn 1, ind1 0}] (XSvC 90 → 91, comps.txt idn_league_one(1439),91). Bersama qurl Piala Indonesia = 1: slot "juara piala" diharapkan jatuh ke tim liga berikutnya (runner-up). HYPOTHESIS — perilaku pengalihan slot belum diuji. Di peringkat 11–12: juara → ACL2, runner-up → Challenge League; peringkat 8–10: juara + runner-up → ACL2.
- sicomps v3: 51.837.577 byte.
- **Jadwal lompat setahun**: belum diperbaiki. `_first_year` ternyata khusus kompetisi AFC (field `vlys` = aturan pemilihan format: "First Year", jumlah tim mntm/mxtm, versi fmm) → dugaan lama (Championship kurang _first_year) melemah. Tanggal laga Championship wajar (mulai Sep). Dugaan baru (HYPOTHESIS): format grup Championship hanya berlaku untuk **tepat 10 tim** (vlys mntm=mxtm=10), grup Liga Nusantara tepat 7/8/8; SL degradasi 3, grup Championship degradasi 1 per grup, Liga Nusantara promosi via final → kalau jumlah per grup bergeser (9/11), tidak ada format valid → liga tidak jalan semusim. Butuh bukti dari game sebelum diubah.

### 41. Pertanyaan Bacad: bisakah dapat slot ACLE & tambah slot ACL2/ACGL? ("jangan eksekusi") (23 Nov)
- Hanya analisa, tidak ada perubahan build.
- Dari tabel asi.xml (wilayah timur), jumlah slot per peringkat koefisien: peringkat 1: ACLE 4 tim liga + juara piala, ACL2 1; 2: ACLE 3 liga + piala, ACL2 1; 3: ACLE 2 liga + piala, ACL2 1; 4: ACLE 1 liga + piala, ACL2 1; 5: ACLE 1 liga + piala, ACL2 1; 6: ACLE 1 liga, ACL2 juara piala; 7: ACLE 1 liga, ACL2 juara piala; 8–10: ACL2 liga + juara piala; 11–12: ACL2 liga, ACGL juara piala; 13–22: ACGL 1 liga.
- Koefisien = hasil klub negara itu di kompetisi AFC, 8 musim berbobot (1,0 → 0,3), bukan poin/kualitas liga domestik. Dengan perubahan v2/v3, slot "juara piala" diharapkan jatuh ke tim liga berikutnya (HYPOTHESIS). Nilai koefisien awal Indonesia di game belum diketahui (tempat penyimpanannya belum dibongkar).

### 42. Pertanyaan: bisakah tim cadangan promosi/degradasi? ("jangan dieksekusi, jawab singkat") (23 Nov)
- Build sekarang: tidak. nation_idn_reserve_comps (rsvl) hanya berisi jadwal cadangan otomatis per tingkat (type 1: level 0 SL, 1 Championship, 2 Grup Barat; ntms 18) + rujukan liga U21/U18 (41053475/76, 41058630/31) yang tidak ada di competition.dat. Tidak ada liga cadangan bertabel dengan promosi/degradasi.
- Bisa dibuat (pola negara lain, mis. liga cadangan Inggris, tim B Spanyol di piramida), tapi perlu riset + kompetisi baru. Tidak dieksekusi.

### 43. Rencana berikutnya (catatan Bacad, 23 Nov): liga cadangan
- Untuk tahap berikutnya (belum dikerjakan): kompetisi tim cadangan mengikuti kasta tim utamanya (cadangan klub Super League di liga cadangan tingkat 1, Championship di tingkat 2, dst.), dengan promosi/degradasi mengikuti tim utama.

### 44. Keputusan Bacad: urutan kerja (23 Nov)
- Koreksi poin 43: liga cadangan **sudah** mengikuti kasta tim utama. Build berikutnya: liga cadangan bisa **promosi/degradasi sendiri, tidak mengikuti kasta tim utama** (seperti Inggris).
- Liga U21/U18 dibahas bersama build kompetisi cadangan itu.
- Semua pekerjaan lain dari daftar "belum dikerjakan" **menunggu perintah "eksekusi"**.
- Dibuat `docs/LANGKAH_BUILD_27.1.0.md` (langkah menjalankan build terbaru: db v4, sicomps v3, pictures_logos + gabung wajah & logo, libgame).

### 45. Laporan Bacad: Unduh gagal saat browser di latar belakang (23 Nov)
- Bukan karena internet: semua proses lokal di HP. Penyebab (LIKELY): penulisan lewat showSaveFilePicker berjalan di halaman (JavaScript); Android/Chrome menghentikan/membekukan tab di latar belakang → penulisan putus.
- Saran sementara: biarkan Chrome & layar tetap menyala sampai 100 %, ruang kosong ≥ 3 GB.
- Usulan perbaikan (menunggu "eksekusi"): (a) Wake Lock layar selama menulis + peringatan bila tab disembunyikan; (b) pilihan "Unduh lewat Chrome" (Blob → pengelola unduhan Chrome, lebih tahan di latar belakang).

### 46. "Eksekusi" (23 Nov) — bagian 1: aplikasi
- Bacad: "eksekusi" (semua yang menunggu, kecuali liga cadangan & U21/U18).
- Tab Wajah & logo: tombol **4a Simpan langsung** (persen; layar dijaga menyala lewat Screen Wake Lock, `src/platform/web/wakeLock.ts`; pesan khusus bila Chrome sempat ditinggal) dan **4b Unduh lewat Chrome** (Blob ke pengelola unduhan Chrome, boleh ditinggal).
- Tab Kode: `libgameTables.ts` mengenali build dari ukuran: 27.0 (0x643920 / 0x7cb440) dan **27.1.0 (0x647800 / 0x7cf618..0x7cf688)**; tes `tests/libgame_v2710.test.ts` (ori: Wales ada, Indonesia tidak; hasil tambal: 58 & 41042746 ada).
- Tab Simpan: nama arsip db mengikuti file yang dibuka (`db_archive_2707` / `2706`), juga folder Documents & config.xml (`buildDbDocumentsZip(..., folder)`).
- Lint/typecheck/108 tes/build lulus.

### 47. "Eksekusi" bagian 2: staf, B7c langkah 1, riset koefisien & keuangan (23 Nov)
- Staf: Doctor → physio (12), Analyst & Video analyst → scout (14) (padanan terdekat). Hasil: 350 baru, 9 diperbarui, 5 dilewati (Technical director ×3, Sporting director, Technical advisor). 3 klub Liga 4 klon (Persid Jember, PS Mojokerto Putra, Persikoba Batu) tanpa manajer: dataset tidak punya staf mereka → tidak dikarang.
- **B7c langkah 1**: 22 klub Liga Nusantara → profesional (1); Liga 4 tetap semi-pro (2). SL & Championship sudah pro sejak B7b.
- **Koefisien AFC awal** ditemukan di `nation.dat`: sesudah blok peringkat (08 00 + 8 × u16) ada byte 09 + **9 × f32** koefisien per musim (LIKELY). Indonesia [4,1; 5,05; 0; 0; 3,96; 3,56; 7,2; 11,03; 0], Jepang [13,85 … 30,38]. Dengan bobot asi.xml (1,0 … 0,3) Indonesia **peringkat 10 dari 22 negara timur** (skor ±19–22; di atas: Jepang, Korea, Thailand, China, Vietnam, Australia, Malaysia, Singapura; di bawah: Hong Kong ±18,7–20,8). Peringkat 8–10 = ACL2 untuk 1 tim liga + 1 "juara piala" → cocok dengan GUFC dulu. Dengan build sekarang: juara & runner-up → ACL2 (HYPOTHESIS pengalihan slot). Untuk "runner-up → Challenge League" Indonesia harus di peringkat 11–12 (koefisien awal diturunkan) — TIDAK dikerjakan, menunggu keputusan.
- **Keuangan / reputasi (B7c langkah 2–3)**: angka acuan 27.1.0: Man City 9.150 (Worldwide), Man United 8.150 (Continental), Everton 6.900 (Top Division), Kashima 6.400, Buriram 5.500, JDT 5.000; klub IDN 700–4.600; hanya 2/64 klub IDN punya blok keuangan. Batas angka antar pita belum terbukti → tidak dikerjakan; butuh bukti dari game.
- db v5 (184.697.096 byte), sicomps v4 (fmm_people IDN 12.935). Peta aset tidak berubah. Tes 108 lulus.

### 48. Keputusan koefisien + screenshot reputasi/anggaran → db v6 (23 Nov)
- Keputusan Bacad: **koefisien diturunkan** (juara → ACL Two, runner-up → Challenge League sejak musim 1).
- Screenshot Bacad (editor game 27.1.0, Club Details; reputasi mentah dari db kita):
  | Klub | Reputasi db | Pita | Transfer | Gaji/minggu |
  |---|---|---|---|---|
  | Kashima Antlers | 6400 | Top Division | £662K | £314K |
  | Buriram United | 5500 | National | £106K | £67,5K |
  | Johor Darul Ta'zim | 5000 | National | £96K | £123K |
  | Persib Bandung | 4300 (ori) / 4600 (B7b) | Regional | £282K | £26,5K |
  | Java United FC (SL) | 2900 | Local | £190K | £22K |
  | Persibo Bojonegoro (LN Grup A) | 2800 | Local | £0 | £6,75K |
  Ditambah acuan lama: Everton 6900 Top Division, Man Utd 8150 Continental, Man City 9150 Worldwide.
- Rentang pita TERBUKTI: Local 2800–2900, Regional 4300–4600, National 5000–5500, Top Division 6400–6900, Continental 8150, Worldwide 9150. Batas tepat antarpita UNKNOWN (mis. batas Regional ada di 2901–4300).
- Anggaran tidak hanya dari reputasi (Persib £282K > JDT £96K; Java United £190K vs Persibo £0 di pita sama) → LIKELY ikut liga/negara/penonton. Persibo: transfer £0 tapi gaji £6,75K (bukan 0) → Local cukup untuk menghindari freeze (HYPOTHESIS; freeze 10.1d terjadi saat gaji $0).
- **B7c langkah 2** (`apply_reputation_bands` di `build_v2710_db.py`): SL 6 kuat (Persib, Persija, Persebaya, Borneo, Bali + Dewa United) Continental 8150; 6 menengah Top Division 6900→6400; 6 lemah National 5500→5000. Championship 7/7/6 = Top Division/National/Regional. Liga Nusantara 22 klub Regional (4600→4300; urutan kuat/lemah tidak ada di data, semua 1200 → diperlakukan menengah); Gresik United Top Division 6900 (pengecualian nama besar). Liga 4: Local 2800–2900. Pembagian kuat/menengah/lemah = sepertiga urutan reputasi B7b.
- **B7c langkah 3 (blok keuangan) tidak dikerjakan**: klub Asia (Kashima/Buriram/JDT/Persib) blok keuangannya kosong tapi game tetap memberi anggaran → cukup reputasi. Perlu cek Adjust Budgets di klub Liga 4.
- **Koefisien**: `scale_idn_coefficient` mengalikan 9 nilai Indonesia × 0,84 → [3,44; 4,24; 0; 0; 3,33; 2,99; 6,05; 9,27; 0]. Skor berbobot (0,3→1,0) di kedua arah urutan musim: Indonesia **peringkat 11 dari 22** (bawah Hong Kong 22,7 / Korea Utara 17,4; atas Filipina 15,1–15,7). Peringkat 11 = ACL Two 1 tim liga + Challenge League "juara piala" (dialihkan ke runner-up, HYPOTHESIS). Rumus bobot game yang pasti UNKNOWN; margin tipis (±0,5).
- db **v6**: 184.697.096 byte, SHA-256 ba073a99…6d65, kiriman `db_archive_2707_27.1.0_mod_v6` (.z01, .z02, .zip; dicek ulang dengan join_split_zip.py). sicomps v4, pictures_logos, libgame tetap. Tes 108 lulus.

### 49. Keputusan Bacad: anggaran klub Indonesia (23 Nov)
- Bacad: anggaran tim kecil diisi **minimal sesuai yang Bacad sebut**; **jangan pakai data mod sebagai acuan** (angka anggaran di screenshot poin 48 berasal dari game modder dan salah). Realitas: di Indonesia banyak klub kaya; gaji pemain paling mahal di ASEAN, bahkan Asia Timur.
- Tafsiran Claude untuk "minimal": angka uji Persikad 22 Nov (panduan induk 10.1d), Transfer $675rb + Gaji $3,4rb/minggu = batas bawah yang terbukti tidak freeze. Perlu konfirmasi Bacad. Target klub besar: di atas JDT dan Kashima (angka pasti dari Bacad).
- Kendala: anggaran tidak bisa ditulis langsung. Klub Asia (Kashima/Buriram/JDT/Persib) blok keuangannya kosong; game menghitung anggaran sendiri. Arti field blok 68 byte UNKNOWN (A/E Man City/Man Utd/Everton tidak sebanding dengan anggaran di game). Hanya 2 dari 77 klub IDN punya blok (Persib, Borneo).
- **Uji keuangan (satu variabel, sekali instal)**: `UJI_KEUANGAN=1 build_v2710_db.py` (`finance_block_experiment`) = db v6 + Persib hanya A = 50 (D = 50000), Borneo hanya E = 100000. Pembanding (reputasi 8150 & liga sama, tanpa blok): Persija, Persebaya, Bali, Dewa. SHA-256 d6ba82e6…285e. Hanya untuk membaca Transfer/Wage Budget di Club Details karier baru.
- Kalau blok terbukti berpengaruh → semua klub IDN diberi blok (klub tanpa blok perlu record diperbesar 68 byte + flag; belum pernah diuji). Kalau tidak → anggaran lewat reputasi/faktor lain (riset lanjut).

### 50. Konfirmasi Bacad: angka anggaran (23 Nov)
- Minimal tim kecil **dikonfirmasi**: Transfer $675.000, Gaji $3.400/minggu (uji Persikad 22 Nov).
- Target BRI Super League dari file Bacad `data/estimasi_anggaran_super_league_2026_27.md` (estimasi kasar dari nilai pasar Transfermarkt + payroll Persib ± Rp10 M/bulan; bukan data resmi): gaji/minggu Rp424 jt (Persijap) – Rp2.144 jt (Persija); transfer Rp3–31 M/musim.
- `scripts/budget_targets_v2710.py` → `data/target_anggaran_idn.csv`: Rupiah → USD/GBP dengan kurs **ASUMSI** Rp16.500/USD, Rp22.000/GBP. Contoh: Persija transfer $1,39 jt, gaji $130rb/minggu (£97rb); Persijap transfer $675rb (dinaikkan ke minimal), gaji $25,7rb. Kasta lain = minimal Bacad.
- Catatan: dengan kurs ini gaji Persija (£97rb) masih di bawah JDT di game modder (£123rb) — angka game modder tidak dipakai (keputusan poin 49).
- Belum bisa ditulis ke db: menunggu hasil uji keuangan (poin 49) untuk tahu field mana yang mengatur anggaran.

### 51. Keputusan Bacad: semua di satu build, tanpa instal uji berulang (23 Nov)
- Bacad: semua masuk build terbaru; tidak mau trial install berulang; bug/laporan/screenshot dikumpulkan sekali.
- db **v7** = v6 + uji keuangan dengan nilai **wajar** di build utama (db uji terpisah poin 49 dibatalkan): Persib A = 1,3 (D = 1300) — dugaan dana transfer $1,3 jt; Borneo E = 3375 — dugaan gaji setahun (ribu) $64,9rb × 52. Pembanding Persija/Persebaya/Bali/Dewa. SHA-256 4f9b0d1f…a11d, 184.697.096 byte.
- Anggaran semua klub belum bisa diisi tepat (arti field UNKNOWN, 75 dari 77 klub IDN tidak punya blok; menambah blok = record membesar, belum pernah diuji → tidak diambil risikonya). Cadangan: atur anggaran klub sendiri lewat Club Details di game.
- `docs/CEKLIST_UJI_27.1.0.md`: satu daftar cek untuk satu kali main (A awal, B isi db, C reputasi & anggaran, D musim 1, E akhir musim 1/musim 2, F bug).

### 52. Kiriman file satu bagian (23 Nov)
- Bacad: kalau bisa, kirim file tanpa dipecah. Uji: `db_archive_2707_27.1.0_mod_v7.zip` satu file 54.328.812 byte berhasil dikirim (isi SHA-256 4f9b0d1f…a11d, sama dengan versi 3 bagian). Mulai sekarang kiriman dibuat satu file.
- Langkah pasang step by step ditulis ulang di `docs/LANGKAH_BUILD_27.1.0.md`.

### 53. Kirim ulang file lain dalam satu zip (23 Nov)
- `file_lain_27.1.0_mod.zip` (64.974.581 byte, dites utuh): sicomps.fmf v4 (1a05f9d8…), pictures_logos.fmf build (e04a0cb4…, belum digabung wajah), libgame.so (53dde79e…), peta_aset_27.1.0.csv, SHA256_v9.txt, LANGKAH_BUILD_27.1.0.md, CEKLIST_UJI_27.1.0.md. Bersama `db_archive_2707_27.1.0_mod_v7.zip` = semua bahan build.

### Menunggu dari Bacad
- Hasil uji db v7 sesuai `docs/CEKLIST_UJI_27.1.0.md` (termasuk anggaran Persib/Borneo vs pembanding); (angka minimal & target SL sudah diterima, poin 50).
- ~~Keputusan koefisien~~ dan ~~screenshot reputasi~~: diterima (poin 48).
- Uji db v6: pita reputasi klub IDN di editor (Persib Continental, PSM Top Division, Persibo Regional, Gresik Top Division), anggaran tiap kasta, Adjust Budgets tidak freeze (termasuk Liga 4); akhir musim 1: juara → ACL Two, runner-up → Challenge League?
- Untuk jadwal lompat: screenshot klasemen/daftar tim grup Championship & Liga Nusantara di musim ke-2 (sesudah promosi/degradasi pertama), atau info berapa tim di tiap grup saat liga tidak mulai.
- Hasil uji APK 27.1.0 mod (layar awal: Indonesia & Liga Nusantara muncul? klub/pemain/staf/logo/wajah).
- `db_archive_2706.fmf` **B7b** dan `sicomps.fmf` **B7b** (folder "B7b" di HP), zip pecah MT Manager — sumber kompetisi Indonesia, klub klon, stadion baru, rivalitas, aturan Liga Nusantara, daftar muat IDN.
- ~~File ori 27.1.0~~: semua sudah diterima (poin 20–21).
- Cek unduhan per entri setelah aplikasi diperbarui: nama file harus tanpa `.txt`.
- ~~Screenshot atribut~~ (diterima 23 Nov, dari game modder). Berikutnya: eksperimen terkendali di game ori 27.1.0 (lihat `research/kalibrasi/kalibrasi_atribut.md`) + screenshot daftar entri db_archive 27.1.0.
- Nama file db_archive 27.1.0 + lokasi di `assets/`; screenshot info arsip (ukuran, SHA-256, flag, jumlah entri) untuk ketiga arsip 27.1.0.
