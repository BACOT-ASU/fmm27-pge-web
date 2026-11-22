# Kompetisi Indonesia: susunan, regulasi, dan sistem (FMM27 mod)

Diperbarui 18 Nov 2026. Dokumen ini berdiri sendiri. Ada dua sisi yang dibedakan:
- **Asli**: aturan liga Indonesia di dunia nyata, musim 2025/26 dan 2026/27.
- **Di game**: yang sudah dipasang di FMM27 lewat mod Bacad (putaran A s.d. B6b, B7a belum diuji).

File data pendamping (folder yang sama):
- `klub_indonesia.csv`: 77 klub (UID, kompetisi, stadion, status, fasilitas, penonton, logo, jumlah data).
- `pemain_indonesia_v2.csv`: 1.823 pemain, 64 klub.
- `pemain_indonesia_luar_negeri.csv`: 28 pemain Indonesia di luar negeri / diaspora calon timnas, dengan status di database game.
- `staf_indonesia_v2.csv`: 364 staf (275 di klub, 89 tanpa klub).
- `data_liga_indonesia_v2.xlsx`: isi yang sama dalam Excel (tab Panduan, Klub, Pemain, Staf).
- `logo_klub/`: 23 PNG logo dari Bacad, nama file `<UID>_<klub>.png`.

---

## 1. Piramida liga

| Strata | Asli | Di game (idx / UID kompetisi) | Status di game |
|---|---|---|---|
| 1 | BRI Super League, 18 klub | 1670 / 41004312, reputasi 164 | bisa dimainkan |
| 2 | Pegadaian Championship, 20 klub dalam 2 grup | induk 1671 / 41042740 (reputasi 115); Grup Barat 1672 / 41042741; Grup Timur 1673 / 41042742 | bisa dimainkan |
| 3 | Liga Nusantara (asli 2025/26: 24 klub, 4 grup) | induk 1678 / 41042746; Grup A/B/C 1679–1681 / 2000700101–103 | bisa dimainkan (perlu tambalan `libgame.so` B2c) |
| 4 | Liga 4 (regional) | 1682 / 41045091, 3 klub | tidak bisa dimainkan; hanya pelengkap Piala Indonesia |

Nama tampil di game: game memakai nama panjang kalau muat, kalau tidak nama pendek. Batas aman sekitar 21 huruf. Karena itu nama pendek grup Championship diubah menjadi "Pegadaian Champ Barat/Timur" (B6b).

## 2. BRI Super League

**Asli 2025/26:**
- 18 klub, kandang-tandang, 34 pekan. Musim dimulai 8 Agustus 2025.
- Tiga terbawah turun ke Championship (asli 2025/26: tiga klub degradasi, digantikan tiga klub promosi).
- **Pemain asing:** boleh daftar maksimal 11 orang tanpa batas kewarganegaraan. Hanya 9 yang boleh masuk Daftar Susunan Pemain, dan maksimal 7 di lapangan bersamaan. (Sempat 8 di DSP dan 8 main, lalu direvisi 28 Juli 2025 atas surat Ketua Umum PSSI.)
- **U-23:** ada kewajiban pemain U-23 (kelahiran 2003) dengan menit bermain minimal. Rinciannya di Lampiran 4 regulasi; aturannya sempat dikritik dan ada kabar dihapus.
- Operator: PT LIB, kini bermerek I.League. Regulasi diterbitkan PSSI.

**Di game:**
- 18 klub, aturan liga bawaan mod `fm27-idn` (belum diubah oleh Bacad).
- Kuota pemain asing dan aturan U-23 **belum** diatur di mod. Game memakai aturan bawaannya.
- Reputasi kompetisi 164.

## 3. Pegadaian Championship

**Asli 2025/26 dan 2026/27:**
- 20 klub dalam 2 grup wilayah (Barat dan Timur), 10 klub per grup.
- Tiga kali bertemu (triple round robin), total 27 laga per klub.
- Juara grup promosi ke Super League dan bertemu di final untuk gelar juara.
- Runner-up kedua grup main playoff promosi untuk 1 tiket tersisa.
- Peringkat 10 tiap grup langsung turun ke Liga Nusantara. Peringkat 9 kedua grup main playoff degradasi: yang kalah ikut turun.
- Musim 2026/27: mulai 11 September 2026, selesai 9 Mei 2027. Operator baru PT Liga Utama Indonesia (LUI) di bawah I.League.

