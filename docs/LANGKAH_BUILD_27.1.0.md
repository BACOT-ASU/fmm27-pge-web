# Langkah menjalankan build 27.1.0 mod (per 23 Nov 2026, db v7 / sicomps v4)

## File yang dipakai (versi terbaru)
| File | Kiriman | SHA-256 (awal) | Tempat di APK |
|---|---|---|---|
| db_archive_2707.fmf | `db_archive_2707_27.1.0_mod_v7` (.z01, .z02, .zip) | 4f9b0d1f… | assets/data/game/ |
| sicomps.fmf | `sicomps_27.1.0_mod_v4.zip` | 1a05f9d8… | assets/shared/data/ |
| pictures_logos.fmf | `pictures_logos_27.1.0_mod` (.z01, .zip) — lalu digabung wajah & logo (langkah 3) | e04a0cb4… (sebelum gabung) | assets/data/game/ |
| libgame.so | `libgame_27.1.0_mod.zip` | 53dde79e… | lib/arm64-v8a/ |
| peta_aset_27.1.0.csv | dipakai di aplikasi (langkah 3) | – | – |
Versi lama (db v1–v6, db uji keuangan, sicomps v1–v3, peta_wajah*.csv) tidak dipakai lagi.

## 1. Ekstrak
1. Taruh semua bagian satu zip dalam satu folder (mis. `.z01`, `.z02`, `.zip` milik db).
2. Buka file `.zip` dengan MT Manager → ekstrak. Lakukan untuk db, sicomps, pictures_logos, libgame.
3. (Opsional) cek SHA-256 dengan `SHA256_v9.txt`.

## 2. Perbarui aplikasi web
Buka aplikasi di Chrome, tutup–buka sampai versi di footer berganti.

## 3. Gabung wajah & logo (di HP)
1. Bagian File → slot **Logo** → pilih `pictures_logos.fmf` hasil build (langkah 1).
2. Tab **Wajah & logo** → **1.** pilih `pictures_logos.fmf` **modder** (1,42 GB).
3. **2.** pilih `peta_aset_27.1.0.csv`.
4. **3. Proses** → tunggu sampai 100 % (beberapa detik).
5. **4a. Simpan langsung** (ada persen; jangan tinggalkan Chrome, layar dijaga menyala) **atau 4b. Unduh lewat Chrome** (boleh ditinggal, progres di notifikasi). ±1,4 GB, beberapa menit.

## 4. Pasang ke APK ori 27.1.0 (MT Manager)
1. Buka APK ori 27.1.0 → ganti 4 file dengan **Level Store** (tanpa kompresi):
   - `assets/data/game/db_archive_2707.fmf`
   - `assets/shared/data/sicomps.fmf`
   - `assets/data/game/pictures_logos.fmf` (hasil langkah 3)
   - `lib/arm64-v8a/libgame.so`
2. Simpan, sign APK.
3. Install. Kalau ada versi lain terpasang dengan tanda tangan berbeda, hapus dulu.

## 5. Cek di game (karier baru)
Daftar lengkap untuk sekali main: `docs/CEKLIST_UJI_27.1.0.md`.
- Indonesia & Liga Nusantara ada di layar awal karier.
- Klub per liga: SL 18, Championship 10+10, Liga Nusantara 7+8+8, Liga 4 3.
- Pemain & staf baru muncul (pemain baru tercatat pemain, bukan manajer); nama klub asli (mis. AC Milan).
- Logo klub/kompetisi/timnas dan wajah pemain tampil.
- Award Indonesia (Best 11 of the Round, Team of the Week, Player of the Month).
- Reputasi klub (Club Details): Persib/Persija/Persebaya/Borneo/Bali/Dewa = Continental, PSM dkk. = Top Division, Liga Nusantara = Regional, Gresik = Top Division; Adjust Budgets tidak freeze (cek juga satu klub Liga 4).
- Akhir musim: juara → ACL Two, runner-up → Challenge League? jadwal musim ke-2 (lompat atau tidak, jumlah tim tiap grup).
Kalau macet di splash: hampir selalu karena file tidak disimpan dengan Level Store.
