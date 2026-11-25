# Update dari APK build sebelumnya (tanpa gabung ulang wajah & logo modder)

Dipakai kalau pictures_logos.fmf tidak berubah (cek daftar di zip patch). Wajah & logo modder di APK lama tetap dipakai.

1. Ekstrak zip patch (mis. `patch_v14_db.zip`) → `db_archive_2707.fmf`.
2. MT Manager → ketuk **APK mod terakhir yang sudah terpasang/ditandatangani** (yang pictures_logos-nya sudah digabung wajah modder) → **Lihat**.
3. Ganti HANYA file yang ada di zip patch, kompresi **Level Store**:
   - `assets/data/game/db_archive_2707.fmf`
   (kalau patch berisi `sicomps.fmf` → `assets/shared/data/`; `libgame.so` → `lib/arm64-v8a/`)
4. Simpan → **sign** dengan kunci yang sama seperti APK sebelumnya → pasang sebagai update (save game tetap ada).
   Kalau Android menolak update (tanda tangan beda), hapus aplikasi dulu (simpan save penting) lalu pasang.
5. Perubahan database baru terasa di **karier baru**.