**Di game (entri `comp_idn_league_two_groups_1442` dan induk `comp_idn_league_two_1442`):**
- Pola "grup sebagai liga mandiri" (meniru Serie C): tiap grup adalah liga sendiri, induk hanya berisi babak cup.
- Sabtu 12 Sep – 1 Mei, 3 putaran, 27 pekan.
- Tujuan peringkat: 1 → final + promosi, 2 → playoff promosi, 9 → playoff degradasi, 10 → turun (`relr` 1).
- Induk: tahap 0 = playoff promosi + final; tahap 1 = playoff degradasi.
- Daftar klub per grup dikunci (`crgt`/`gptm`) **hanya untuk 2026**. Musim berikutnya game mengundi sendiri (belum diuji).

## 4. Liga Nusantara

**Asli 2025/26:**
- 24 klub dalam 4 grup, 29 Nov 2025 – 8 Feb 2026. Klubnya berstatus **profesional** (keterangan Bacad); yang semi-pro hanya Liga 4.
- Tiga klub promosi ke Championship (2025/26: Dejan, PSGC, RANS Nusantara; juara RANS Nusantara).

**Di game (entri `comp_idn_league_three_*_1439`):**
- 23 klub dalam 3 grup: A 7 klub (2 lolos), B dan C 8 klub (3 lolos). Dua putaran, 7 Nov – 13 Feb.
- Penyederhanaan: aslinya "2 teratas + 2 peringkat ketiga terbaik"; di mod yang lolos adalah peringkat ketiga Grup B dan C.
- 8 besar: 2 grup × 4, satu putaran (27 Feb – 13 Mar).
- Juara grup 8 besar ke final (21 Mar) dan keduanya promosi. Runner-up ke playoff promosi (20 Mar) untuk 1 tiket.
- Agar strata 3 muncul di layar awal karier, `libgame.so` ditambal: alamat 0x7cb478 diubah dari 41042740 ke 41042746.

## 5. Liga 4
- Asli: kompetisi regional (Asprov), peringkat atas naik ke Liga Nusantara.
- Di game: 3 klub (Persid Jember, PS Mojokerto Putra, Persikoba Batu). Tidak bisa dimainkan; dipakai supaya Piala Indonesia punya peserta strata 4. Belum ada promosi/degradasi dari/ke Liga Nusantara.

## 6. Piala dan kompetisi lain

| Kompetisi | UID | Di game |
|---|---|---|
| Piala Indonesia | 7746536 | **Aktif**, 64 klub (`mxto` 64): Super League, 2 grup Championship, 3 grup Liga Nusantara, Liga 4. Reputasi 120. |
| Piala Liga Indonesia | 2000560926 | aktif |
| Piala Super Indonesia | 7746537 | ada di database |
| Piala Presiden | 2000189135 | **tidak dipakai** (keputusan Bacad) |
| Liga cadangan (Reserves) | `nation_idn_reserve_comps` | cadangan tiap strata (`rsvl` level 0/1/2), termasuk Grup 3. Ikut naik-turun bersama klub induk; belum punya promosi/degradasi sendiri. |
| Kompetisi AFC (ACLE, ACL Two, ACGL) | `sicomps/asia/` | jatah Indonesia belum diatur. |

## 7. Klub per kompetisi (musim 2026/27 di game)
Rincian lengkap per klub ada di `klub_indonesia.csv`.

- **BRI Super League (18):** Arema, Bali United, Bhayangkara Presisi Lampung, Borneo, Dewa United, Garudayaksa, Isenmulang Kalteng, Java United, Madura United, Persebaya, Persib, Persija, Persijap, Persik, Persita, PSIM, PSM, PSS.
- **Championship Grup Barat (10):** Adhyaksa FC Bekasi, Persikad Depok, Persiku, Persiraja, PSGC Ciamis, PSIS, PSMS, PSPS, Semen Padang, Sumsel United FC.
- **Championship Grup Timur (10):** Barito Putera, De Red FC, Deltras FC, Kendal Tornado, Persela, Persiba Balikpapan, Persipura, Persis, PSBS, RANS Nusantara.
- **Liga Nusantara Grup A (7):** Pekanbaru FC, Persitara, Persikota, Batavia, Persikotas Nusantara, Pesik Kuningan, Persekat Tegal.
- **Liga Nusantara Grup B (8):** Gresik United (klub Bacad, UID 2000700017), Persiba Bantul, Persibangga Purbalingga, Persibo, Persika Karanganyar, Persinga Ngawi, Persipa Pati, Putra Sang Fajar FC.
- **Liga Nusantara Grup C (8):** Donggala United FC, Pasuruan United, Persekabpas, Perseden, Persinab Nabire, Persipani Paniai, Persikutim United, PSN Ngada.
- **Liga 4 (3):** Persid Jember, PS Mojokerto Putra, Persikoba Batu.
- **Dikeluarkan dari liga (divisi −1):** Persibas, Waanal Brothers, Perserang. Masih ada di database tapi tidak ikut liga.

