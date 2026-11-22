# FMM27 Mobile: Mod Liga Indonesia, panduan induk

Pemilik: Bacad. Diperbarui 22 Nov 2026 malam (uji B7b: akar masalah freeze Adjust Budgets ditemukan; skema reputasi pita baru; analisa liga/kompetisi, koneksi data, jatah AFC dikoreksi, slot ACL2 & ACL Elite; fase 8-besar Liga Nusantara dijawab (sistem gugur, bukan bug); jadwal "lompat setahun" TERBUKTI lewat screenshot, diduga kurang file `_first_year`; struktur record `awards.dat` dibongkar; rencana aplikasi editor PWA v6 — lihat bagian 12; repo `fmm27-pge-web` terhubung, sudah terbit sebagai Cloudflare Worker dan diuji dengan file asli Bacad).
Dokumen ini berdiri sendiri: AI atau sesi lain bisa melanjutkan pekerjaan hanya dari sini dan dari skrip di folder `scripts/`.

---

## 0. Aturan kerja dengan Bacad
- Bahasa Indonesia yang sederhana, boleh pakai cerita atau analogi.
- **Jangan mengubah atau membangun apa pun sebelum Bacad bilang "eksekusi".** Analisa (membaca file) boleh.
- Gambar logo selalu dari Bacad. AI hanya mengemas, tidak menggambar ulang.
- Hasil kerja dikirim dalam bentuk zip yang strukturnya mengikuti isi APK (`assets/...`, `lib/...`). Bacad mengganti file di APK dengan MT Manager, lalu sign ulang.
- **File besar di APK harus dimasukkan dengan Level "Store" (tanpa kompresi).** Terbukti: `pictures_logos.fmf` yang dimampatkan membuat game macet di layar splash. Setelah dimasukkan ulang dengan Store, game jalan. Cek Properties: Compressed harus sama dengan Size.
- Perubahan database dan aturan baru terlihat di **karier baru**.
- **Perintah tetap Bacad (18 Nov 2026):** setiap ada perubahan, rencana, atau temuan baru, perbarui dokumen ini, simpan ke Project (`claude/00-PANDUAN-INDUK-FMM27-INDONESIA.md`), dan kirim ulang `fmm27_idn_catatan_lengkap.zip`.

## 1. Tujuan proyek
Karier Indonesia di Football Manager 27 Mobile (Netflix, paket `com.netflix.NGP.FootballManagerMobile`, database `db_archive_2706`), dibangun di atas APK mod komunitas `fm27-idn`.

Susunan 2026/27:
- **BRI Super League**: 18 klub.
- **Pegadaian Championship**: Grup Barat dan Grup Timur, masing-masing 10 klub, tiga putaran (27 laga).
  - Juara grup bertemu di final dan keduanya promosi.
  - Runner-up masuk playoff promosi.
  - Peringkat 9 masuk playoff degradasi; peringkat 10 langsung turun.
- **Liga Nusantara**: 23 klub dalam 3 grup (A 7, B 8, C 8), dua putaran.
  - Lolos ke 8 besar: 2 teratas tiap grup plus 2 peringkat ketiga terbaik. Penyederhanaan di mod: yang lolos adalah peringkat ketiga Grup B dan C.
  - 8 besar dimainkan dalam 2 grup × 4, satu putaran.
  - Juara grup 8 besar bertemu di final dan keduanya promosi. Runner-up masuk playoff untuk 1 tiket promosi.
- **Piala**: Piala Indonesia aktif (64 klub) dan Piala Liga Indonesia aktif. Piala Presiden tidak dipakai (keputusan Bacad).
- **Liga cadangan**: Indonesian Reserves Group 1/2/3. Grup 3 untuk tim cadangan klub Liga Nusantara.
- **Klub utama Bacad**: Gresik United (Liga Nusantara Grup B).

## 2. File-file di APK yang disentuh

| File di APK | Isi | Diubah di |
|---|---|---|
| `lib/arm64-v8a/libgame.so` | kode game (ARM64, 52.355.608 byte) | B2c |
| `assets/data/game/db_archive_2706.fmf` | database (klub, kompetisi, pemain, dll.) | A, B1, B4, B6, B6b |
| `assets/shared/data/sicomps.fmf` | aturan kompetisi (`comps.dbc`) + daftar negara playable (`2700/fmm_*.dat`) | A s.d. B6 |
| `assets/data/game/pictures_logos.fmf` | logo (1,8 GB) | B6 |

Versi yang **terpasang dan jalan** sekarang:
- `libgame.so`: B2c
- `sicomps.fmf`: B6 (49.619.693 byte)
- `db_archive_2706.fmf`: B6b (149.841.844 byte)
- `pictures_logos.fmf`: B6 (1.815.037.846 byte, disimpan dengan Store)

Jalur alternatif tanpa membongkar APK (terbukti untuk database): folder `Android/data/com.netflix.NGP.FootballManagerMobile/files/Documents/db_archive_2706/` berisi file `.dat` yang diubah, ditambah `config.xml` yang memetakan `<record from="club" to="db_archive_2706/club"/>`. Penggantian berlaku per file. Kalau susunan rusak, daftar negara jadi kosong dan **data aplikasi harus dihapus** (hapus cache tidak cukup).

## 3. Kontainer `.fmf` (dipakai semua arsip)
- **Header 26 byte**: `02 01 66 6d 66 2e 08 00 00` (magic 9 byte), lalu u64 X, u64 17, dan 1 byte flag. Data file mulai di byte 26.
- **Daftar isi (TOC)** ada di offset `9 + X`:
  - Diawali magic 9 byte.
  - Flag 0: u32 panjang + frame zstd (bisa berupa rangkaian `[u32 + frame]`, tiap frame 131.072 byte mentah).
  - Flag 3: langsung frame zstd. Pada flag 3 setiap entri adalah satu frame zstd.
- **Isi TOC (rekursif)**: nama folder (u32 + teks), u32 jumlah file, lalu per file: nama, ekstensi, u64 offset (relatif terhadap byte 26), u64 ukuran tersimpan, u64 ukuran asli, 2 × u64 waktu. Setelah itu u32 jumlah subfolder, lalu subfolder.
- Urutan file tidak terurut, jadi file baru aman ditambah di ujung data.
- Kemas ulang tanpa perubahan menghasilkan file identik byte demi byte (zstd level 19; window log 23 untuk TOC, 22 untuk entri; checksum on).
- Skrip: `fmfio.py` (`read`, `write`, `walk`, `get`).

Arsip `.dat`/`.dbc` di dalamnya memakai header 8 byte `03 01 "tad." 01 00` (atau `"cbd." 04 00`) + kemasan fmf yang sama.

## 4. Database `db_archive_2706.fmf`
Berisi 76 file. Yang sudah dipecahkan:

### 4.1 `competition.dat` (`comp.py`)
Header 8 byte + u16 jumlah record. Isi tiap record:
- u16 index (urut), u32 UID
- Nama panjang (u32 + teks + 1 byte), nama pendek (u32 + teks + 1 byte), singkatan (u32 + teks)
- u8 **jenis**: 0 liga utama, 1 liga bawah, 2 piala utama, 3 piala liga, 4 piala lain, 5 piala super, 8 liga cadangan, 21/22 kontinental, 28 amatir
- u16 kode benua (1 Asia, 2 Eropa, 3 Amerika Utara, 5 Amerika Selatan)
- i16 index negara (−1 = lintas negara)
- 4 byte warna
- u16 reputasi
- 1 byte tingkat divisi (100 untuk piala), i16 index induk (−1 kalau tidak ada)
- u32 N peserta, lalu N × (i32 UID klub, u16 tahun, u16 slot)
- 3 × i32 juara/runner-up/ketiga, 3 × u16 tahun, u16

**Nama yang tampil di layar**: game memakai nama panjang kalau muat, kalau tidak memakai nama pendek. 21 huruf terbukti muat ("Liga Nusantara Grup A"); 33 huruf tidak.

### 4.2 `club.dat` (`club.py`)
Header 8 byte + u32 jumlah record. Parser membaca 38.747 record sampai byte terakhir. Isi tiap record:

