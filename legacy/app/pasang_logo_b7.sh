#!/data/data/com.termux/files/usr/bin/sh
# Merakit pictures_logos.fmf B7b dari file B6 (yang sekarang terpasang) + tambalan 23 logo klub.
# Letakkan folder logo_b7 dan pictures_logos.fmf versi B6 di /sdcard/Download.
cd /sdcard/Download || exit 1
F=pictures_logos.fmf
UKURAN=$(stat -c %s "$F" 2>/dev/null)
if [ "$UKURAN" != "1815037846" ]; then
  echo "BERHENTI: $F harus versi B6 (1815037846 byte). Sekarang: $UKURAN"
  exit 1
fi
echo "Merakit... (sekitar 1-2 menit)"
( cat logo_b7/b7_header.bin; tail -c +27 "$F" | head -c 1806417674; cat logo_b7/b7_patch.bin ) > pictures_logos_b7.fmf
HASIL=$(stat -c %s pictures_logos_b7.fmf)
if [ "$HASIL" = "1818029973" ]; then
  echo "BERHASIL: pictures_logos_b7.fmf ($HASIL byte). Ganti nama jadi pictures_logos.fmf saat dimasukkan ke APK (Level STORE)."
else
  echo "GAGAL: ukuran hasil $HASIL, seharusnya 1818029973."
fi