Klub buatan mod (klon dengan nama baru): 2000700017 Gresik United, 2000700019 Persikad Depok, 2000700020 Pasuruan United, 2000700021 Persipani Paniai, 2000700022 PSN Ngada, 2000700023–25 klub Liga 4.

## 8. Sistem klub di database (yang memengaruhi permainan)

| Hal | Letak di `club.dat` | Kondisi sekarang | Rencana update besar |
|---|---|---|---|
| Status klub | blok misc byte 0: 1 pro, 2 semi-pro, 3 amatir | lihat kolom `status` di CSV | sesuaikan per strata |
| Fasilitas latihan / akademi | blok misc byte 1 / 2 | banyak klub kecil bernilai rendah | naikkan per tingkat |
| Penonton rata / min / maks | blok misc i16 ×10 | banyak klub 250 / 100 | dibuat realistis |
| Stadion | u16 index di `o_div+5` (65535 = tidak ada) | 28 klub diberi stadion di B7a (belum diuji) | ikut B7a |
| Keuangan | blok 68 byte setelah flag; klub Asia umumnya kosong | hanya beberapa klub punya | isi semua klub (perkiraan proporsional, klub besar lebih kaya) |
| Staf | 12 slot i32 | rata-rata Super League 0,7 staf per klub | isi dari `staf_indonesia_v2.csv` |
| Skuad | daftar i32 | sebagian klub bawaan, sisanya pemain buatan game | isi dari `pemain_indonesia_v2.csv` |

Youth intake: ditentukan "youth rating" negara di `nation.dat` (Inggris 19, Jepang 13, Korea 12, China 10, Indonesia 1). B7a menaikkan ke 10; permintaan Bacad berikutnya **19 (setara Inggris)**.

## 9. Aturan pengisian data (yang dipakai di CSV)

**Pemain:**
- Sumber prioritas: Transfermarkt (screenshot dari Bacad) menang atas Wikipedia.
- Posisi memakai kode FM: GK, DL, DC, DR, DM, ML, MC, MR, AML, AMC, AMR, ST. Kolom `posisi_lain` berisi posisi tambahan.
- Kewarganegaraan kode 3 huruf; ganda ditulis `IDN/BRA`.
- Data kosong dikarang (permintaan Bacad), ditandai di kolom `perkiraan`:
  - tanggal lahir: dari umur, atau umur acak 20–30 (kiper 21–31);
  - nilai pasar (juta Rp): klub besar SL 800–3.500; SL 300–2.200; Championship 100–900; Liga Nusantara 25–250; Liga 4 10–100. Umur <20 ×0,5; >32 ×0,6; asing ×1,8;
  - kontrak: 31 Mei 2027 (kadang 2028).

**Staf:**
- Slot mengikuti reputasi klub (aturan game: makin kecil reputasi, makin sedikit slot): Persib, Persija, Persebaya, Bali United 10; Super League lain 7; Championship 4; Liga Nusantara 3; Liga 4 2.
- Isi satu orang per jabatan dulu (pelatih kepala, asisten, pelatih kiper, fisik, fisioterapis, dokter, analis), baru tambahan.
- Yang tidak dapat slot berstatus "Tanpa klub", tetap dimasukkan sebagai staf bebas di bursa.
- Satu orang hanya dipakai di satu klub.

## 10. Status penerapan ke game

| Bagian | Status |
|---|---|
| 3 strata + grup + playoff | terpasang (B5b, B6) |
| Piala Indonesia 64 klub, Liga 4, cadangan | terpasang (B6) |
| Logo kompetisi + Gresik | terpasang (B6) |
| Nama pendek Championship | dikirim (B6b) |
| Stadion 28 klub, youth 10 | dikirim, belum dipasang (B7a) |
| Youth 19, keuangan, fasilitas, penonton, 23 logo, pemain, staf | menunggu bongkar format `people.dat`, lalu dibangun setelah Bacad bilang "eksekusi" |
| Kuota pemain asing / U-23 | belum |
| Jatah AFC | belum |
| Liga cadangan dengan promosi/degradasi sendiri | belum |
| Uji 8 besar, final, playoff, musim kedua | belum |