| No | Field | Keterangan |
|---|---|---|
| 1 | i32 −1, u32 UID | |
| 2 | Nama | nama panjang (+1 byte), nama pendek (+1 byte), nama 6 huruf, kode 4 huruf, kode 3 huruf |
| 3 | 2 × i16 negara | pertama = **negara liga tempat bermain**, kedua = negara asal |
| 4 | Warna dan kit | 12 byte warna + 132 byte kit (6 × (2 + 10 × u16)) |
| 5 | Blok 10 byte | u8 **status** (1 profesional, 2 semi-pro, 3 amatir), u8 **fasilitas latihan**, u8 **fasilitas akademi** (1–20), i16 **penonton rata-rata**, i16 **penonton minimum**, i16 **penonton maksimum** (semua ×10), u8 (0/1/2, belum jelas) |
| 6 | i16 **divisi** | index kompetisi; −1 = tanpa liga |
| 7 | 5 byte | i16 divisi kedua, 1 byte, u16 **index stadion** (65535 = tidak punya stadion; di `club.py` field ini bernama `rep`) |
| 8 | i16 divisi musim lalu | |
| 9 | flag | 1 byte; kalau 1, disusul **blok keuangan 68 byte** (lihat 4.2a) |
| 10 | Blok 12 byte | u32 8 + 8 byte |
| 11 | Blok 23 byte | u8 (peringkat musim lalu?), **u16 reputasi klub (0–10.000)**, i32, i32, 3 × i32. Contoh reputasi: Man City 9150, Brighton 7050, Kashima 6400, Persib 4300 (B7b: 4600), Gresik 350 (B7b: 1500). Letak: `o_div+10 (+68 kalau flag) + 4 + k + 1` |
| 12 | Daftar 21 byte | u16 N + N × 21 byte (belum dipetakan) |
| 13 | Pemain | u16 jumlah + UID pemain (i32) |
| 14 | Staf | 12 × i32 slot staf |
| 15 | Blok akhir 77 byte | u32, 27 byte, 44 byte, u16 (belum dipetakan) |

#### 4.2a Blok keuangan 68 byte (sebagian, dugaan; perlu kalibrasi di game)
| Offset | Isi | Man City / Chelsea / Brighton | Klub Asia (Persib, Kashima, Shenhua) |
|---|---|---|---|
| 0 | u8 02 + 6 byte nol | | sama |
| 7 | f32 A (juta) | 125,5 / 99,25 / 23,9 | 0 |
| 11 | u32 B | 5 / 11 / 111 | −1 |
| 15 | u32 C | 5 / 7 / 152 (−1 di tim cadangan) | −1 |
| 19 | u32 D (= A × 1000, ribuan) | 125.500 / 99.250 / 23.903 | 0 |
| 23 | u32 E (ribuan) | 263.500 / 220.250 / 44.017 | 0 |
| 27 | u8 10 + 10 × u32 | daftar 10 angka (mis. 18.000–35.000) | nol |

- Klub tanpa blok (flag 0, misalnya Persija, Bali United, Gresik) atau dengan blok kosong: angka keuangannya dikarang sendiri oleh game. Contohnya Gresik tercatat "Rich".
- Dugaan: A/D = saldo atau anggaran transfer, E = pendapatan atau anggaran gaji. Belum pasti; perlu dicocokkan dengan angka di editor dalam game.
- **Klub Asia memakai blok kosong; game mengarang keuangannya sendiri, kemungkinan besar dari reputasi + status + penonton.** Karena itu B7b menaikkan reputasi, bukan mengisi blok keuangan. Kalau anggaran di game masih kurang, langkah berikutnya kalibrasi blok 68 byte.

#### 4.2b Staf
- 12 slot staf (i32 UID orang). Man City terisi 10, Persib 2, Persija 3, Gresik dan PSIS kosong.
- Slot kosong diisi game dengan staf buatan saat karier dimulai. Contohnya manajer AI Gresik "Heru Pramana".
- Untuk staf dengan nama asli perlu record orang baru di `people.dat` (150.430 orang) + `non_players.dat`/`coaches.dat` + nama di file nama. Format ini belum dibongkar (bagian dari B3).

Catatan:
- Memindahkan klub cukup dengan menimpa field negara dan divisi (ukuran tetap).
- Klub baru dibuat dengan mengklon record lain lalu menambahkannya **di ujung**, supaya index rujukan di `rivalries.dat` tidak bergeser. Nama klub baru juga ditambahkan di ujung setiap file `.lng` (16 bahasa).
- Index negara Indonesia 58 (UID 113, kode IDN). China 55, Jepang 61, Korea 80.

### 4.3 `rivalries.dat` (`riv.py`)
Header 8 byte + u16 jumlah. Tiap record: u32 index, u32 UID, nama (+1 byte), i32 index klub A, i32 index klub B (urutan di `club.dat`), 1 byte intensitas (0–200), 14 byte.
Derby yang dipasang: Persija–Persib 200, Arema–Persebaya 190.

### 4.4 File `.lng` (16 bahasa)
Berisi nama klub per bahasa. u32 jumlah di offset 8 harus sama dengan jumlah klub di `club.dat`.

### 4.5 `stage_names.dat`
Tiap record: u16 idx, u32 id, 3 teks (+1 byte). ID yang dipakai:
- 20 Final
- 76–79 Group A–D
- 111 Relegation Playoff
- 117 Promotion Playoff
- 142 Champions Playoff
- 176/177 First/Second Phase Group Stage

### 4.6 `stadium.dat` (`stadium.py`)
Header 8 byte + **u16** jumlah (12.509 asli). Isi tiap record:
- u32 index, u32 UID
- u16 index kota, u32 kapasitas, u32 kapasitas maksimal
- Nama (u32 + teks), nama alternatif (u32 + teks, boleh kosong)
- 8 byte (biasanya `00000000ff000000`)

Klub tanpa stadion membuat kapasitas 0, sehingga penonton terpotong jadi 0. Stadion baru harus didaftarkan juga di `sicomps/2700/fmm_stadiums.dat` IDN-0/1/2. `city.dat` tidak memuat nama kota, jadi kota stadion baru dipinjam dari stadion terdekat.

### 4.7 `nation.dat` (sebagian)
- Record diawali u32 UID, u16 index, nama (+ff), kebangsaan (+ff), kode 3 huruf.
- Setelah penanda `ff 7f d4 00 00 00 ff 7f` ada: u8, u16 (index negara tetangga), **u8 kandidat youth rating**, u8 1, u16 peringkat FIFA, u16 poin FIFA.
- Kandidat youth rating: Inggris 19, Spanyol/Jerman/Italia 18, Jepang 13, Korea 12, China 10, Wales 6. Negara yang ligannya tidak aktif di FMM (Indonesia, Thailand, Malaysia, Brasil) bernilai 1.
- B7a mengubah Indonesia dari 1 menjadi 10. **Belum terbukti** sampai youth intake diuji.

### 4.8 Belum dibongkar penuh
`players.dat`, `non_players.dat`, kontrak (`starting_contracts.dat`). Diperlukan untuk B3.

### 4.9 Nama & `people.dat` (temuan awal 18 Nov 2026)
- **File nama** (`first_names.dat`, `second_names.dat`, `common_names.dat`; skrip `names.py`): header 8 + u32 jumlah (64.318 / 106.833 / 9.673). Record: u32 0, u32 index (urut), u8, u32 UID negara, u16, u8 flag, u32 panjang + teks. Dibaca sampai byte terakhir.
- **`people.dat`** (150.430 orang): panjang record bervariasi; formatnya belum dibongkar penuh. Pola yang sudah pasti di dalam tiap record: `i32 -1, u32 UID orang, u32 index nama depan, u32 index nama belakang, i32 index nama umum (-1 = tidak ada), u16 hari ke-n dalam tahun (mulai 0), u16 tahun lahir, u16 index negara` (58 = Indonesia; contoh Mees Hilgers UID 37078404, 12 Mei 2001, negara 58, negara kedua 158 Belanda tak jauh setelahnya). Skrip `people_scan.py` menemukan 150.420 orang dengan pola ini. Hanya 162 orang berkebangsaan Indonesia.
- **Index negara** (`nation.dat`): u32 UID, u16 index, nama (+ff), kebangsaan (+ff), kode 3 huruf. 245 negara terbaca (`data/nation_idx.json` di sesi kerja).
- **Daftar muat orang** `sicomps/2700/fmm_people.dat` → `IDN-0/1/2.dat` (14.572 UID): orang yang dimuat kalau Indonesia dipilih. **31 dari 162 orang berkebangsaan Indonesia tidak ada di daftar ini**, termasuk Jay Idzes, Mees Hilgers, Elkan Baggott, Justin Hubner, Dean James, Nathan Tjoe-A-On, Joey Pelupessy, Ole Romeny, Miliano Jonathans, Luke Vickery, Adrian Wibowo, Mathew Baker. Mereka hanya ikut termuat kalau negara klubnya juga dimuat. Supaya pool timnas lengkap, UID mereka perlu ditambahkan ke IDN-0/1/2 (pekerjaan ringan, mirip `fmm_stadiums` di B7a). `people_to_always_load_male.dat` (7.500 UID) tidak memuat satu pun orang Indonesia.

## 5. Data Indonesia di database (setelah B6b)

### 5.1 Kompetisi

| idx | UID | Nama (panjang / pendek) | Catatan |
|---|---|---|---|
| 1670 | 41004312 | BRI Super League | reputasi 164 |
| 1671 | 41042740 | Pegadaian Championship | induk, reputasi 115 |
| 1672 | 41042741 | Pegadaian Championship Grup Barat / Pegadaian Champ Barat | induk 1671 |
| 1673 | 41042742 | … Grup Timur / Pegadaian Champ Timur | induk 1671 |
| 1674 | 7746536 | Piala Indonesia | reputasi 120 |
| 1675 | 2000560926 | Piala Liga Indonesia | |
| 1676 | 2000189135 | Piala Presiden | tidak aktif |
| 1677 | 7746537 | Piala Super Indonesia | |
| 1678 | 41042746 | Liga Nusantara | induk |
| 1679–1681 | 2000700101–103 | Liga Nusantara Grup A/B/C | induk 1678 |
| 1682 | 41045091 | Liga 4 | tidak bisa dimainkan; hanya pelengkap Piala Indonesia |

