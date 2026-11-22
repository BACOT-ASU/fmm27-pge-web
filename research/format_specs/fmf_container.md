# Spesifikasi: kontainer `.fmf`

Sumber: panduan induk §3; kode acuan `scripts/fmfio.py`, `legacy/app/fmmcore.js`; port TS `src/core/fmf/`.

## Identifikasi
Dipakai oleh `db_archive_2706.fmf`, `sicomps.fmf`, `pictures_logos.fmf`, dan arsip bersarang di dalamnya (`comps.dbc`, `2700/fmm_*.dat`).

## Header (26 byte) — VERIFIED
| Offset | Tipe | Isi |
|---|---|---|
| 0 | 9 byte | magic `02 01 66 6d 66 2e 08 00 00` (`..fmf.` + `08 00 00`) |
| 9 | u64 | X — TOC ada di offset `9 + X`; panjang area data = `X − 17` |
| 17 | u64 | selalu 17 |
| 25 | u8 | flag: 0 atau 3 |

Data entri dimulai di byte 26. Offset entri di TOC relatif terhadap byte 26.

## TOC — VERIFIED
Di offset `9 + X`: magic 9 byte lagi, lalu:
- **flag 0**: rangkaian `[u32 panjang + frame zstd]` sampai akhir file. `fmfio.py` menulis satu frame (zstd level 19, window log 23, checksum on); `fmmcore.js`/B6 menulis potongan 131.072 byte per frame raw. Keduanya terbukti diterima game (B6/B7b untuk logo).
- **flag 3**: frame zstd langsung setelah magic (tanpa u32 panjang).

Isi TOC setelah dekompresi (rekursif, little-endian):
```
folder := str nama, u32 nFile, nFile × file, u32 nSub, nSub × folder
file   := str nama, str ekstensi (dengan titik), u64 offset, u64 ukuranTersimpan, u64 ukuranAsli, u64 waktu1, u64 waktu2
str    := u32 panjang + UTF-8
```
Jalur entri ditulis `akar/sub/nama.ext` (nama folder akar ikut).

## Isi entri — VERIFIED
- flag 0: isi mentah; `ukuranTersimpan == ukuranAsli`.
- flag 3: setiap entri = satu frame zstd (`fmfio.get` → `zd(blob)`).

## Arsip bersarang — VERIFIED
`.dat`/`.dbc` di dalam `sicomps.fmf` = prefix 8 byte + kontainer `.fmf`:
- `03 01 "tad." 01 00` atau `03 01 "cbd." 04 00`.
Catatan: `scripts/fmmlists.py` mencari magic zstd di 8 byte pertama tiap entri (heuristik); `fmfio.py` menganggap seluruh blob = frame. Ikuti `fmfio.py` sampai ada bukti lain.

## Aturan tulis
- Urutan file di TOC tidak harus mengikuti offset → file baru aman ditambah di ujung data. VERIFIED.
- **Tambal di ujung** (`src/core/fmf/patchFmf.ts`): header (X baru) + data lama apa adanya + isi baru + magic + TOC baru. VERIFIED untuk `pictures_logos.fmf` flag 0 (B6, B7b). **UNKNOWN** untuk `db_archive_2706.fmf` dan `sicomps.fmf` → uji di Fase 5.
- Frame raw (blok tanpa kompresi, maks 128 KiB per blok) adalah zstd sah. VERIFIED diterima game untuk TOC logo. Untuk isi entri flag 3: HYPOTHESIS.
- Kemas ulang penuh dengan `fmfio.write` (zstd 19) = identik byte demi byte dengan asli. VERIFIED.

## Bukti
- B6/B7b: `pictures_logos.fmf` ditambal (raw TOC) → game jalan (setelah disimpan dengan Store di APK).
- Semua putaran A–B7b memakai `fmfio.write` untuk db dan sicomps → game jalan.
- Tes: `tests/fmf.test.ts` (golden dari `scripts/golden/make_fmf_fixtures.py`, termasuk arsip hasil TS dibaca ulang oleh `fmfio.py`).

## Status
Read: VERIFIED (flag 0 & 3) · Write (tambal): VERIFIED logo, UNKNOWN db/sicomps · Round-trip TOC: identik.

## Unknown
- Arti byte `08 00 00` di akhir magic (mungkin versi). Diperlakukan sebagai bagian magic.
- Flag selain 0 dan 3 (ditolak).
- Flag `sicomps.fmf` dan isi `fmm_*.dat` (flag 0/3) → **cek dengan aplikasi** (layar "Arsip .fmf").
