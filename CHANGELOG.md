# Changelog

## 2026-11-23 — db v7 + daftar cek uji sekali instal
- Uji blok keuangan (Persib A, Borneo E, nilai wajar) masuk build utama. `docs/CEKLIST_UJI_27.1.0.md`.

## 2026-11-23 — Target anggaran klub Indonesia
- `scripts/budget_targets_v2710.py` + `data/target_anggaran_idn.csv` dari estimasi Bacad (SL) dan minimal Bacad (kasta lain).

## 2026-11-23 — Uji keuangan (opsional)
- `UJI_KEUANGAN=1` di build_v2710_db.py: isi blok keuangan Persib (A) dan Borneo (E) untuk memetakan field ke anggaran di game.

## 2026-11-23 — B7c langkah 2 (reputasi per pita) + koefisien AFC Indonesia peringkat 11 (db v6)
- Reputasi klub IDN mengikuti pita yang terbukti dari screenshot (Continental/Top Division/National/Regional/Local) per kasta dan kekuatan; Gresik Top Division. Koefisien AFC awal Indonesia × 0,84 → peringkat 11 timur.

## 2026-11-23 — Eksekusi: staf tambahan, Liga Nusantara profesional, riset koefisien
- Doctor → physio, Analyst → scout (350 staf baru). Klub Liga Nusantara → profesional (B7c langkah 1). Koefisien AFC awal ditemukan di nation.dat (Indonesia peringkat 10 timur). db v5, sicomps v4.

## 2026-11-23 — Aplikasi: unduh tahan latar belakang, tab Kode 27.1.0, nama db
- Tab Wajah & logo: 4a simpan langsung (wake lock) / 4b unduh lewat Chrome. Tab Kode mengenali libgame 27.1.0. Tab Simpan memakai nama arsip db yang dibuka.

## 2026-11-23 — Urutan jatah AFC dari posisi liga
- BRI Super League diberi `CcQR` (posisi liga) seperti liga India/Jepang; tabel jatah AFC per koefisien dicatat (log 40). sicomps v3.
- Analisa jadwal lompat: `_first_year` khusus AFC; dugaan baru = jumlah tim grup harus tepat (vlys).

## 2026-11-23 — Piala Indonesia tanpa jatah kontinental
- comps.dbc tag `qurl` dipetakan (0/1/2); comp_idn_cup → 1 (no_team_qualifies). sicomps v2.

## 2026-11-23 — Award Indonesia
- awards.dat: rujukan kompetisi = index di ekor record (koreksi 22 Nov); `add_awards_v2710.py` menambah 44 award (Best 11 of the Round, Team of the Week, Player/Manager of the Month, dst.); spesifikasi `awards_dat.md`.

## 2026-11-23 — Nama & logo klub/kompetisi versi modder
- `apply_modder_club_names_v2710.py` (nama klub/kompetisi non-IDN versi modder), `map_logos_v2710.py` (peta aset gabungan), gabung aset di aplikasi (wajah + logo klub/timnas + logo kompetisi) dengan indeks file modder.

## 2026-11-23 — Nama pemain asing versi modder
- `scripts/apply_modder_names_v2710.py`: 114 orang non-Indonesia memakai nama versi modder; build db v2 + peta wajah v2.

## 2026-11-23 — Tab Wajah: progres & tombol terpisah
- Proses (pencocokan, persen) dan Unduh (tulis bertahap dengan persen/MB lewat showSaveFilePicker; cadangan unduhan biasa) dipisah; Proses terkunci saat/sesudah berjalan.

## 2026-11-23 — Build 27.1.0 lengkap
- `build_staff_v2710.py` (staf dataset; jabatan lewat byte 24 kontrak), `build_v2710_logos.py` (23 logo klub), `patch_libgame_v2710.py` (Indonesia playable + Liga Nusantara).
- Perbaikan: pemain baru sempat tercatat sebagai manajer (templat kontrak salah).
- `tests/build_v2710.test.ts`: hasil build dibuka pembaca aplikasi.