### 5.2 Klub per kompetisi
- **BRI Super League (18)**: Arema, Bali United, Bhayangkara Presisi Lampung, Borneo, Dewa United, Garudayaksa, Isenmulang Kalteng, Java United, Madura United, Persebaya, Persib, Persija, Persijap, Persik, Persita, PSIM, PSM, PSS.
- **Championship Grup Barat**: Adhyaksa FC Bekasi, Persikad Depok, Persiku, Persiraja, PSGC Ciamis, PSIS, PSMS, PSPS, Semen Padang, Sumsel United FC.
- **Championship Grup Timur**: Barito Putera, De Red FC, Deltras FC, Kendal Tornado, Persela, Persiba Balikpapan, Persipura, Persis, PSBS, RANS Nusantara.
- **Liga Nusantara Grup A**: Pekanbaru FC, Persitara, Persikota, Batavia, Persikotas Nusantara, Pesik Kuningan, Persekat Tegal.
- **Liga Nusantara Grup B**: **Gresik United (UID 2000700017)**, Persiba Bantul, Persibangga Purbalingga, Persibo, Persika Karanganyar, Persinga Ngawi, Persipa Pati, Putra Sang Fajar FC.
- **Liga Nusantara Grup C**: Donggala United FC, Pasuruan United, Persekabpas, Perseden, Persinab Nabire, Persipani Paniai, Persikutim United, PSN Ngada.
- **Liga 4**: Persid Jember, PS Mojokerto Putra, Persikoba Batu (klon Gresik).
- **Dikeluarkan dari liga (divisi −1)**: Persibas, Waanal Brothers, Perserang.

### 5.3 UID klub buatan sendiri
Semuanya klon dari klub lain, dengan nama baru:
- 2000700017 Gresik United
- 2000700019 Persikad Depok
- 2000700020 Pasuruan United
- 2000700021 Persipani Paniai
- 2000700022 PSN Ngada
- 2000700023–25 klub Liga 4

Persib UID 116140, Persija 116144.


### 5.4 Data pemain & staf v2 (18 Nov 2026, siap untuk B3)
- `data/data_liga_indonesia_v2.xlsx` (tab Panduan, Klub, Pemain, Staf) + CSV `data/pemain_indonesia_v2.csv`, `data/staf_indonesia_v2.csv`.
- **1.821 pemain, 64 klub**: 971 dari Transfermarkt (screenshot Bacad, 35 klub: 9 Championship + 23 Liga Nusantara termasuk Gresik + 3 Liga 4), 850 dari Wikipedia (18 klub Super League + 11 Championship).
- Kolom pemain: kompetisi, klub, no, nama, posisi (kode FM), posisi_lain, negara (kode 3 huruf; ganda ditulis `IDN/BRA`), tgl_lahir, tinggi_cm, kaki, nilai_juta_rp, kontrak_sampai, sumber, perkiraan.
- **Aturan perkiraan (permintaan Bacad: "yang belum ada, dikarang")** — skrip `scripts/build_dataset.py`, seed 2026:
  - tgl lahir: kalau hanya umur → tahun dari umur, bulan/hari acak; kalau kosong → umur acak 20–30 (kiper 21–31).
  - nilai pasar (juta Rp) per tingkat: klub besar SL (Persib, Persija, Persebaya, Bali United) 800–3.500; SL 300–2.200; Championship 100–900; Liga Nusantara 25–250; Liga 4 10–100. Usia <20 ×0,5; >32 ×0,6; pemain asing ×1,8.
  - kontrak kosong → 31 Mei 2027 (kadang 2028).
  - posisi pemain Wikipedia (GK/DF/MF/FW) → GK/DC/MC/ST.
- **Prioritas sumber**: Transfermarkt menang atas Wikipedia. Pemain yang muncul di dua klub dipakai versi Transfermarkt (mis. Baihaqi Rifai → Gresik, Risky Sudirman & Gardhika Arya → Persiba Balikpapan, Komang Dedi → Perseden, Joseph Kurniawan → Persiba Bantul).
- **Pelatih kepala ikut Transfermarkt** bila ada: Gresik = Joko Susilo (Andik Ardiansyah asisten), Persiba Balikpapan = Ega Raka Galih, Persekabpas = Bio Paulin.
- **Posisi detail** dibaca otomatis dari screenshot tabel posisi: kode di sel hijau = posisi utama, sel krem = posisi lain (`scripts/grid_ocr2.py`: baris dikenali dari bulatan nomor, nama via OCR + pencocokan dengan daftar, kode sel via OCR + kalibrasi kolom). Hanya 5 pemain yang bertabrakan dengan daftar; di situ dipakai posisi daftar.
- **Staf**: Slot per klub sesuai level (patokan rata-rata database: Premier League 9, J1 6, J2 5, J3 3, Chinese Super League 3): klub besar SL 10, SL lain 7, Championship 4, Liga Nusantara 3, Liga 4 2. Prioritas: satu orang per jabatan dulu (pelatih kepala, asisten, pelatih kiper, pelatih fisik, fisioterapis, dokter, analis, dst.), baru orang tambahan untuk jabatan yang sama. Orang yang tercatat di dua klub hanya dipakai sekali. **364 staf: 275 di klub, 89 "Tanpa klub"** (tetap dimasukkan ke database sebagai staf bebas, permintaan Bacad).
- **Logo**: 23 PNG dari Bacad (139×181, transparan, sudah dicek visual) di `data/logo_klub/<UID>_<klub>.png`. Akan di-fit ke 180×180 dan 25×18 saat dikemas.
- Transkrip mentah per klub: `data/transkrip_tm/*.txt` (format `no|posisi TM|negara|nama|tgl lahir|kontrak|nilai jt[|tinggi|kaki]`, baris staf diawali `S|`).

### 5.5 File data Indonesia untuk sesi lain (18 Nov 2026)
Permintaan Bacad: semua data klub, pemain, staf, kompetisi beserta regulasi dan sistemnya disimpan dalam file yang mudah dibaca. Ada di `data/` dan di Project (`claude/data/`):
- `kompetisi_dan_regulasi_indonesia.md`: piramida liga, regulasi asli 2025/26–2026/27 (pemain asing 11 daftar / 9 DSP / 7 main, format Championship, Liga Nusantara), cara mod menerapkannya, klub per kompetisi, sistem klub di database, aturan pengisian data, status penerapan.
- `klub_indonesia.csv`: 77 klub dari db B7a (`scripts/export_klub.py`): kompetisi, nama, UID, status, fasilitas, penonton, stadion + kapasitas, blok keuangan ada/tidak, staf & skuad di game, status logo, jumlah pemain/staf di dataset.
- `pemain_indonesia_v2.csv`, `staf_indonesia_v2.csv` (lihat 5.4).

### 5.6 Pemain Indonesia di luar negeri & diaspora (18 Nov 2026)
Permintaan Bacad: pool pemain timnas lebih lengkap (contoh Mitchell Baker, Mathew Baker). File `data/pemain_indonesia_luar_negeri.csv` (skrip `build_abroad.py`), 28 pemain, kolom: nama, posisi, posisi_lain, tgl_lahir, negara, klub, negara_klub, status_wni, di_database, uid_db, kebangsaan_di_db, tindakan, sumber, perkiraan, catatan.
- **Sudah ada di database dan lengkap:** Audero, Paes, Diks, Verdonk, Asnawi.
- **Ada tapi tidak di daftar muat IDN:** Idzes, Hubner, Baggott, Tjoe-A-On, Dean James, Hilgers, Pelupessy, Romeny, Jonathans, Vickery, Adrian Wibowo, Mathew Baker → tambah ke `fmm_people` IDN-0/1/2.
- **Belum ada sama sekali (orang baru):** Mitchell Baker (ST, 11 Des 2006, Colorado Rapids, WNI sejak 13 Jul 2026), Welber Jardim (MC/DR, 25 Apr 2007, São Paulo), Yohanes Kandaimu, Abdurrahman Iwan Kuswanto, Muhammad Misbah, Reycredo Bukit, Sulthan Zaky, Givary Lotra, Zinaedin Ardiansyah (kelompok terakhir: klub per data IDN Abroad Feb 2026; posisi & tgl lahir perkiraan).
- **Kebangsaan bukan IDN di database:** Noah Adnan (USA; masih WNA, dipanggil TC Nov 2026) dan Taisei Marukawa (JPN; proses naturalisasi). Opsional: beri IDN.
- Diaspora yang sudah pulang ke Super League (Jordi Amat, Haye, Eliano, Struick, Jenner, Raven, Zijlstra, Pattynama, Walsh, Ragnar, Geypens, Markx, Margono, Sananta) sudah tercakup di `pemain_indonesia_v2.csv`.
- Koreksi transfer 2026 di `pemain_indonesia_v2.csv`: Pratama Arhan dan Marselino Ferdinan ditambahkan ke Persija (1.823 pemain).

