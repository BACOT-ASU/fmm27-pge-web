# Spesifikasi: logo `pictures_logos.fmf`

Sumber: panduan induk §8; `legacy/app/fmmcore.js` (`openLogos`, `buildLogoArchive`, `documentsConfig`), `scripts/mkpatch_b7.mjs`.

## Identifikasi
Asli mod 1.805.232.793 byte (142.874 file, flag 0); B6 1.815.037.846; B7b 1.818.029.973.

## Struktur — VERIFIED
- Peta: `pictures_logos/logos/{normal,small}/{clubs,comps}/config.xml`, record `<record from="custom/<ID>" to="graphics/pictures/<club|comp>/<ID>/logo"/>` (normal) atau `.../icon` (small).
- Gambar: `.../custom/<ID>.png`; normal 180×180 RGBA, small 25×18 RGBA.

## Aturan tulis — VERIFIED
- Tambal di ujung + `config.xml` baru + TOC raw (B6/B7b).
- **Wajib disimpan dengan Level "Store" di APK** (terkompresi → macet di splash).
- Paket folder Documents untuk logo: `documentsConfig` membuat `config.xml` dengan `from="club_<ID>"`; bukti pemakaiannya belum dicatat (LIKELY).

## Bukti
Logo Championship, Liga Nusantara, Gresik (B6), 23 klub (B7b) tampil di game.