## 2026-11-23 — scripts/build_v2710_sicomps.py + koreksi city.dat
- Aturan Indonesia B7b ke comps.dbc 27.1.0, comps.txt, IDN-0/1/2 di 6 daftar muat (+ pemain baru).
- city.dat: record diawali u16 nomor urut, UID di offset +2.

## 2026-11-23 — scripts/build_v2710_db.py
- Database 27.1.0 = ori + mod Indonesia B7b (dipindah lewat UID) + pemain dataset. Kompetisi, stadion (kota lewat UID/pinjam), klub, klon + .lng, rivalitas, youth, Noah Adnan.

## 2026-11-23 — Gabung wajah (tab Wajah)
- `src/core/faces/mergeFaces.ts` + `saveSourcedParts`: salin wajah dari pictures_logos modder ke pictures_logos kita (tambal di ujung, dua sumber, tanpa memuat file utuh), config.xml baru di `logos/normal/people`.
- Tab Wajah di aplikasi. Tes `tests/faces.test.ts` (sintetis + golden fmfio.py + pictures_logos 27.1.0 ori asli).

## 2026-11-23 — scripts/map_faces_v2710.py
- Peta wajah pictures_logos modder → UID build kita (nama + tgl lahir; cadangan nama + negara). Uji: 84.361 UID sama, 637 ke pemain baru, 1.095 tidak ada.

## 2026-11-23 — libgame.so, sicomps.fmf, pictures_logos.fmf 27.1.0 ori
- `scripts/join_split_zip.py`: gabung zip terbagi MT Manager (stored/deflate, cek CRC).
- libgame 27.1.0: tabel negara playable 0x647800 (Wales di 0x647832), liga terdalam 0x7cf618 (Wales di 0x7cf650) → `libgame_tables.md`.
- sicomps 27.1.0: aturan Indonesia masih ada di comps.dbc; daftar muat IDN-0/1/2 tidak ada.

## 2026-11-23 — db_archive_2707.fmf (27.1.0 ori) diterima
- 184.134.385 byte, flag 0, 76 entri; semua kiriman sebelumnya identik dengan isinya; scouts/physios modder identik dengan ori.
- competition/stadium/rivalries/.lng 27.1.0 terbaca habis dengan skrip lama.
- Temuan: 27.1.0 ori tidak punya kompetisi Indonesia sama sekali (semua klub IDN divisi −1) → harus ditambah ulang saat build.

## 2026-11-23 — club/players/people terkonfirmasi ori
- Salinan kedua dari APK ori identik dengan `samples/v2710/` (log poin 19).

## 2026-11-23 — Lokasi file APK 27.1.0
- `input_manifest.md`: path & ukuran libgame.so, db_archive_2707.fmf, sicomps.fmf, pictures_logos.fmf (26,73 MB) di APK 27.1.0; catatan APK dari situs pihak ketiga.

## 2026-11-23 — coaches.dat terkonfirmasi ori
- Salinan langsung dari APK ori identik dengan `samples/v2710/coaches.dat` (SHA-256 sama).

## 2026-11-23 — Info: APK modder beda dari ori hanya di data Indonesia
- Dicatat di log poin 16 dan `research/kalibrasi/kalibrasi_atribut.md` (pengaruh ke kalibrasi & file staf).

## 2026-11-23 — Koreksi asal file
- `scouts.dat` dan `physios.dat` ternyata dari APK modder lain, bukan 27.1.0 ori. Dipindah ke `samples/mod_lain/`; label struktur/rujukan turun ke LIKELY (`people_players.md`, `input_manifest.md`, log poin 15).

## 2026-11-23 — scripts/build_people_v2710.py (pemain dataset → db 27.1.0)
- Perbarui pemain yang sudah ada (klub, kontrak, nomor punggung) dan tambah pemain baru di ujung people/players/starting_contracts + file nama. Atribut = perkiraan (disalin dari pemain nyata, posisi sama, CA terdekat).
- UID orang baru mulai 2.100.000.001 (rentang kosong di 27.1.0).
- Uji dengan file 27.1.0: 1.633 baru + 190 diperbarui; semua file hasil terbaca ulang (`people.py`, `names.py`).