## 6. Aturan kompetisi `sicomps.fmf`
- Berisi 1.489 file: XML aturan, dokumen `.md` dari developer, **`comps.dbc` (yang benar-benar dibaca game)**, `comps.txt` (indeks + versi), dan `2700/fmm_*.dat`.
- Bukti bahwa game membaca dbc: Serie C hanya ada dalam bentuk dbc, tanpa XML.

### 6.1 Format `comps.dbc` (`dbc.py`, `dbcarc.py`, `dbcshow.py`)
- Entri bernama `comp_<nama>_<branch>.dbc`, `nation_<x>_<branch>.dbc`, `continent_…`, `fixtures_N.dbc`. Entri `fixtures_N` berisi tabel biner 25 byte per baris dan cukup disalin apa adanya.
- **Header entri 4 byte**: byte 1 = jenis file (1 kompetisi, 2 grup-sebagai-liga, 3 divisi induk, 8 tanggal mulai, 10 daftar kompetisi negara, 11 cadangan, 12 aturan negara), byte 2 = `vers`.
- Setelah header: kunci (`01` + nilai), u32 jumlah field, lalu field.
- **Field** = tag 4 huruf (tersimpan terbalik) + `01` + nilai.
- **Kode tipe nilai**:
  - 00 kosong, 01 i32, 02 u32/kode 4 huruf, 03 bool, 05 f64
  - 0a record (u32 jumlah + field), 0b daftar (u32 jumlah + item)
  - 0c/1a teks, 0f/18 i64, 11 i8, 12 i16, 19 f32, 20 tanggal
- Tanpa perubahan, `parse` lalu `build` menghasilkan entri identik (1.272 entri).

### 6.2 Tag penting
- **Umum**: `ftye` jenis file, `vers` versi, `comp` kompetisi, `ntms` jumlah tim, `nrds` jumlah putaran, `nmdt` jumlah pekan, `dyow` hari (1 Minggu … 7 Sabtu)
- **Promosi, degradasi, kualifikasi**:
  - `qurl` (qualification: `nmsn`, `nrpl`, `topp`/`btpl`, `comp`, `stag` tahap tujuan)
  - `tppr`/`btpr` (playoff atas/bawah), `prmr`/`relr` (promosi/degradasi)
  - `exfp` (extra fate places: `nrpl`, `olpl` 255, `nwpl` 0, `nptc`)
- **`tems` (sumber tim)**: id 1 = tim divisi, id 2 = tim lolos (`stag` tahap asal, `nmsn`, `comp`, `indx`, `semt`, `seed`, `ncmp`), id 5 = tim terdaftar
- **Grup**: `gpdt`, `gnty` (0 huruf, 1 angka), `ngrt` tim per grup, `crgt` tim terdaftar, `gptm` tim per grup, `UGGT`
- **Lain-lain**: `rkli` ranking level, `Tp3t`, `sfal` aksi akhir tahap, `strq`, `inac` nonaktif, `mxto` maksimal tim
- **Hubungan induk-anak**: `cmps` daftar kompetisi, `vlys` (`mntm`/`mxtm`), `chdc` daftar anak, `dcin` jumlah anak
- **Negara**: `nccc` (di `dvlv` aturan negara), `retm` jumlah klub wajib (`ntms`/`FBkt`/`Bktm`)
- **Nama tahap** (`stgn`) = `(id<<32)|id`

Daftar `registered_teams`/`group_teams` (`crgt`/`gptm`) **hanya berlaku kalau tahunnya sama dengan tahun mulai game (2026)**.

### 6.3 Pola "grup sebagai liga mandiri" (pola Serie C, TERBUKTI di B5b)
- **Tiap grup adalah kompetisi liga sendiri.** Satu entri aturan bisa dipakai beberapa grup:
  - Header `02xx0000`, `ftye 2`
  - Kunci = daftar `{comp}`
  - Field `cmps`, `vlys`, `dcin`
- **Kompetisi induk**:
  - Header `03xx0000`, `ftye 3`
  - `chdc` (daftar anak, ditaruh setelah `bsyr`), `dcin`
  - Hanya berisi babak cup (final/playoff) yang mengambil tim dari grup lewat `tems id 2`
- **Aturan negara**: `dvlv` induk diberi `nccc` = jumlah anak; `retm` induk memakai `Bktm` = total klub.
- Kalau tidak memakai pola ini, game menampilkan semua grup dengan isi tabel grup 1 (bug mod asli).

### 6.4 Entri Indonesia (branch)

| Entri | Isi |
|---|---|
| `comp_idn_league_two_groups_1442` | Grup Barat + Timur: 10 klub, 3 putaran, 27 pekan, Sabtu 12 Sep – 1 Mei. Peringkat 1 → 142, peringkat 2 → 117, peringkat 9 → 111. `relr` 1 ke Liga Nusantara. |
| `comp_idn_league_two_1442` | Induk: tahap 0 playoff promosi + final, tahap 1 playoff degradasi |
| `comp_idn_league_three_group_a_1439` | 7 klub, 2 lolos |
| `comp_idn_league_three_groups_bc_1439` | Grup B dan C, 8 klub, 3 lolos. 2 putaran, 7 Nov – 13 Feb. |
| `comp_idn_league_three_1439` | Induk: 8 besar 2×4 (27 Feb – 13 Mar), playoff promosi 20 Mar, final 21 Mar |
| `comp_idn_cup_1438` | Piala Indonesia: tim dari Super League, 2 grup Championship, 3 grup Liga Nusantara, Liga 4 (`mxto` 64). `inac` false. |
| `nation_idn_comps_1446` | `cmps` (daftar aktif), `dvlv` (`nccc` 2/3), `retm` (Bktm 20/23; grup 7/8/8; Liga 4 = 3) |
| `nation_idn_reserve_comps` | Liga cadangan per strata tim utama (`rsvl` levl 0/1/2). **Ikut naik-turun bersama klub induk**; belum punya promosi/degradasi sendiri. |

`comps.txt` (nama, versi): `idn_league_two 241`, `idn_league_two_groups 1`, `idn_league_three 3`, `idn_league_three_group_a 1`, `idn_league_three_groups_bc 1`, `idn_cup 38`, `idn_reserve_comps 17`. Urutan alfabet wajib dijaga.

### 6.5 Daftar negara playable: `sicomps/2700/fmm_*.dat`
- Ada 6 file: `comps`, `clubs`, `reserve_clubs`, `cities`, `stadiums`, `people`.
- Isinya entri `<NEGARA>-<n>.dat` = daftar UID (u32 jumlah di offset 8). n = kedalaman strata (0 = strata 1 saja).
- Indonesia sekarang punya `IDN-0`, `IDN-1`, `IDN-2`.
- **Kompetisi atau klub baru harus dimasukkan ke sini** supaya ikut dimuat.
- Skrip: `fmmlists.py`.

### 6.6 Tanggal mulai
Blok negara 113 di `start_dates_fmm` (entri `nation_start_dates_fmm_0`) menentukan tanggal mulai liga dan kompetisi kontinental (tidak berlaku untuk piala).

## 7. Kode game `libgame.so` (tambalan B2c)
Alamat di bawah sama dengan offset file (`.rodata`):
- **Tabel negara playable** di sekitar 0x643920: 28 × u16 index negara, tepat setelah teks `22FMH_RULE_GROUP_MANAGER`. Mod mengganti Wales (175) dengan Indonesia (58) di offset 0x643952 (`af` → `3a`). Ukuran tabel tetap 28, jadi menambah negara berarti menukar negara lain.
- **Tabel liga terdalam yang bisa dimainkan** di 0x7cb440–0x7cb4b0: u32 UID kompetisi, diakhiri `FFFFFFFF`. Tabel berikutnya untuk liga wanita.
  - B2c mengubah 0x7cb478 dari 41042740 (`34 43 72 02`) menjadi **41042746 Liga Nusantara** (`3a 43 72 02`).
- Pelajaran: kalau liga tidak muncul di layar awal karier padahal datanya lengkap, **cek tabel ini dulu**.

## 8. Logo `pictures_logos.fmf`
- Ukuran asli mod 1.805.232.793 byte (142.874 file, flag 0). Setelah B6: 1.815.037.846 byte (142.888 entri).
- **Peta logo**: `pictures_logos/logos/{normal,small}/{clubs,comps}/config.xml`. Isinya record `from="custom/<ID>" to="graphics/pictures/<club|comp>/<ID>/logo"` untuk normal (180×180 RGBA) dan `.../icon` untuk small (25×18 RGBA). File gambar ada di `custom/<ID>.png`.
- **Cara B6**: header baru + data lama (dipotong sebelum TOC) + tambalan (PNG baru, `config.xml` baru, TOC baru). Dirakit di HP:
  `( cat b6_header.bin; tail -c +27 pictures_logos.fmf | head -c 1804084040; cat b6_patch.bin ) > pictures_logos_b6.fmf`
