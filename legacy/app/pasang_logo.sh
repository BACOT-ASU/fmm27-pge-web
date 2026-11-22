#!/data/data/com.termux/files/usr/bin/sh
# Merakit pictures_logos.fmf baru (B6) dari file lama + tambalan.
# Letakkan folder logo_b6 dan pictures_logos.fmf lama di /sdcard/Download.
cd /sdcard/Download || exit 1
F=pictures_logos.fmf
UKURAN=$(stat -c %s "$F" 2>/dev/null)
if [ "$UKURAN" != "1805232793" ]; then
  echo "BERHENTI: $F tidak ditemukan atau ukurannya bukan 1805232793 (sekarang: $UKURAN)."
  exit 1
fi
echo "Merakit... (sekitar 1-2 menit)"
( cat logo_b6/b6_header.bin; tail -c +27 "$F" | head -c 1804084040; cat logo_b6/b6_patch.bin ) > pictures_logos_b6.fmf
HASIL=$(stat -c %s pictures_logos_b6.fmf)
if [ "$HASIL" = "1815037846" ]; then
  echo "BERHASIL: pictures_logos_b6.fmf ($HASIL byte)."
  echo "Ganti nama jadi pictures_logos.fmf saat memasukkan ke APK."
else
  echo "GAGAL: ukuran hasil $HASIL, seharusnya 1815037846."
fi