## 2026-11-23 — scouts.dat + physios.dat
- Keduanya 7 byte per record seperti coaches.dat; idx3/idx4 people.dat → scouts/physios (VERIFIED). `staff_role_fields` di `scripts/people.py`; round-trip identik.
- Keputusan Bacad: semua mod 27.1.0 di dalam APK; atribut pemain baru pakai perkiraan.

## 2026-11-23 — Kalibrasi atribut dari screenshot + coaches.dat
- `research/kalibrasi/`: angka layar 8 pemain (`atribut_screenshot_2027-08-15.csv`) + analisis (`kalibrasi_atribut.md`). Atribut 1–20 = layar (VERIFIED); atribut bertanda ≈ dasar + nilai/10 (LIKELY); Shooting/Teamwork/Aerial = gabungan.
- Kepribadian: byte ke-3 = Determination (VERIFIED, Mourinho & Bento).
- `scripts/people.py`: `PERSONALITY`, `non_player_fields` (7 atribut manajer), `coach_fields`; coaches.dat (16.916 × 7 byte) ikut uji round-trip.
- `people_players.md`: non_players.dat, coaches.dat, idx2/3/4 = pelatih/scout/physio.

## 2026-11-23 — Nama atribut pemain dari editor FMM26 (nyongrand/fmm-editor)
- Urutan 34 atribut, 15 posisi, kepribadian, Ethnicity, caps U21 diambil dari `nyongrand/fmm-editor` (MIT) sebagai LIKELY; panjang record 82 byte sama persis.
- Temuan: 16 atribut disimpan bertanda −100..100 (bukan 1–20); rumus ke angka di layar belum diketahui.
- `scripts/people.py`: `player_fields` mengeluarkan atribut bernama; `people_players.md` diperbarui.

## 2026-11-23 — Pencocokan dataset pemain/staf dengan people.dat 27.1.0
- `scripts/match_dataset_people.py`: cocokkan `data/pemain_indonesia_v2.csv` dan `data/staf_indonesia_v2.csv` dengan people.dat (nama persis + tgl lahir). Hasil: pemain 213/1.823 ketemu (13 dengan tgl lahir sama), staf 18/364.
- `people_players.md`: `first` = 0xFFFFFFFF = tanpa nama depan.
- Panduan induk 10.14: rencana Player/Staff Editor.

## 2026-11-23 — Perbaikan: unduhan per entri berakhiran .txt
- Laporan Bacad: entri yang diunduh dari penjelajah arsip tersimpan sebagai `people.dat.txt` dst. Dugaan penyebab: Blob tanpa tipe MIME → Chrome Android menganggapnya teks.
- `webFileIO.ts`: `mimeForFileName` (biner → `application/octet-stream`, zip/txt/xml/png sesuai jenis) dipakai semua unduhan; `ArchiveInfo` sekarang mengunduh lewat `webFileIO.saveFile`. Tes `tests/mimeForFileName.test.ts`.
- Perlu dicek di HP Bacad setelah aplikasi diperbarui (versi build di footer).

## 2026-11-23 — Log sesi
- `research/log_sesi.md`: catatan kronologis chat (youth intake, keputusan 27.1.0 ori, cara kirim file ≤ 30 MB, unduhan per entri berakhiran `.txt`, hasil bongkar people.dat dkk., daftar yang ditunggu dari Bacad).
- `CLAUDE.md` aturan 7a: setiap info/keputusan/hasil uji dari chat wajib langsung dicatat dan di-commit.

