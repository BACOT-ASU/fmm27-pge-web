# Spesifikasi: `competition.dat` (di `db_archive_2706.fmf`)

Sumber: panduan induk §4.1, §5.1; skrip `scripts/comp.py`; `legacy/app/fmmcore.js` `parseCompetitions`.

## Header — VERIFIED
8 byte header + u16 jumlah record (offset 8). Record mulai di offset 10.

## Field per record — VERIFIED (urutan berurutan, panjang bervariasi)
| Field | Tipe | Arti | Keyakinan |
|---|---|---|---|
| index | u16 | urut 0..n-1 | VERIFIED |
| uid | u32 | UID kompetisi | VERIFIED |
| nama panjang | u32 + teks + 1 byte | | VERIFIED |
| nama pendek | u32 + teks + 1 byte | dipakai kalau nama panjang tidak muat (21 huruf muat, 33 tidak) | VERIFIED |
| singkatan | u32 + teks | | VERIFIED |
| jenis | u8 | 0 liga utama, 1 liga bawah, 2 piala utama, 3 piala liga, 4 piala lain, 5 piala super, 8 liga cadangan, 21/22 kontinental, 28 amatir | VERIFIED |
| benua | u16 | 1 Asia, 2 Eropa, 3 Amerika Utara, 5 Amerika Selatan | VERIFIED |
| negara | i16 | index negara; −1 lintas negara | VERIFIED |
| warna | 4 byte | | LIKELY |
| reputasi | u16 | | VERIFIED |
| tingkat divisi | u8 | 100 untuk piala | VERIFIED |
| induk | i16 | index kompetisi induk; −1 tidak ada | VERIFIED |
| peserta | u32 N + N × (i32 UID klub, u16 tahun, u16 slot) | | LIKELY |
| sejarah | 3 × i32 (juara/runner-up/ketiga) + 3 × u16 tahun + u16 | | LIKELY |

Parser harus berakhir tepat di akhir file (cek kelengkapan).

## Relasi
- `club.dat` field divisi → **index** kompetisi.
- `comps.dbc` dan `fmm_comps` → **UID** kompetisi.
- Logo kompetisi → UID.

## Aturan tulis
- Kompetisi baru ditambahkan di ujung (index baru = n), jumlah di header ikut naik.
- Kompetisi baru juga harus didaftarkan di `sicomps/2700/fmm_comps.dat` (IDN-0/1/2) dan aturan `comps.dbc`.

## Bukti
Putaran A, B1, B4, B6, B6b (nama pendek Championship) → jalan di game.

## Status
Read/Write/Round-trip: VERIFIED (Python). Port TS: belum (Sesi 03).

## Unknown
Arti tepat blok peserta dan sejarah; warna.