- TOC tambalan memakai frame zstd "raw block" dan diterima game.
- **Wajib Store di APK.**
- Logo yang sudah dipasang: Championship → 41042741/42; Liga Nusantara → 41042746 dan 2000700101–103; Gresik → klub 2000700017.

### Aplikasi Editor Logo
- Artifact: https://claude.ai/artifact/B7KUiGbcPt1jCD8QcQn7TE. Sumber: `app/fmmcore.js`, `ui.html`, `editor_logo_fmm27.html`.
- Cara kerja: muat db + `pictures_logos.fmf`, pilih kompetisi atau klub, unggah PNG. Keluarannya paket Documents atau file APK baru.
- Batas: aplikasi Claude Android menolak unduhan di atas 200 MB, jadi untuk file APK pakai versi HTML yang dibuka di Chrome.

## 9. Riwayat putaran

| Putaran | Isi | Hasil uji |
|---|---|---|
| Uji 1–4 | Persija dipindah ke CSL, reputasi, derby | Jalan setelah negara liga diubah |
| A | Melengkapi aturan bawaan: grup Championship, 4 piala, reputasi, derby | Jalan |
| B1/B2/B2b | Liga Nusantara di database + aturan | Layar awal tetap 2 strata |
| **B2c** | Tambal `libgame.so` | **Tiga strata muncul** |
| B4 | Susunan 2026/27 + format grup | Grup diundi acak |
| B4b | `crgt`/`gptm` 2026 | Grup benar, tapi tabel semua menampilkan grup 1 |
| B5 | Pola Serie C | Hanya Super League muncul |
| **B5b** | Induk `ftye 3` + `chdc` + `dcin` | **Benar semua** |
| **B6** | Piala Indonesia 64 klub, Liga 4, cadangan Grup 3, logo | **Jalan** (setelah logo dimasukkan dengan Store) |
| **B6b** | Nama pendek Championship "Pegadaian Champ Barat/Timur" | Dikirim |
| B7a | Stadion untuk 28 klub (13 stadion baru UID 2000700201–213, didaftarkan di `fmm_stadiums`), youth rating IDN 1 → 10 | Tidak dipasang; digantikan B7b |
| **B7b** | Di atas B7a. db: youth IDN 19; 64 klub IDN: status pro untuk SL+Championship, fasilitas latihan/akademi minimal (4 besar 13/12, SL 10/9, CH 7/6, LN 5/4, L4 3/3), penonton realistis (dibatasi kapasitas), reputasi (lantai SL 2800, CH 2200, LN 1200, L4 700; Persib 4600, Persija 4500, Persebaya 4300, Bali 4100, Borneo 4200, Gresik 1500); Noah Adnan kebangsaan USA → IDN. sicomps: 32 UID orang Indonesia ditambahkan ke `fmm_people` IDN-0/1/2 (14.572 → 14.604). Logo: 23 klub ke `pictures_logos` (tambalan di atas file B6, hasil 1.818.029.973 byte, rakit pakai `pasang_logo_b7.sh`). Skrip `build_b7b_db.py`, `build_b7b_rules.py`, `mkpatch_b7.mjs`. | **Jalan, tapi Adjust Budgets freeze** — lihat 10.1b-uji dan 10.1d |

## 10. Masalah terbuka dan rencana (B7)
1. Stadion: dikerjakan di B7a, ikut di B7b, menunggu uji.
1b. **B7b menunggu uji.** Yang dicek: youth intake, anggaran/gaji klub IDN di layar keuangan, fasilitas, penonton, logo 23 klub, Mees Hilgers dkk. muncul di pilihan timnas, Noah Adnan berkebangsaan Indonesia.
1b-uji. **Hasil uji B7b (Bacad, 18 Nov):** game jalan normal, logo Gresik tampil. Keuangan Gresik: Wage Budget $0/minggu, Current Wage Total $0, Maximum Wage $490, Transfer Budget $10.000, "Our finances are OK". **Tombol Adjust Budgets membuat game freeze.** Dugaan: anggaran gaji 0 (pemain buatan game dikontrak amatir tanpa gaji karena status klub semi-pro) → pembagian dengan nol di layar penggeser anggaran. Kemungkinan sama akarnya dengan masalah "Make Request kosong" (no. 3). Blok keuangan 68 byte tidak wajib: hanya 1.882 dari 38.772 klub punya, klub Inggris divisi bawah (Barnet, Accrington) tidak punya tapi keuangannya jalan, dan blok klub Asia kosong.
   - **Fakta dari Bacad: Liga Nusantara = klub profesional; yang semi-pro hanya Liga 4.** Status di db B7b: Liga Nusantara 21 klub semi-pro (2), 1 pro, 1 amatir (3); Liga 4 semi-pro (2).
   - Rencana **B7c** (tunggu "eksekusi"): semua klub Liga Nusantara → status 1 (pro), Liga 4 tetap 2. Hanya `db_archive_2706.fmf` yang berubah. **(Direvisi — lihat 1d: status saja TIDAK memperbaiki freeze. B7c digabung dengan perbaikan reputasi di 1d.)**

1d. **Akar masalah freeze Adjust Budgets DIPASTIKAN (Bacad, 22 Nov).** Uji pembanding: klub **Persikad Depok** (skuad kosong di database, sama seperti Gresik, tapi statusnya SUDAH profesional sejak B7b karena masuk tier Championship). Dengan anggaran bawaan hasil build kita (Transfer Budget ~$10rb, Wage Budget $0/minggu) — **tetap freeze**, walau klubnya sudah profesional. Ini membuktikan status pro/semi-pro BUKAN penyebab langsung freeze-nya (hipotesis lama di 1b-uji gugur). Setelah Transfer Budget diubah manual jadi $675rb dan Wage Budget $3,4rb/minggu lewat aplikasi editor — Adjust Budgets **jalan, tidak freeze**.
   - **Kesimpulan: freeze terjadi karena Transfer Budget dan terutama Wage Budget klub bernilai $0 (atau nyaris nol) saat karier dimulai, bukan karena status klub.** Game kemungkinan menghitung anggaran awal dari reputasi + status + penonton; reputasi klub skuad-kosong kita (lantai lama B7b: SL 2800, CH 2200, LN 1200, L4 700) masih terlalu rendah untuk menghasilkan anggaran yang masuk akal → dibulatkan ke 0 → layar penggeser anggaran (Adjust Budgets) tidak punya rentang untuk dibagi → freeze.
   - Status profesional untuk Liga Nusantara (fakta dari Bacad, 18 Nov) **tetap benar dan tetap perlu diterapkan** — ini menentukan jenis kontrak pemain buatan game (profesional bergaji vs semi-pro/amatir $0), bukan penyebab freeze-nya. Dua perbaikan ini berjalan beriringan, tidak saling menggantikan.
   - **Bonus temuan:** masalah terbuka no. 3 ("Make Request ke dewan kosong") **selesai dengan sendirinya** — board request untuk Gresik United sudah muncul normal di uji ini, walau status klub masih semi-pro lama. Jadi status bukan penyebab masalah itu juga; item no. 3 ditutup.

1e. **Skema reputasi klub — koreksi dari Bacad (22 Nov).** Aplikasi editor menampilkan reputasi sebagai pita bernama, bukan angka langsung, dari 4 contoh yang dicek: Manchester City = *Worldwide*, Manchester United = *Continental*, Everton = *Top Division*, Gresik United (reputasi lama, pra-B7b) = *Obscure*. Urutan pita dari tinggi ke rendah (berdasarkan contoh ini): Worldwide > Continental > Top Division > National > (di bawahnya, termasuk Obscure).
   - **Aturan Bacad:** di BRI Super League, klub kuat → *Continental*, klub menengah → *Top Division*, klub lemah → *National*. Strata di bawahnya mengikuti logika sama tapi turun satu pita: klub kuat di Championship → *Top Division*, menengah → *National*, dst turun untuk Liga Nusantara dan Liga 4.
   - **Pengecualian:** klub besar/bersejarah yang sering main di strata tertinggi — termasuk **Gresik United (GUFC)** — reputasinya tetap *Top Division* meski levelnya sekarang di strata bawah, karena nama besarnya.
   - **Data anggaran pembanding (referensi kalibrasi, dari Bacad 22 Nov):**
     | Klub | Pita reputasi | Transfer Budget | Wage Budget |
     |---|---|---|---|
     | Manchester City | Worldwide | $217M | $7.92M/minggu |
     | Manchester United | Continental | $205M | $4.07M/minggu |
     | Everton | Top Division | $91.29M | $2.68M/minggu |
     | Gresik United (lama) | Obscure | $10.03K | $0/minggu |
   - Klub Indonesia yang dicatat Bacad sebagai pengecualian finansial/fasilitas (bukan sekadar ikut rata-rata strata): **Dewa United** (keuangan kaya), serta fasilitas latihan & akademi muda bagus di **Bali United, Persebaya, Persija, Dewa United** — perlu jadi klub "per-klub kuat" seperti `BIG` (Persib/Persija/Persebaya/Bali) di skrip, bukan ikut angka rata rata strata saja.
   - **Belum diketahui:** angka reputasi mentah (0–10.000) di balik pita *Top Division* dan *Continental* pada contoh Inggris di atas — editor hanya menampilkan nama pita, bukan angkanya. Titik acuan mentah yang sudah ada dari sesi sebelumnya: Man City 9150 (≈Worldwide), Brighton 7050, Kashima 6400, Persib pra-B7b 4300. Kalibrasi pita→angka perlu disempurnakan sebelum reputasi final klub IDN diputuskan.
   - **Rencana (gabung jadi B7c baru, tunggu "eksekusi"):** (1) status semua klub Liga Nusantara → profesional (1), Liga 4 tetap semi-pro (2); (2) reputasi dihitung ulang per klub mengikuti pita Continental/Top Division/National sesuai kekuatan & strata, dengan GUFC dan klub besar lain dikecualikan ke pita lebih tinggi; (3) kalau setelah reputasi dinaikkan anggaran bawaan masih $0, isi blok keuangan 68 byte langsung per klub dengan angka target (skala turun dari data Everton/Man Utd/Man City, disesuaikan realita ekonomi liga Indonesia, bukan disamakan mentah-mentah).