## 2026-11-23 — B3: people.dat, players.dat, non_players.dat, starting_contracts.dat dibongkar (27.1.0 ori)
- `scripts/people.py`: baca + tulis ulang keempat file; round-trip identik byte demi byte (163.159 orang; 136.910 × 82, 19.078 × 39, 141.633 × 54 byte).
- Terbukti: `people.club_index` = index `club.dat` (semua 141.633 kontrak cocok), `player_index`/`non_player_index` → urutan `players.dat`/`non_players.dat`.
- LIKELY: CA/PA, reputasi, tinggi/berat, kaki, nomor punggung, posisi, gaji. UNKNOWN: urutan atribut, idx2–4, sebagian field timnas.
- `club.dat` 27.1.0: 53.182 klub (27.0: 38.747), terbaca habis oleh `club.py`.
- Spesifikasi baru `research/format_specs/people_players.md`; hash entri 27.1.0 di `input_manifest.md`.

## 2026-11-22 — Hasil uji youth intake
- Laporan Bacad: db B7b (youth rating IDN 19) → youth intake musim pertama tetap 1 (klub Gresik, semi-pro). Aplikasi modder lain dengan status klub profesional → 5 pemain.
- Uji lanjutan: Persib (pro) juga hanya 1 pemain → status pro tidak terbukti, jadi UNKNOWN. Youth intake ditunda; prioritas APK 27.1.0 (panduan induk 10.13).
- Youth rating `nation.dat` turun jadi HYPOTHESIS melemah; status klub → youth intake jadi LIKELY. Rencana uji satu variabel (status Gresik 2 → 1 lewat Club Editor, jalur B) dicatat di panduan induk 10.2-uji.
## 2026-11-22 — Sesi 05: semua modul (permintaan Bacad: "buatkan dulu semua aplikasinya")
- **File kerja**: 4 slot — db_archive, sicomps, pictures_logos, libgame.so (hanya dibaca). Tab muncul sesuai file yang dibuka. Urung/ulang gabungan lintas file (`src/core/workspace/history.ts`, `workspace.ts`).
- **Klub**: edit status/reputasi/fasilitas/penonton/nama (nama ikut diganti di 16 .lng)/**stadion kandang**; ubah massal per kompetisi; **klon jadi klub baru** (ujung club.dat, skuad & staf kosong, +16 .lng, +fmm_clubs IDN-0/1/2).
- **Stadion** (baru): cari, edit nama/alias/kapasitas/kapasitas maks/kota (pinjam dari stadion lain); **stadion baru** di ujung stadium.dat (pola B7a, UID 2000700202 dst.), opsional didaftarkan di fmm_stadiums dan langsung dijadikan kandang klub.
- **Kompetisi**: nama panjang/pendek/singkatan, reputasi; peringatan nama > 21 huruf.
- **Rivalitas**: ubah intensitas, tambah rivalitas baru.
- **Negara**: youth rating (eksperimen, HYPOTHESIS).
- **Daftar muat** (sicomps 2700/fmm_*.dat): lihat/cari/tambah/hapus UID per IDN-0/1/2 (nama klub/stadion/kompetisi ditampilkan).
- **Aturan** (comps.dbc): cari entri, pohon tag, ubah nilai skalar (angka/bool/teks); versi comps.txt naik otomatis.
- **Logo**: pilih klub/kompetisi, unggah gambar → PNG 180×180 & 25×18, tambal pictures_logos + config.xml.
- **Kode**: baca tabel negara playable & liga terdalam di libgame.so, cek Indonesia (58) & Liga Nusantara (41042746).
- **Simpan**: paket Documents (semua file db yang berubah + config.xml), db_archive_2706.fmf, sicomps.fmf, pictures_logos.fmf, laporan.
- Adapter baru + tes golden: stadium.dat (stadium.py), rivalries.dat (riv.py), .lng, daftar UID, entri comps.dbc (dbc.py), config logo, tabel libgame, youth rating. Fixture sintetis: `scripts/golden/make_more_fixtures.py`, `make_workspace_fixtures.py`.
- Uji: 105 tes (96 lulus + 9 butuh file asli); arsip hasil Workspace dibaca ulang oleh fmfio.py/dbc.py/club.py/stadium.py; uji ujung-ke-ujung Chrome headless semua tab → unduhan diverifikasi Python.

## 2026-11-22 — Perbaikan pembaruan PWA
- Laporan Bacad: aplikasi di HP belum menampilkan fitur edit (Sesi 04). Dugaan: service worker mode `prompt` menahan versi lama karena tidak ada tombol pembaruan. Sekarang `autoUpdate` + `skipWaiting` + `clientsClaim` + hapus cache lama, sehingga versi baru langsung aktif.
- Footer menampilkan versi build (commit + waktu) supaya mudah dicek di HP.

## 2026-11-22 — Sesi 04: Club Editor + simpan
- `src/core/edit/clubEditSession.ts`: sesi edit club.dat — `set`, `setMany` (satu langkah undo), `batch` (mode samakan / lantai / atap), undo/redo, daftar perubahan bersih (nilai asli vs sekarang), `build`.
- `src/core/edit/competitionTree.ts`: klub di kompetisi beserta turunannya (mis. Liga Nusantara + Grup A/B/C).
- `src/core/export/clubExport.ts`: laporan perubahan (teks), `config.xml` Documents (sama persis dengan resep terbukti 16 Nov), zip Documents (`db_archive_2706/club.dat`, `config.xml`, `LAPORAN_PERUBAHAN.txt`), `db_archive_2706.fmf` baru lewat tambal di ujung.
- `src/core/zip/zip.ts`: zip stored dengan CRC-32, nama UTF-8, tanggal tetap.
- `src/platform/web/webFileIO.ts` `saveOutputParts`: unduh arsip besar dari potongan file sumber tanpa memuatnya ke memori.
- UI: bilah atas (jumlah perubahan, Urung, Ulang, Simpan); kartu klub bisa diedit (status, reputasi, fasilitas, penonton) dengan nilai lama dicoret; panel "Ubah massal" per kompetisi dengan konfirmasi dua ketuk; panel Simpan (paket Documents, db_archive_2706.fmf, laporan) beserta petunjuk dan peringatan Store.
- Tes: `tests/edit.test.ts` (sesi edit, pohon kompetisi, config.xml, CRC-32, zip dibaca `zipfile` Python, arsip baru). Uji ujung-ke-ujung di Chrome headless: ubah massal + edit Gresik → unduh → `club.py` membaca club.dat hasil, `fmfio.py` membaca arsip hasil.

## 2026-11-22 — db_archive di HP terkonfirmasi B7b
- Kartu Gresik United FC di aplikasi cocok dengan build B7b (reputasi 1.500, semi-pro, fasilitas 5/4, stadion 7212). `versions.ts` dan `input_manifest.md`: label "diduga" dihapus. Nama klub di db asli "Gresik United FC" (tes sampel disesuaikan).

## 2026-11-22 — Uji penjelajah database dengan db asli
- HP Bacad: 1.683 kompetisi · 38.772 klub · 251 negara terbaca dalam 1.098 ms, tanpa galat. Dicatat di `status_verifikasi.md`.

## 2026-11-22 — Sesi 03 (Fase 3, sebagian): adapter competition.dat + club.dat
- `src/core/formats/competition/competitionDat.ts`: parse/serialize (round-trip identik), ubah field tetap-ukuran (jenis, benua, negara, reputasi, tingkat, induk), ganti nama, validator (index urut, UID ganda, induk, nama > 21 huruf).
- `src/core/formats/club/clubDat.ts`: parse/serialize (round-trip identik), `withClubField` untuk negara, status, fasilitas, penonton, divisi, stadion, reputasi; `withClubNames`; validator (UID ganda, status, fasilitas, reputasi, divisi/stadion tidak ada, klub liga tanpa stadion). Setiap record menyimpan byte aslinya; bagian tak dikenal (kit, blok keuangan, daftar 21 byte, blok akhir) tidak disentuh.
- `src/core/formats/nation/nationNames.ts`: nama negara (LIKELY, hanya tampilan). `src/core/db/loadDatabase.ts`: muat kompetisi + klub + negara dari arsip.
- `src/core/binary/cursor.ts`: pembaca/penulis berurutan dengan pesan galat berposisi. `src/core/formats/types.ts`: `FormatAdapter`, `Issue`.
- Golden test: `scripts/golden/make_db_fixtures.py` membuat competition.dat/club.dat sintetis dan membacanya dengan `comp.py`/`club.py`; `tests/db.test.ts` mencocokkan semua field + round-trip + edit di tempat (maks 2 byte berubah). `scripts/golden/dump_db.py` + `tests/samples.test.ts` untuk db asli di `samples/`.
- UI: penjelajah database baca-saja untuk `db_archive*.fmf` — pilih negara (bawaan Indonesia), daftar kompetisi (jenis, tingkat, reputasi, induk, jumlah klub), kartu klub (reputasi, status, fasilitas, penonton, stadion, skuad/staf, blok keuangan), pencarian klub nama/UID.
- ESLint: variabel berawalan `_` boleh tidak dipakai.

## 2026-11-22 — Uji ulang sicomps.fmf (setelah perbaikan bigint)
- `sicomps.fmf` B7b terbuka di HP: flag 0, 1.489 entri; `comps.dbc` = arsip bersarang flag 3, 1.344 entri. Pertanyaan flag terjawab; dicatat di `input_manifest.md`, `status_verifikasi.md`, `fmf_container.md`, `comps_dbc.md`.

## 2026-11-22 — Perbaikan: waktu TOC > 2^53 (sicomps.fmf)
- Uji di HP: `sicomps.fmf` asli gagal dibuka ("u64 terlalu besar untuk number di offset 67"). Penyebab: kolom waktu di TOC sicomps bernilai > 2^53 (diduga FILETIME Windows), padahal pembaca menyimpannya sebagai `number`.
- `FmfEntry.time1/time2` sekarang `bigint` (dibaca/ditulis apa adanya). `patchFmf` tidak lagi menimpa waktu dengan detik Unix: entri yang diganti mempertahankan waktunya, entri baru meniru waktu entri lain di folder yang sama.
- Fixture sintetis ditambah entri berwaktu gaya FILETIME; tes baru memastikan nilai terbaca persis dan bertahan setelah ditambal.
- `pictures_logos.fmf` B7b terbaca di HP (flag 0, 142.934 entri); ukuran sicomps B7b (49.620.118) masuk daftar versi.

## 2026-11-22 — Uji file asli pertama
- Aplikasi terbit di `https://fmm27-pge-web.bcdsu1.workers.dev` (Cloudflare Worker static assets).
- `db_archive_2706.fmf` asli dibuka di HP: 149.842.446 byte, flag 0, 76 entri, SHA-256 `eb1d7164…bcf5cc`. Dicatat di `input_manifest.md` dan `src/core/versions.ts` (versi diduga B7b).

## 2026-11-22 — Analisa liga/kompetisi, koneksi data, award, dan jatah AFC
- Dokumen riset baru `research/format_specs/liga_kompetisi_award_afc.md`: status semua kompetisi Indonesia (aktif/dorman, termasuk liga U21/U18 yang dirancang developer tapi tidak pernah dibangun ke database), peta koneksi data antar file, temuan `awards.dat` (file baru yang belum pernah dibongkar, nihil entri untuk kompetisi Indonesia), dan analisis akar masalah jatah AFC (Indonesia tidak terdaftar di `nation_list` benua Asia untuk sistem koefisien 8 tahun / seeding 6-4-2).
- `research/format_specs/fmm27_panduan_induk.md` disinkronkan dengan panduan induk terbaru (section 10 item 4/4b/4c + section 12).
- Analisa murni, tidak ada perubahan ke file game.

## 2026-11-22 — Hosting Cloudflare Pages
- `wrangler.jsonc` + devDependency `wrangler`: dashboard Cloudflare membuat proyek Worker (static assets), bukan Pages; `npx wrangler deploy` menyajikan `dist/`.
- `base` Vite default jadi `/` (Cloudflare Pages/Netlify); `.node-version` = 22.
- Workflow GitHub tetap menjalankan lint/tes/build; terbit ke GitHub Pages hanya kalau variabel `DEPLOY_GH_PAGES=true` (berhenti gagal merah tiap push).

## 2026-11-22 — Sesi 02 (Fase 1–2)
- Spesifikasi dipecah per file di `research/format_specs/`: `fmf_container.md`, `competition_dat.md`, `club_dat.md`, `db_archive_lainnya.md`, `comps_dbc.md`, `fmm_lists.md`, `logos.md`, `libgame_tables.md`, `status_verifikasi.md` (dengan label VERIFIED/LIKELY/HYPOTHESIS/UNKNOWN).
- `src/core/fmf/`: port kontainer `.fmf` dari `legacy/app/fmmcore.js` ke TypeScript dengan `ByteSource`:
  - `openFmf` (flag 0 **dan** 3; fmmcore.js hanya flag 0), `readEntry`/`readStoredEntry`, `parseToc`/`serializeToc`, `findEntry`, `listEntries`.
  - `patchFmf` (tambal di ujung; data lama dikembalikan sebagai rentang sumber, tidak disalin) + `materializeOutput`.
  - `splitInnerArchive` untuk arsip bersarang (prefix 8 byte, mis. `comps.dbc`).
- `src/core/zstd/`: dekompresi (fzstd) + frame raw multi-blok (memperbaiki batas 128 KiB per blok yang dilanggar `rawFrame` lama untuk data > 128 KiB).
- `src/core/hash/sha256.ts`: SHA-256 bertahap murni TS (untuk file 1,8 GB) + `src/core/versions.ts` (daftar ukuran file yang dikenal).
- Golden test: `scripts/golden/make_fmf_fixtures.py` membuat arsip sintetis flag 0/3 dengan `fmfio.py`; `tests/fmf.test.ts` membandingkan hasil TS, dan arsip hasil tambalan TS dibaca ulang oleh `fmfio.py` (`scripts/golden/read_fmf.py`). `tests/samples.test.ts` untuk file asli di `samples/` (dilewati kalau tidak ada).
- UI: setelah memilih file `.fmf` tampil flag, jumlah entri, daftar entri + pencarian, info `comps.dbc` (kalau ada); tombol "Hitung SHA-256" di Web Worker dengan progres dan tombol salin.
- CI: pasang Python + zstandard supaya golden test lintas bahasa ikut jalan.

## 2026-11-22 — Sesi 01 (Fase 0)
- Kerangka Vite 8 + React 19 + TypeScript 6 (strict) + Tailwind 4.
- PWA: manifest (nama, ikon 192/512/SVG, standalone) + service worker (vite-plugin-pwa, precache offline).
- `src/core/binary/`: antarmuka `ByteSource` + `byteSourceFromBytes`, `formatBytes`/`formatInt`, dengan tes.
- `src/platform/`: antarmuka `FileIO`, `Store`, `PickedFile`; implementasi web `webFileIO` (`<input type=file>`, unduhan Blob) dan `byteSourceFromBlob` (baca potongan via `Blob.slice`).
- Aturan ESLint: `src/core` dilarang memakai API browser (window, document, localStorage, indexedDB, Blob, dll.) dan dilarang mengimpor React/platform/ui. Sudah diuji: pelanggaran terdeteksi.
- Vitest: proyek `core` dijalankan di lingkungan Node.
- Halaman awal: tombol "Pilih file" menampilkan nama dan ukuran file.
- Workflow GitHub Actions: lint + tes + build; terbit ke GitHub Pages dari `main`.

## 2026-11-22
- Rencana v6 (`PROJECT_CONTEXT.md`): gabungan rencana PWA v5 + hasil mod Indonesia (panduan induk 22 Nov 2026).
- Starter repo: `CLAUDE.md`, `.gitignore`, `research/format_specs/` (panduan induk + template manifest), `scripts/` (Python), `legacy/app/` (fmmcore.js + editor logo), `data/` (dataset Indonesia).
