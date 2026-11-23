# Spesifikasi: `club.dat` (di `db_archive_2706.fmf`)

Sumber: panduan induk §4.2, §4.2a, §4.2b, §5; skrip `scripts/club.py`; `legacy/app/fmmcore.js` `parseClubs` (hanya melewati sebagian field).

## Header — VERIFIED
8 byte header + u32 jumlah record (offset 8). 38.747 record terbaca habis sampai byte terakhir (db asli mod).

## Field per record (berurutan) 
| No | Field | Tipe | Arti | Keyakinan |
|---|---|---|---|---|
| 1 | penanda, uid | i32 −1, u32 | | VERIFIED |
| 2 | nama | nama panjang (u32+teks+1), nama pendek (u32+teks+1), nama 6 huruf, kode 4 huruf, kode 3 huruf (u32+teks) | | VERIFIED |
| 3 | negara | 2 × i16 | pertama = negara liga tempat bermain, kedua = negara asal | VERIFIED |
| 4 | warna & kit | 12 byte + 132 byte (6 × (2 + 10 × u16)) | | LIKELY (opaque) |
| 5 | blok 10 byte | u8 status (1 pro, 2 semi-pro, 3 amatir), u8 fasilitas latihan (1–20), u8 fasilitas akademi (1–20), i16 penonton rata-rata, i16 min, i16 maks (×10), u8 (0/1/2, belum jelas) | | VERIFIED (u8 terakhir UNKNOWN) |
| 6 | divisi | i16 | index kompetisi; −1 tanpa liga | VERIFIED |
| 7 | 5 byte | i16 divisi kedua, 1 byte, u16 index stadion (65535 = tidak punya) | di `club.py` bernama `rep` | VERIFIED (byte tengah UNKNOWN) |
| 8 | divisi musim lalu | i16 | | LIKELY |
| 9 | flag keuangan | u8 | 1 → disusul blok 68 byte | VERIFIED (struktur) |
| 9a | blok keuangan | 68 byte | lihat di bawah | HYPOTHESIS (arti) |
| 10 | blok 12 byte | u32 (8) + 8 byte | panjang variabel `k` di fmmcore | LIKELY |
| 11 | blok 23 byte | u8 (peringkat musim lalu?), **u16 reputasi (0–10.000)**, i32, i32, 3 × i32 | | reputasi VERIFIED, sisanya UNKNOWN |
| 12 | daftar | u16 N + N × 21 byte | | UNKNOWN (opaque) |
| 13 | skuad | u16 jumlah + jumlah × i32 **nomor urut people.dat** (bukan UID; koreksi 23 Nov) | pemain yang tidak ada di sini masuk tim cadangan | VERIFIED |
| 14 | staf | 12 × i32 nomor urut people.dat: 0–3 pelatih (0 umumnya asisten), 4 kosong, 5–7 scout, 8–10 physio, 11 bukan staf | staf yang tidak ada di slot tidak tampil di halaman Staff klub | VERIFIED (23 Nov) |
| 15 | blok akhir | 77 byte (u32, 27 byte, 44 byte, u16) | | UNKNOWN (opaque) |

Letak reputasi: `o_div + 10 (+68 kalau flag) + 4 + k + 1`.

### Blok keuangan 68 byte — HYPOTHESIS
| Offset | Isi | Contoh |
|---|---|---|
| 0 | u8 02 + 6 byte nol | |
| 7 | f32 A (juta) | Man City 125,5 |
| 11 | u32 B | |
| 15 | u32 C | |
| 19 | u32 D = A × 1000 | |
| 23 | u32 E (ribuan) | Man City 263.500 |
| 27 | u8 10 + 10 × u32 | |
Klub Asia: blok kosong / tidak ada; game mengarang keuangan sendiri (LIKELY dari reputasi + status + penonton).

## Relasi
- divisi → index `competition.dat`; index stadion → index `stadium.dat`; `rivalries.dat` → **urutan** klub di `club.dat`; pemain/staf → nomor urut `people.dat` (skuad & slot staf), dan people.club_index → urutan klub.
- Jumlah record tiap `.lng` = jumlah klub.

## Aturan tulis
- Memindah klub: timpa negara + divisi (ukuran tetap). VERIFIED.
- Klub baru: klon record lain, tambah **di ujung**, nama ditambah di ujung tiap `.lng` (16 bahasa), daftarkan di `fmm_clubs` IDN-0/1/2. VERIFIED.
- Reputasi, status, fasilitas, penonton: timpa di tempat (ukuran tetap). VERIFIED (B7b).

## Bukti / temuan penting
- B7b: reputasi/status/fasilitas/penonton diubah → game jalan.
- Uji 1d (22 Nov): Adjust Budgets freeze terjadi karena anggaran awal $0 (reputasi terlalu rendah), bukan status klub.
- Pita reputasi di editor dalam game: Worldwide > Continental > Top Division > National > Regional > Local > … Obscure. Rentang TERBUKTI (23 Nov, screenshot Bacad): Local 2800–2900, Regional 4300–4600, National 5000–5500, Top Division 6400–6900, Continental 8150, Worldwide 9150. Batas tepat UNKNOWN.
- Anggaran awal klub Asia dihitung game walau blok keuangan kosong; nilainya tidak hanya dari reputasi (LIKELY juga liga/negara/penonton).

## Status
Read/Write: VERIFIED (Python `club.py` + skrip build). Port TS: **selesai Sesi 03** — `src/core/formats/club/clubDat.ts` (`parseClubDat`, `serializeClubDat`, `withClubField` untuk 13 field tetap-ukuran, `withClubNames`, `validateClubDat`). Batas kewajaran sama dengan `club.py`. Di `club.py` field `rep` sebenarnya index stadion; reputasi ada di blok 23 byte (`repBlock + 1`).