1c. **Belum masuk B7b (butuh format `people.dat`/`players.dat`/`non_players.dat` dibongkar penuh = B3):** 1.823 pemain dan 364 staf dari dataset, 9 pemain abroad baru (Mitchell Baker, Welber Jardim, dll.), kebangsaan Marukawa (sengaja tidak diubah: masih WNA dan main sebagai pemain asing Dewa United).
2. Youth intake: B7a menaikkan kandidat youth rating negara, menunggu uji youth intake berikutnya.
2b. **Permintaan baru Bacad (18 Nov):** youth intake setara Inggris (youth rating IDN → 19); semua klub punya anggaran (transfer, gaji pemain, manajer, staf) mendekati nilai asli sesuai strata dan klub besar/kaya; semua klub punya manajer dan pelatih mendekati data asli, plus banyak pilihan pelatih/staf Indonesia di bursa. Rencana: B7b (youth 19 + blok keuangan semua klub IDN setelah kalibrasi), B3s (bongkar `people.dat` dan staf, lalu tambah pelatih/staf asli).
2c. **Keputusan Bacad (18 Nov):** B7b ditunda dan digabung dengan B3 menjadi satu update besar: anggaran, youth 19, fasilitas, penonton, logo klub, pemain, manajer, pelatih, staf. Data dikumpulkan dulu ke `data/` (juga ke Project).
   - Status pengumpulan (sumber: Wikipedia, Nov 2026): `data/pemain_indonesia.csv` 875 pemain (Super League 18 klub lengkap; Championship 11 dari 20 klub), `data/staf_indonesia.csv` 247 staf (pelatih kepala semua klub Super League, Championship, Liga Nusantara; staf lengkap untuk klub yang ada halamannya).
   - (Selesai — lihat 5.4.) Sebelumnya belum ada skuad: Adhyaksa, PSGC, Persikad, Persiku, Persiraja, De Red, Deltras, Persiba, RANS, dan semua klub Liga Nusantara. Klub tanpa data akan diisi pemain buatan game.
   - Data Wikipedia kadang bertabrakan (pemain tercatat di dua klub, pelatih beda antara halaman klub dan halaman liga). Aturan yang dipakai: pelatih kepala ikut tabel liga 2026–27; pemain ganda dicatat di satu klub saja.
   - Atribut pemain (CA/PA, dll.) diperkirakan dari level klub, posisi, umur, dan status pemain asing/timnas.
   - Transfermarkt diblokir untuk alat web Claude (SITE_BLOCKED); Bacad mengisi data dari sana secara manual.
   - Template isian: `data/template_data_liga_indonesia.xlsx` (tab Panduan, Klub, Pemain, Staf, Daftar; skrip `scripts/build_template.py`). Hijau = sudah terisi, kuning = diisi Bacad. Kolom Pemain: kompetisi, klub, no, nama lengkap, nama tampilan, posisi umum/detail, tgl lahir, kebangsaan 1–2, tinggi, kaki, nilai pasar (Rp), kontrak, status pinjaman, timnas, catatan.
   - Paket isian per klub untuk Bacad: `data/data_klub_belum_lengkap.zip` (34 folder klub, masing-masing `data.txt` berformat `No | Nama | Posisi | Tgl lahir | Kewarganegaraan | Nilai pasar | Kontrak | Catatan` + bagian staf; 23 folder diberi penanda tempat `logo.png`). Bacad mengembalikannya dalam bentuk zip.
   - Gresik United: 30 pemain dari Wikipedia; pelatih Andik Ardiansyah.
   - Logo klub: gambar dari Bacad (aturan tetap). Cek `clubs_normal_config.xml`: 41 dari 64 klub IDN sudah punya logo (bawaan APK mod + Gresik di B6). 23 klub belum: Persikad, Persipa, Persikotas, Pesik, Batavia, Donggala, Persekat, Pekanbaru FC, Persikota, Putra Sang Fajar, Persitara, Persibangga, Persikutim, Persinab, Persiba Bantul, Perseden, Persinga, Pasuruan United, Persipani, PSN Ngada, Persid, PS Mojokerto Putra, Persikoba. Template tab Klub punya kolom "Logo di game" (Sudah/Belum).
   - Penghalang teknis: format `people.dat`/`players.dat`/`non_players.dat` belum dibongkar. Data baru bisa masuk game setelah itu.
3. ~~Make Request ke dewan kosong~~ — **selesai** (lihat 1d): sudah muncul normal walau status masih semi-pro, bukan karena status.
4. **Jatah AFC — KOREKSI BESAR (22 Nov malam): klaim pagi SALAH, dibuktikan Bacad langsung di game.** Klaim sebelumnya ("Indonesia tidak terdaftar sama sekali di `nation_list`, jatah AFC nol") **keliru** — Bacad kirim screenshot GUFC sedang bermain **Asian Champions League Two**, papan PLEASED ("on course to win"). Dicek ulang: `asi.xml` ternyata punya **4 daftar `nation_list` berbeda** (bukan satu); analisa pagi cuma mengecek satu list (kebetulan daftar wilayah "west" yang tidak memuat Indonesia) dan salah mengira itu satu-satunya gerbang keanggotaan. Indonesia ternyata **ADA** di daftar induk konfederasi (47 negara) dan di daftar wilayah "east" (22 negara). ACL Two sendiri bertipe **`cup_winners_cup`** (bukan liga koefisien seperti ACL Elite) — tim diambil lewat `get_main_cup_winner`, yaitu **juara piala domestik tiap negara**, bukan peringkat liga papan atas. Dugaan kuat (cocok dengan tampilan papan GUFC yang menandai Piala Liga Indonesia "Not important" = sudah selesai musim lalu): **GUFC masuk ACL Two karena juara Piala Liga Indonesia musim sebelumnya**, bukan dari posisi liga. Belum ditemukan rujukan UID eksplisit dari file Indonesia ke ACL Two — penautannya kemungkinan otomatis/generik per negara terdaftar, bukan manual. **Kesimpulan: jalur AFC lewat piala domestik SUDAH aktif di game Bacad sekarang**, bukan pekerjaan yang belum dieksekusi. Belum dicek: status Indonesia di ACL Elite dan ACGL. Detail: `research/format_specs/liga_kompetisi_award_afc.md` bagian 4 (koreksi) di repo `fmm27-pge-web`.
4b. **Liga U21/U18 Indonesia — dorman (22 Nov).** File developer asli (`sicomps/asia/idn/men/idn_u21_league_one/two.xml`, `idn_u18_league_one/two.xml`) sudah merancang liga U21 (18+24 tim) dan U18 (18+20 tim) dengan UID masing-masing 41053475/41053476/41058630/41058631. Dicek langsung ke `competition.dat` hasil build kita: **UID-UID ini tidak ada di database sama sekali.** Jadi ini rancangan SEGA yang belum pernah dibangun siapa pun (bukan cuma belum aktif) — kalau mau dipakai, ini pekerjaan baru selevel membangun Liga Nusantara dari nol, bukan sekadar menyalakan saklar.
4c. **Award (Player/Manager/Team of the Month, Week, Season) — struktur record DIBONGKAR (22 Nov malam).** `assets/data/game/awards.dat` (bagian dari `db_archive_2706.fmf`): header standar + **u32 jumlah record = 1.123**. Tiap record: `u32 idx` (urut, bukan UID) + `u32 award_id` (ID katalog SEGA, naik tidak selalu +1) + nama generik (mis. "Player of the Month") + byte pemisah `0xFF` + nama bermerek per liga (mis. "Sky Bet Championship Player of the Month") + byte pemisah `0xFF` + blok ekor 102 byte (sebagian UNKNOWN — tampak 3 slot riwayat bertahun, mayoritas `0xFFFFFFFF` kosong karena ini database awal musim). **"Team of the Week/Season" inilah yang berfungsi sebagai "Best XI"** — FMM tidak punya award terpisah bernama itu.
   - **Koreksi penting atas dugaan pagi:** `awards.dat` **tidak menyimpan UID kompetisi di dalam record-nya sama sekali** — dicek dengan mencari ke-6 UID kompetisi Indonesia (BRI Super League, Pegadaian Championship, Piala Indonesia, Piala Liga Indonesia, Liga Nusantara, Liga 4) sebagai raw bytes di seluruh 199.619 byte file, nihil, tidak satu pun cocok. Begitu juga string "Indonesia"/"BRI"/"Pegadaian"/"Nusantara"/"Liga 4" — nihil.
   - `award_id` ternyata adalah ID katalog award bawaan SEGA per liga resmi berlisensi (urutan 40 record pertama membuktikan ini: generik "Player of the Month" diikuti versi Premier League → Championship → League One → League Two secara berurutan, lalu lanjut ke liga Skotlandia, Denmark, Prancis, Belanda, dst) — **bukan tabel yang dirujuk lewat UID kompetisi**.
   - Sudah dicek juga `competition.dat` (`scripts/comp.py`) — parsernya mengonsumsi persis sampai byte terakhir tiap record, tidak ada field cadangan yang bisa jadi "kode grup award".
   - **Kesimpulan: penautan award↔kompetisi (kalau ada) kemungkinan besar hardcoded di `libgame.so`**, mengikuti tema yang sama seperti tabel negara-playable dan tabel-liga-terdalam yang sudah kita bongkar duluan — Indonesia hilang bukan karena data salah, tapi karena tidak terdaftar di tabel kecil yang di-hardcode SEGA. Menambah award lewat `awards.dat` saja (menambah record di ujung) **kemungkinan tidak akan cukup** tanpa riset lanjutan ke `libgame.so`. Status: **UNKNOWN (mekanisme penautan)**, **VERIFIED (struktur record, lokasi, dan ketiadaan rujukan Indonesia)**. Detail lengkap: `research/format_specs/liga_kompetisi_award_afc.md` bagian 3a di repo `fmm27-pge-web`.
