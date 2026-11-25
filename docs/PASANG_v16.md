# Pasang build v16 (Championship & Liga Nusantara satu kompetisi)

Isi `build_27.1.0_mod_v16.zip`:
| File | Tempat di APK |
|---|---|
| db_archive_2707.fmf (v16) | assets/data/game/ |
| sicomps.fmf (v8) | assets/shared/data/ |
| SHA256.txt, panduan ini | – |

libgame.so dan pictures_logos.fmf **tidak berubah** → wajah & logo modder tidak perlu digabung ulang.

## Langkah
1. Ekstrak zip dengan MT Manager.
2. MT Manager → ketuk **APK mod terakhir yang sudah terpasang** (v12/v13/v14/v15, yang wajahnya sudah digabung) → **Lihat**.
3. Ganti 2 file, kompresi **Level Store**:
   - `assets/data/game/db_archive_2707.fmf`
   - `assets/shared/data/sicomps.fmf`
4. Simpan → **sign** dengan kunci yang sama → pasang sebagai update.
5. Mulai **karier baru** (wajib; karier lama memakai aturan lama).

## Yang berubah
- **Pegadaian Championship = 1 kompetisi**: fase grup 2 × 10 (kandang-tandang, 18 laga) di dalam Championship. Juara grup → promosi + Champions Playoff (penentu juara). Peringkat 2 kedua grup → Promotion Playoff (pemenang promosi). Juru kunci tiap grup degradasi; peringkat 9 kedua grup → Relegation Playoff (yang kalah degradasi).
- **Liga Nusantara = 1 kompetisi**: fase grup 3 grup (23 klub, kandang-tandang) → 2 teratas tiap grup + 2 peringkat 3 terbaik → 8 besar (2 grup × 4) → final & perebutan tempat 3. 3 klub promosi.
- Pembagian grup **diatur game** (dugaan: menurut wilayah). Nama grup tidak lagi "Barat/Timur" atau "Grup A/B/C".
- Board & award dihitung per liga (Championship / Liga Nusantara), bukan per grup.
- Bali United: semua pemain & staf di tim pria (v14).

## Cek uji (kumpulkan sekaligus, beri nama sesuai nomor)
1. Layar mulai karier: Championship & Liga Nusantara muncul, bisa pilih klub (mis. Gresik). Screenshot daftar liga Indonesia.
2. Klasemen awal Championship & Liga Nusantara: berapa grup, isi tiap grup (wilayahnya masuk akal?).
3. Jadwal klubmu: laga fase grup mulai (Championship ± Sep, Liga Nusantara ± Nov) dan tidak "lompat setahun".
4. Selama musim: award Team of the Week / Monthly MVP / Manager of the Month Championship & Liga Nusantara muncul?
5. Board → Competitions: tertulis "Pegadaian Championship" / "Liga Nusantara" (bukan grup)?
6. Akhir fase grup Liga Nusantara: 8 besar berisi 8 tim (2 grup × 4), tabel tampil, lalu final & tempat 3 jalan (tidak macet).
7. Akhir musim Championship: Champions Playoff, Promotion Playoff, Relegation Playoff jalan; 3 klub promosi ke BRI Super League, 3 degradasi.
8. Awal musim 2: klub promosi/degradasi masuk liga yang benar, fase grup musim 2 jalan.
9. Kalau macet/crash: catat tanggal di game dan layar terakhir yang dibuka.

Kalau fase grup macet atau tidak jalan, bilang saja — bisa dikembalikan ke v15 lewat patch.
