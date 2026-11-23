# Cara pasang build 27.1.0 mod (db v8 · sicomps v4 · libgame v2 · logo + timnas)

Semua bahan ada di satu file: **`build_27.1.0_mod_v8.zip`**.

## Isi zip
| File | Tempat di APK |
|---|---|
| db_archive_2707.fmf (v8) | assets/data/game/ |
| sicomps.fmf (v4) | assets/shared/data/ |
| pictures_logos.fmf (logo Indonesia + logo timnas, BELUM ada wajah modder) | assets/data/game/ (setelah langkah 3) |
| libgame.so (v2: Indonesia playable + nama AC Milan/Inter) | lib/arm64-v8a/ |
| peta_aset_27.1.0_v2.csv | dipakai di aplikasi (langkah 3) |
| SHA256.txt, CEKLIST_UJI_27.1.0.md, panduan ini | – |
Kiriman lama (db v1–v7, libgame v1, peta_aset v1, dll.) tidak dipakai lagi.

## 1. Siapkan
- APK **ori 27.1.0**, file `pictures_logos.fmf` **modder** (1,42 GB), ruang kosong HP ± 5 GB.
- Ekstrak `build_27.1.0_mod_v8.zip` dengan MT Manager ke satu folder, mis. `Download/build27`.

## 2. Perbarui aplikasi web
Buka aplikasi di Chrome → tutup–buka sampai kode versi di footer berganti.

## 3. Gabung wajah & logo modder (aplikasi web)
1. Bagian File → slot **Logo** → pilih `pictures_logos.fmf` dari zip.
2. Tab **Wajah & logo** → **1.** pilih `pictures_logos.fmf` **modder**.
3. **2.** pilih `peta_aset_27.1.0_v2.csv`.
4. **3. Proses** → tunggu 100 %.
5. **4b. Siapkan file** → jangan tinggalkan Chrome sampai 100 % → **Unduh sekarang**.
6. Hasil: `pictures_logos.fmf` (± 1,4 GB) di folder Download. Kalau namanya berakhiran `.txt`, hapus `.txt`.

## 4. (Opsional) Logo Liga Nusantara & Gresik United
Tab **Logo** → pilih klub/kompetisi → pilih gambar → Tambahkan → tab **Simpan** → **1. Siapkan** → **2. Unduh sekarang**. Pakai file hasil ini menggantikan hasil langkah 3.

## 5. Ganti isi APK (MT Manager)
1. Ketuk APK ori 27.1.0 → **Lihat**.
2. Ganti 4 file, pilih kompresi **Level Store**:
   - `assets/data/game/db_archive_2707.fmf`
   - `assets/shared/data/sicomps.fmf`
   - `assets/data/game/pictures_logos.fmf` (hasil langkah 3 atau 4)
   - `lib/arm64-v8a/libgame.so`
3. Keluar → simpan → **sign** APK.

## 6. Pasang & uji
1. Hapus FMM lain yang tanda tangannya beda (simpan save penting dulu).
2. Pasang APK hasil langkah 5. Macet di splash = ada file yang tidak disimpan dengan Level Store.
3. Karier baru → ikuti `CEKLIST_UJI_27.1.0.md`.