4d. **Jadwal liga "lompat setahun" — TERBUKTI lewat screenshot Bacad (22 Nov malam), bukan cuma dugaan lagi.** Screenshot layar "Processing" GUFC: musim berakhir 12 Mei 2027, tapi musim berikutnya (Championship) baru mulai **20 Mei 2028 — selisih 374 hari**, padahal data aturan Championship bilang mulai Juli (harusnya ~2 bulan setelah musim sebelumnya berakhir, bukan 1 tahun lebih). Ada satu tahun kosong yang nyelip di antara dua musim untuk klub yang baru pertama kali masuk Championship.
   - **Dugaan kuat penyebab (HYPOTHESIS, belum dites):** semua kompetisi AFC (ACL Elite, ACL Two) yang sudah dibongkar punya file pasangan khusus musim-pertama (`_first_year.xml`) — dipakai sekali saja saat negara/tim baru pertama kali ikut kompetisi itu, supaya penarikan tim musim pertama tidak kacau. **Dicek: Championship dan Liga Nusantara buatan kita (`comp_idn_league_two*`, `comp_idn_league_three*`) sama sekali tidak punya file `_first_year` ini** (VERIFIED, tidak ada satupun di daftar entri `sicomps.fmf`). Dugaan: saat GUFC baru pertama kali naik ke Championship, game tidak menemukan aturan "musim pertama" yang semestinya ada, dan jatuh ke perilaku menunggu satu tahun penuh sebelum mulai. Belum dites — perlu dibuatkan file `_first_year` untuk Championship & Liga Nusantara lalu diuji langsung di game untuk memastikan.
   - ~~Dugaan lama (Piala Presiden bertabrakan dengan awal musim, menyebabkan papan kecewa sebelum liga mulai)~~ — **gugur**, screenshot papan ternyata penilaian akhir musim yang wajar (tim benar-benar sudah main semusim penuh di Championship dan gagal juara), bukan penilaian dini.
4d-2. **Fase 8-besar Liga Nusantara tanpa tabel — SELESAI DIJAWAB (22 Nov malam): bukan bug.** Dibongkar struktur stage `comp_idn_league_three_1439.dbc`: kompetisi ini punya 2 stage — Stage 0 = grup (3 grup A/B/C, punya tabel klasemen biasa) dan Stage 1 = "FINAL"/8-besar yang strukturnya `sdnr` (daftar babak diskrit) dengan hadiah menang/kalah per babak dan adu penalti — **ciri khas sistem GUGUR, bukan liga/grup**. Sistem gugur secara alami tidak punya tabel akumulasi poin. Jadi yang Bacad lihat kemungkinan besar **sesuai desain**, bukan bug — tinggal dicek apakah tampilan di HP memang berupa hasil bracket (bukan menu kosong). Bonus: field kualifikasi di stage ini menunjuk ke UID Pegadaian Championship, mengonfirmasi ulang pemenang final Liga Nusantara promosi ke Championship. Detail: `research/format_specs/liga_kompetisi_award_afc.md` bagian 6b.
4e. ~~Slot ACL2 untuk GUFC — dipastikan TIDAK ADA~~ **DIBANTAH, lihat koreksi item 4.** GUFC terbukti main ACL Two di game Bacad; kemungkinan besar lewat juara Piala Liga Indonesia (skema `cup_winners_cup`), bukan dari posisi liga/liga papan atas.
4f. **Slot ACL Elite lewat koefisien liga (22 Nov malam, atas permintaan Bacad).** `asi_champions_league.xml` (Comp ID 127286) memakai sistem **koefisien 8-musim berbobot** (`number_of_years_for_coefficients: 8`, bobot musim terbaru 1.0 turun ke 0.3 di musim ke-8) untuk menentukan dari bracket kualifikasi mana wakil tiap negara mulai (`wc4t`/`wc6t`/`wc8t`, dibagi region West/East) — bukan jatah tetap per negara, dan negara berkoefisien lebih tinggi main di kandang saat undian. Karena daftar negara yang dipakai kompetisi ini berasal dari mesin yang sama dengan ACL Two (sudah dibuktikan memuat Indonesia), **kemungkinan besar Indonesia juga sudah ada di kolam kualifikasi ACL Elite**, hanya start dari bracket paling bawah karena koefisiennya masih kosong/rendah (HYPOTHESIS, belum dicek langsung di game). **Jawaban untuk rencana Bacad:** ya, menaikkan koefisien liga (lewat hasil klub Indonesia di ACL Two/Challenge League, terakumulasi 8 musim) memang jalurnya yang benar — tidak ditemukan cara pintas lain di data. Ambang angka pindah-bracket tidak ada di XML (kemungkinan dihitung di `libgame.so` saat runtime, lintas-negara). Detail: `research/format_specs/liga_kompetisi_award_afc.md` bagian 7.
5. **Anggaran transfer serta gaji pelatih dan staf** semua klub.
6. **Liga cadangan dengan promosi/degradasi sendiri**: contoh dari negara lain (Inggris).
7. B3: pemain asli, pemain Indonesia di luar negeri (lihat 5.6: 9 orang baru, 13 UID ke daftar muat `fmm_people` IDN, opsi kebangsaan Noah Adnan/Marukawa), impor pemain dari Excel di aplikasi editor.
7a. **Face pack dari modder lain (22 Nov malam).** Bacad mau pakai face pack modder lain (lengkap, tapi pemetaan wajah↔pemain banyak salah). Dibongkar `config.xml` di dalam `pictures_logos.fmf` modder (`custom/<N>` → `graphics/pictures/person/<UID>/portrait`, 86.440 entri) dan `people.dat`+nama dari `db_archive_2707.fmf` modder (165.059 orang, format `people_scan.py` terbukti jalan di data ini juga). 1.940 orang berkebangsaan Indonesia (nation idx 58, sama dengan punya kita), 1.573 di antaranya punya wajah di config. Dicocokkan nama persis dengan `data/pemain_indonesia_v2.csv`: **450 dari 1.821 pemain cocok** → file `data/pemain_uid_wajah_match.csv` (nama, klub, kompetisi, UID modder). **Rencana:** saat B3 (impor pemain asli), 450 pemain yang cocok ini pakai UID yang sama persis dengan modder, supaya wajahnya otomatis nempel tanpa menyentuh `pictures_logos.fmf` modder sama sekali (tinggal pasang file PNG wajahnya saja ke `pictures_logos.fmf` Bacad sendiri dengan UID yang sama). Sisa 1.371 pemain tidak match (beda penulisan nama atau memang tidak ada di data modder) — pakai wajah buatan game seperti biasa.
8. Belum diuji: 8 besar, final, playoff, dan pembagian grup musim kedua. ~~(pengunci grup hanya berlaku 2026)~~ — dugaan ini gugur, lihat 4d.
9. **Bug jadwal lompat setahun (lihat 4d, tunggu "eksekusi"):** buat file `_first_year.xml` untuk Championship (`comp_idn_league_two`, `comp_idn_league_two_groups`) dan Liga Nusantara (`comp_idn_league_three`, `comp_idn_league_three_group_a`, `comp_idn_league_three_groups_bc`), ikut pola file AFC (`asi_champions_league_first_year.xml`, `asi_champions_league_2_first_year.xml`) yang sudah ada. Build ulang `sicomps.fmf`, kirim ke Bacad, dan uji langsung: mainkan GUFC sampai naik ke Championship, cek apakah musim berikutnya mulai normal (~Juli, bukan lompat setahun).

## 11. Skrip (folder `scripts/`, Python 3 + `zstandard`)

| Skrip | Fungsi |
|---|---|
| `fmfio.py` | baca/tulis kontainer `.fmf` |
| `fmftoc.py`, `unfmf*.py`, `unbundle.py` | bongkar arsip |
| `club.py` | parser `club.dat` |
| `comp.py` | parser `competition.dat` |
| `riv.py` | parser `rivalries.dat` |
| `fmmdat.py`, `fmmlists.py` | daftar `fmm_*.dat` |
| `dbc.py` | parse/build entri `comps.dbc` |
| `dbcarc.py` | muat `comps.dbc` dari `sicomps` |
| `dbcshow.py` | tampilkan pohon entri |
| `build_b2*.py` … `build_b6b_db.py` | pembangun tiap putaran (berurutan: sumber setiap putaran adalah keluaran putaran sebelumnya) |

Alur umum perubahan:
1. `fmfio.read`
2. Ubah file atau entri
3. `fmfio.write`
4. Bungkus zip dengan struktur `assets/...`
5. Bacad mengganti file di APK (**Store**), sign, install, lalu buat karier baru

Catatan jalur: skrip memakai jalur absolut `/home/claude/scripts`, `/home/claude/out/putaranXX/...`. Sesuaikan kalau dijalankan di tempat lain.

Dokumen rinci per putaran ada di Project "Football Manager" (folder `claude/`).

## 12. Aplikasi editor PWA (rencana v6, 22 Nov 2026)
- Bacad akan membangun aplikasi editor berbasis browser (PWA, Chrome Android dulu, nanti bisa dibungkus jadi APK/EXE) lewat Claude Code + repo GitHub private `fmm27-pge-web`.
- Rencana lengkap: Project `claude/FMM27_PGE_RENCANA_V6.md` (= `PROJECT_CONTEXT.md` di repo). Starter repo: `fmm27-pge-web-starter.zip` (CLAUDE.md, rencana, langkah awal, salinan panduan ini, `scripts/`, `legacy/app/`, `data/`).
- Inti keputusan: dokumen ini + skrip Python = sumber kebenaran format; `fmmcore.js` di-port ke TypeScript (`src/core/`, bebas API browser, diuji di Node); setiap adapter wajib round-trip + golden test terhadap skrip Python.
- Tulis `.fmf` = tambal di ujung (pola B6/B7b). Dua jalur keluaran: arsip `.fmf` (Store) dan paket folder Documents.
- Urutan modul: Database Tools → Club Editor (target pertama: membuat B7c lewat aplikasi) → Competition/Load Lists/Stadium/Rivalry → Rules `comps.dbc` → Logo → Player/Staff (menunggu B3).
- Belum diketahui: ~~flag `sicomps.fmf`~~ (terjawab: 0; `comps.dbc` 3), apakah game menerima `db_archive` dengan TOC raw-frame (sudah terbukti untuk logo).
- **Kemajuan:** repo `github.com/BACOT-ASU/fmm27-pge-web` (private) sudah berisi starter v6 dan tersambung ke Graphify. **Sesi 01 selesai (22 Nov):** kerangka Vite 8 + React 19 + TS 6 + Tailwind 4 + PWA, `ByteSource`, antarmuka `FileIO`/`Store`, aturan ESLint `src/core` bebas API browser, tes core di Node, workflow GitHub Actions (lint/tes/build lulus). Terbit ke GitHub Pages belum jalan: Pages belum diaktifkan, dan untuk repo private butuh GitHub Pro (alternatif: repo publik tanpa `data/`, atau Cloudflare Pages/Netlify).
- **Sesi 02 selesai (22 Nov):** spesifikasi format dipecah per file di repo `research/format_specs/` (berlabel VERIFIED/LIKELY/HYPOTHESIS/UNKNOWN). Kontainer `.fmf` sudah di-port ke TypeScript (`src/core/fmf/`): baca flag 0 dan 3, tambal di ujung, arsip bersarang; diuji silang dengan `fmfio.py` (arsip hasil TS dibaca ulang oleh Python). Aplikasi sekarang bisa membuka `.fmf`, menampilkan flag + daftar entri, dan menghitung SHA-256 (untuk `input_manifest.md`). Perbaikan: frame zstd raw lama di `fmmcore.js` melanggar batas 128 KiB per blok untuk data besar; versi baru memecah blok.
- **Analisa liga/kompetisi/koneksi data/award/jatah AFC (22 Nov)** dituliskan ke repo di `research/format_specs/liga_kompetisi_award_afc.md`, dan ringkasannya ada di bagian 10 item 4/4b/4c panduan ini.
- **Aplikasi terbit (22 Nov):** `https://fmm27-pge-web.bcdsu1.workers.dev` (Cloudflare Worker static assets, terbit otomatis tiap push ke `main`; konfigurasi `wrangler.jsonc`). Bisa di-install dari Chrome HP.
- **Uji file asli pertama (22 Nov, HP Bacad):** `db_archive_2706.fmf` 149.842.446 byte, flag 0, 76 entri, SHA-256 `eb1d71647dd8de17ceaaf1b133a444717cda5268831c3ddbf4c1009f63bcf5cc`. Ukurannya beda dari B6b (149.841.844), jadi diduga versi B7b (perlu konfirmasi Bacad). Pembaca `.fmf` TypeScript terbukti membaca db asli. Dicatat di repo `research/format_specs/input_manifest.md`. Belum dicek: `sicomps.fmf`, `pictures_logos.fmf`.
- **Uji `sicomps.fmf` & logo (22 Nov):** `pictures_logos.fmf` 1.818.029.973 byte (= B7b), flag 0, 142.934 entri. `sicomps.fmf` 49.620.118 byte (diduga B7b; B6 = 49.619.693), awalnya gagal dibaca karena kolom waktu TOC sicomps > 2^53 (diduga FILETIME Windows; logo memakai detik Unix) — diperbaiki (waktu disimpan bigint, tidak ditimpa saat menambal). Setelah perbaikan: **sicomps flag 0, 1.489 entri; `comps.dbc` flag 3, 1.344 entri** (catatan lama 1.272 entri yang di-parse; selisih diduga `fixtures_N`). Pertanyaan flag terjawab. Menambal `comps.dbc` lewat aplikasi berarti jalur flag 3 (frame raw) yang belum diuji game.
- **Sesi 03 selesai (22 Nov):** adapter TypeScript `competition.dat` dan `club.dat` (baca, tulis ulang identik, ubah field tetap-ukuran seperti reputasi/status/fasilitas/penonton/divisi/stadion, ganti nama), diuji silang dengan `comp.py`/`club.py` lewat data sintetis. Aplikasi punya penjelajah database baca-saja: pilih negara → kompetisi → kartu klub. Uji dengan `db_archive` asli dilakukan Bacad di HP (tombol "Buka penjelajah database"). Ini fondasi Club Editor untuk B7c.
- **Uji penjelajah database dengan db asli (22 Nov, HP Bacad):** 1.683 kompetisi · 38.772 klub · 251 negara terbaca habis tanpa galat dalam 1,1 detik. 38.772 = 38.747 klub asli + 25 klon mod. Parser TypeScript `competition.dat`/`club.dat` terbukti pada data asli.
- **db di HP terkonfirmasi B7b (22 Nov):** kartu Gresik United FC di aplikasi = reputasi 1.500, semi-pro, fasilitas 5/4, penonton 2.500 (1.000–7.000), stadion index 7212, skuad 0, staf 0/12, tanpa blok keuangan — persis hasil build B7b. Catatan: nama klub di db tertulis "Gresik United FC". Versi terpasang saat ini: db B7b (149.842.446 byte), sicomps B7b (49.620.118), logo B7b (1.818.029.973), libgame B2c.
- **Sesi 04 selesai (22 Nov):** Club Editor di aplikasi — edit status/reputasi/fasilitas/penonton per klub, ubah massal per kompetisi (mode samakan/lantai/atap), urung/ulang, lalu **Simpan**: (a) paket Documents zip (`db_archive_2706/club.dat` + `config.xml` sesuai resep 16 Nov + laporan), (b) `db_archive_2706.fmf` baru (tambal di ujung, wajib Store di APK), (c) laporan .txt. Hasil unduhan diuji: dibaca ulang oleh `club.py` dan `fmfio.py`. **Menunggu uji game:** ubah 1 reputasi Gresik → paket Documents → karier baru → cek angka. Ini juga menjawab apakah game menerima arsip/club.dat yang ditulis aplikasi.
- **Perbaikan pembaruan aplikasi (22 Nov malam):** Bacad melapor fitur edit belum muncul di HP. Dugaan: service worker menahan versi lama (mode prompt). Diganti autoUpdate (versi baru langsung aktif); footer aplikasi kini menampilkan versi build. Cara memaksa: tutup semua tab/aplikasi lalu buka lagi, atau Chrome → Setelan situs → Hapus data.
