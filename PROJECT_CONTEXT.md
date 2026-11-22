# FMM27 Pre-Game Editor — Aplikasi Browser (PWA) — v6

> Dokumen konteks untuk sesi Claude / Claude Code. Simpan di root repo sebagai `PROJECT_CONTEXT.md`.
> **Fungsi aplikasi: ambil file → baca → edit → simpan file hasil edit.**
> v6 = rencana v5 digabung dengan hasil kerja mod Indonesia (panduan induk 22 Nov 2026, skrip Python, `fmmcore.js`).
> Prinsip inti tetap: **EVIDENCE FIRST. Jangan mengarang field, offset, format, atau klaim kompatibilitas.**
> Sumber kebenaran format: `research/format_specs/fmm27_panduan_induk.md` (salinan panduan induk) + skrip di `scripts/`.

## 0. Apa yang berubah dari v5

Analoginya begini: v5 itu rencana membangun rumah sambil menunggu hasil survei tanah. Ternyata surveinya sudah selesai sebagian besar: fondasinya sudah diuji, malah sudah ada satu kamar yang dihuni (editor logo). Jadi v6 tidak mulai dari nol. Kerjanya memindahkan yang sudah terbukti ke kode yang rapi, lalu menambah kamar sesuai kebutuhan mod Indonesia.

| Perubahan | Bagian |
|---|---|
| Status: sebagian besar format sudah **VERIFIED** lewat uji di game (B2c–B7b) | 2 |
| Spesifikasi tidak menunggu sesi lain: diambil dari panduan induk bagian 3–8 | 3 |
| `fmmcore.js` + skrip Python jadi kode awal, di-*port* ke TypeScript | 4.1, 4.7 |
| Dua jalur keluaran: file `.fmf` utuh (untuk APK, wajib Store) **dan** paket folder Documents (tanpa bongkar APK) | 4.5 |
| Strategi tulis "tambal di ujung" (append + TOC baru) yang sudah terbukti di logo | 4.5 |
| Urutan modul diubah: **Club Editor dulu** (untuk B7c), bukan Player Editor | 5, 10 |
| Validator khusus FMM27 dari pelajaran B1–B7 (`.lng`, `fmm_*.dat`, `comps.txt`, anggaran $0, dll.) | 6.1 |
| Player/Staff Editor menunggu B3 (`people.dat`, `players.dat`, `non_players.dat` belum dibongkar) | 2, 10 |
| `libgame.so` tetap di luar lingkup edit, tapi aplikasi bisa **memeriksa** tabelnya (read-only) | 1, 5 |
| Graphify jadi opsional: Claude Code tetap jalan tanpa itu | 7 |

## 1. Tujuan dan lingkup

**Dalam lingkup**
- PWA di Chrome Android, offline, semua proses lokal (tanpa server, tanpa upload).
- Membuka tiga arsip: `db_archive_2706.fmf` (database), `sicomps.fmf` (aturan kompetisi + daftar muat), `pictures_logos.fmf` (logo, 1,8 GB).
- Parse ke model internal → tampilkan → cari/filter → edit → validasi → simpan.
- Keluaran: file `.fmf` utuh, atau paket folder Documents (`.dat` + `config.xml`).
- Round-trip test untuk setiap format yang bisa diedit.
- Impor data dari CSV/Excel (dataset `data/*.csv` yang sudah dikumpulkan).

**Target platform (bertahap):** Chrome Android (PWA) → browser desktop dari kodebase yang sama → (opsional) bungkus Capacitor (APK) / Tauri atau Electron (EXE). **Satu kodebase web.**

**Di luar lingkup**
- Memasukkan file ke APK, sign, install (dikerjakan Bacad dengan MT Manager).
- Mengubah `libgame.so` (cukup dicatat di dokumentasi; aplikasi hanya boleh membaca dan menampilkan tabelnya).
- Reverse engineering format baru (dikerjakan di sesi analisis, hasilnya masuk ke `research/format_specs/`).
- Server, akun, cloud.

## 2. Status proyek (per 22 Nov 2026)

**VERIFIED — terbukti lewat round-trip dan/atau uji di game**
| Format | Bukti | Skrip/kode |
|---|---|---|
| Kontainer `.fmf` flag 0 (header 26 byte, TOC zstd) | round-trip identik (zstd 19); tambalan TOC raw-frame diterima game (B6, B7b) | `fmfio.py`, `fmmcore.js` |
| `competition.dat` | parse sampai byte terakhir; edit nama/induk/jenis jalan di game | `comp.py`, `fmmcore.js` |
| `club.dat` (negara, divisi, status, fasilitas, penonton, stadion, reputasi; klon di ujung) | 38.747 record terbaca habis; B7b jalan | `club.py` |
| `rivalries.dat` | derby Persija–Persib jalan | `riv.py` |
| `stadium.dat` | 12.509 record | `stadium.py` |
| File `.lng` (16 bahasa, jumlah = jumlah klub) | klub baru tampil | (di skrip build) |
| `comps.dbc` (parse/build 1.272 entri identik; pola grup-sebagai-liga) | B5b benar semua | `dbc.py`, `dbcarc.py` |
| `sicomps/2700/fmm_*.dat` (daftar muat per negara) | B6, B7b | `fmmlists.py` |
| Logo (`config.xml` + PNG di `custom/`) | B6, B7b; aplikasi editor logo jalan | `fmmcore.js`, `mkpatch_b7.mjs` |
| Jalur Documents untuk `.dat` database | terbukti per file | panduan 2 |

**LIKELY / HYPOTHESIS**
- `nation.dat` youth rating (B7b: IDN 19), belum terbukti sampai youth intake diuji.
- Blok keuangan klub 68 byte: arti A/B/C/D/E masih dugaan.
- Pita reputasi (Worldwide/Continental/Top Division/National/Obscure) ↔ angka 0–10.000: belum dikalibrasi.
- Anggaran awal klub dihitung game dari reputasi + status + penonton (LIKELY, dari uji 1d).

**UNKNOWN / belum dibongkar**
- `people.dat` (baru pola awal), `players.dat`, `non_players.dat`, `starting_contracts.dat`, blok akhir `club.dat` 77 byte dan daftar 21 byte.
- Apakah `sicomps.fmf` flag 0 atau 3 (`fmmcore.js` sekarang hanya mendukung flag 0) → **cek di Sesi 03**.
- Apakah game menerima `db_archive` yang TOC-nya raw-frame (sudah terbukti untuk logo, belum untuk db) → **uji di Fase 5**.

## 3. Spesifikasi

### 3.1 Sumber
`research/format_specs/fmm27_panduan_induk.md` (salinan utuh panduan induk). Pada Sesi 03, isinya dipecah per file mengikuti template 3.3. Kalau ada pertentangan, yang menang: hasil uji di game > skrip Python yang dipakai build yang jalan > catatan teks.

### 3.2 Label keyakinan
`VERIFIED` · `LIKELY` · `HYPOTHESIS` · `UNKNOWN`. Aplikasi hanya boleh mengubah field `VERIFIED`. Field `LIKELY` boleh diedit hanya di "mode eksperimen", dengan peringatan. Sisanya disimpan sebagai *opaque bytes*.

### 3.3 Template spesifikasi per file
```markdown
# Spesifikasi: <file>
## Identifikasi  : nama, ukuran, SHA-256, versi (B6b/B7b/...)
## Header        :
## Struktur      :
## Field         : | Field | Offset/urutan | Tipe | Arti | Keyakinan |
## Relasi        : (mis. club.div → competition.idx; rivalries → urutan club.dat)
## Aturan tulis  : (mis. klon di ujung; .lng ikut; fmm_*.dat ikut)
## Bukti         : skrip + putaran uji
## Status        : Read / Write / Round-trip / Uji game
## Unknown       :
```

### 3.4 `input_manifest.md` dan gerbang versi
Catat untuk tiap file: nama, ukuran, SHA-256, versi putaran (B6b, B7b, …), dan asalnya di APK. Ukuran yang sudah diketahui:
- `db_archive_2706.fmf` B6b: 149.841.844 byte
- `sicomps.fmf` B6: 49.619.693 byte
- `pictures_logos.fmf` B6: 1.815.037.846 byte; B7b: 1.818.029.973 byte

Aplikasi mengenali versi dari hash. Hash yang belum dikenal tidak ditolak, tapi diberi peringatan, dan file itu harus lulus round-trip dulu sebelum boleh diedit.

## 4. Arsitektur

### 4.1 Stack
| Aspek | Keputusan |
|---|---|
| Platform | PWA + Service Worker |
| Bahasa | TypeScript strict |
| UI | React + Tailwind (Vite) |
| Binary | `Uint8Array`/`DataView`; file besar lewat `Blob.slice` (jangan dimuat utuh) |
| zstd | `fzstd` untuk dekompresi (sudah dipakai). Tulis: raw-frame (terbukti diterima game untuk logo). zstd WASM untuk kompresi **opsional** (lihat 4.5) |
| Kerja berat | Web Worker |
| Penyimpanan | IndexedDB/OPFS untuk working copy kecil (`.dat` hasil edit, bukan arsip 1,8 GB) |
| Tes | Vitest; tes `core/` di Node |
| Hosting | GitHub Pages (kode saja) |
| Skrip dev | Python 3 + `zstandard` (yang sudah ada) sebagai **pembanding/golden** |

### 4.2 Batasan browser Android
1. Impor via `<input type="file">`, ekspor via `Blob` + download.
2. Tidak ada akses ke `Android/data` atau isi APK. File dipindahkan dengan file manager / MT Manager.
3. `pictures_logos.fmf` 1,8 GB: hanya baca header + TOC + potongan; tulis sebagai rangkaian `Blob` (pola `buildFmf` di `fmmcore.js`).
4. **Aplikasi Claude Android menolak unduhan di atas 200 MB** → PWA dibuka di Chrome, bukan di dalam aplikasi Claude.
5. IndexedDB bisa dibersihkan browser → autosave dan tombol backup.

### 4.3 Alur data
```
Pilih file → Worker: buka .fmf (header+TOC) → ambil entri .dat yang dibutuhkan → parse → Model
  → UI edit → Validator → Laporan perubahan
  → Worker: serialize .dat yang berubah → (A) tambal .fmf  atau  (B) paket Documents → download
```
UI tidak pernah mengedit biner langsung.

### 4.4 Model internal
- UID asli dipertahankan; urutan record dipertahankan (rujukan antar file memakai **index**, bukan UID: `club.div` → index kompetisi, `rivalries` → index klub, klub → index stadion).
- Field tak dikenal disimpan apa adanya per record.
- Nilai asli vs baru per field, undo/redo, riwayat, batch edit.
- **Klub/stadion/kompetisi baru selalu ditambahkan di ujung** (aturan tulis yang terbukti), tidak disisipkan.

### 4.5 Strategi tulis dan keluaran
**Tulis `.fmf` = tambal di ujung** (sudah terbukti di B6/B7b untuk logo):
`header baru + data lama apa adanya + entri yang berubah + magic + TOC baru (raw-frame)`.
Data lama tidak disalin ke memori. Keuntungannya, file 1,8 GB pun bisa ditulis dari HP.

Konsekuensi round-trip:
- Round-trip **per entri** (`.dat` parse → serialize) harus identik byte demi byte. Ini tes utama.
- Round-trip **arsip** tanpa perubahan: cukup salin file asli (identik).
- Arsip dengan perubahan tidak identik dengan hasil `fmfio.py` (TOC raw vs zstd 19). Bedanya terdokumentasi, dan isi tiap entri wajib sama dengan hasil Python. Kalau game menolak TOC raw untuk `db_archive`, baru tambahkan zstd WASM.

**Dua jalur keluaran**
| Jalur | Isi | Kapan dipakai |
|---|---|---|
| A. Arsip `.fmf` | file utuh, dikemas sesuai struktur `assets/...` | rilis ke APK. **Peringatan wajib: masukkan dengan Level "Store"** |
| B. Paket Documents | `.dat` yang berubah + `config.xml` untuk `Android/data/.../files/Documents/db_archive_2706/` | uji cepat tanpa bongkar/sign APK. Kalau rusak: hapus data aplikasi |

Jalur B hanya untuk database (sudah terbukti). Untuk `sicomps` dan logo statusnya UNKNOWN, kecuali logo lewat `documentsConfig` (editor logo sudah membuatnya, tapi perlu dicatat buktinya).

### 4.6 Lintas platform (tetap dari v5)
- `src/core/` TypeScript murni: tanpa `window`, `document`, DOM, `localStorage`, IndexedDB. Data = `Uint8Array`, atau antarmuka "sumber byte acak" untuk file besar:
  ```ts
  interface ByteSource { size: number; read(start: number, end: number): Promise<Uint8Array>; }
  ```
  (web: `Blob.slice`; Node: `fs` handle; Tauri/Capacitor: plugin file). Ini menggantikan ketergantungan `fmmcore.js` pada `Blob`.
- ESLint `no-restricted-globals` untuk `core/`, tes `core/` di Node.
- `src/platform/`: `FileIO`, `Store`, dan sink keluaran yang bisa menulis rangkaian bagian (supaya file 1,8 GB tidak perlu dirakit di memori).
- Pembungkus (Capacitor/Tauri/Electron) baru dipertimbangkan setelah web stabil (kriteria sama dengan v5).

### 4.7 Kode awal yang dipakai ulang
| Sumber | Jadi | Catatan |
|---|---|---|
| `app/fmmcore.js` | `core/fmf/`, `core/formats/competition`, `core/formats/logos`, `core/zip` | ubah `Blob` → `ByteSource`; parser klub di sana hanya *melewati* field, harus dilengkapi |
| `scripts/club.py` | `core/formats/club` | parser lengkap + serializer |
| `scripts/comp.py`, `riv.py`, `stadium.py`, `names.py` | adapter masing-masing | |
| `scripts/dbc.py`, `dbcarc.py` | `core/formats/dbc` | parse/build pohon tag |
| `scripts/fmmlists.py`, `fmmdat.py` | `core/formats/fmmlists` | |
| `scripts/build_b7b_*.py` | **logika fitur** (contoh "set reputasi per strata") jadi aksi batch di UI | jangan disalin mentah; jadikan fungsi murni yang diuji |
| `app/ui.html`, `editor_logo_fmm27.html` | `ui/logos/` | UI lama sebagai acuan perilaku |

Python tetap dipakai sebagai **pembanding**: `scripts/golden/` menjalankan parser Python dan TS pada file yang sama, lalu membandingkan JSON dan hash keluaran.

## 5. Modul

| Modul | Fitur | Dasar | Status format |
|---|---|---|---|
| **Database Tools** | info arsip, daftar entri, hash, hex viewer, ekstrak/ganti entri mentah | `fmf` | VERIFIED |
| **Club** | nama (panjang/pendek/kode), negara liga & asal, divisi, status, fasilitas latihan/akademi, penonton, stadion, **reputasi (angka + perkiraan pita)**, klon klub baru, batch per strata | `club.dat`, `.lng`, `fmm_clubs` | VERIFIED (keuangan 68 byte: mode eksperimen) |
| **Competition** | nama panjang/pendek/singkatan, jenis, induk, reputasi, negara, logo | `competition.dat` | VERIFIED |
| **League Structure / Rules** | pohon entri `comps.dbc`, editor tag (ntms, nrds, tanggal, qurl/prmr/relr, grup), daftar kompetisi negara, `comps.txt` | `comps.dbc` | VERIFIED (struktur); arti sebagian tag LIKELY |
| **Load Lists** | isi `fmm_comps/clubs/stadiums/people` IDN-0/1/2 | `fmm_*.dat` | VERIFIED |
| **Stadium** | nama, kapasitas, kota (pinjam), klon stadion baru + daftarkan di `fmm_stadiums` | `stadium.dat` | VERIFIED |
| **Rivalry** | pasangan klub, intensitas 0–200 | `rivalries.dat` | VERIFIED |
| **Nation** | nama, kode, youth rating (eksperimen) | `nation.dat` | sebagian |
| **Logo** | ganti/tambah logo klub & kompetisi, fit 180×180 dan 25×18 | `pictures_logos` | VERIFIED (port dari editor yang ada) |
| **Game Code Check** | baca tabel negara playable dan tabel liga terdalam di `libgame.so`, tampilkan, beri peringatan kalau liga tidak terdaftar | `libgame.so` | read-only |
| **Player / Staff / Transfer** | sesuai v5 + impor CSV dataset Indonesia | `people.dat` dkk. | **UNKNOWN → menunggu B3** |

Rules Editor tetap memakai klasifikasi 5 kategori dari v5. Pelajaran B2c: sebagian "aturan" ternyata ada di kode (`libgame.so`), jadi validator memberi peringatan, bukan janji.

## 6. Validator, round-trip, laporan

### 6.1 Validator khusus FMM27 (dari pelajaran B1–B7b)
- Jumlah record di setiap `.lng` = jumlah klub di `club.dat`.
- Klub/stadion/kompetisi baru: UID unik, ditambahkan di ujung, dan sudah terdaftar di `fmm_*.dat` negara terkait (IDN-0/1/2).
- `club.div` menunjuk index kompetisi yang ada, berjenis liga; index stadion valid (65535 = tidak punya stadion → **peringatan: penonton jadi 0**).
- Nama kompetisi lebih dari 21 huruf → peringatan bahwa nama pendek yang akan dipakai.
- `comps.txt`: urutan alfabet terjaga, versi entri ikut naik.
- `crgt`/`gptm`: tahunnya harus 2026 (tahun mulai game).
- Grup bertingkat: kalau induk + anak, wajib memakai pola `ftye 2`/`ftye 3` + `chdc`/`dcin`.
- Liga terdalam yang tidak ada di tabel `libgame.so` → peringatan "liga tidak muncul di layar awal".
- **Risiko anggaran $0**: klub bereputasi rendah tanpa blok keuangan → peringatan "Adjust Budgets bisa freeze" (temuan 1d).
- Umum (dari v5): UID ganda, rujukan rusak, nilai di luar rentang, kehilangan data (jumlah record/byte opaque sebelum vs sesudah).

### 6.2 Round-trip
```
ORIGINAL → buka → parse entri → serialize tanpa ubah → BANDINGKAN (identik) → bandingkan dengan Python (golden)
→ 1 perubahan → tulis → buka ulang → parse → nilai berubah sesuai, sisanya identik
```

### 6.3 Laporan perubahan
Ringkasan sebelum ekspor, plus berkas `CHANGES.txt` dalam zip keluaran: entitas, nilai lama → baru, peringatan, hash file masukan, dan pengingat "Store".

## 7. Claude Code, GitHub, Graphify
- `CLAUDE.md` di root (lihat file terpisah). Prompt standar sama dengan v5 7.5, ditambah aturan: "bandingkan dengan skrip Python di `scripts/` sebelum mengklaim parser benar".
- **Graphify opsional.** Belum diverifikasi cara pakainya; Claude Code tetap bisa bekerja dari `CLAUDE.md` + `PROJECT_CONTEXT.md` + struktur folder yang jelas. Hubungkan nanti kalau repo sudah besar.
- Aturan hemat token v5 tetap berlaku.

## 8. Struktur repository
```
fmm27-pge-web/
├── CLAUDE.md
├── PROJECT_CONTEXT.md          (dokumen ini)
├── CHANGELOG.md
├── .gitignore
├── research/format_specs/
│   ├── fmm27_panduan_induk.md  (salinan panduan induk — sumber utama)
│   ├── input_manifest.md
│   └── (Sesi 03: fmf_container.md, club_dat.md, competition_dat.md, comps_dbc.md, fmm_lists.md, logos.md, libgame_tables.md)
├── scripts/                    (Python yang sudah ada; + golden/ untuk pembanding)
├── legacy/app/                 (fmmcore.js, ui.html, editor_logo_fmm27.html — acuan, tidak diubah)
├── data/                       (dataset Indonesia: csv, md, logo PNG Bacad; BUKAN file game)
├── docs/ (ARCHITECTURE.md, entity_relationships.md, compatibility.md)
├── src/
│   ├── core/ (fmf/, binary/, formats/{competition,club,rivalry,stadium,lng,dbc,fmmlists,logos,nation}/, model/, validator/, changes/, history/)
│   ├── workers/  platform/  storage/
│   └── ui/ (dashboard, tools, clubs, competitions, rules, loadlists, stadiums, rivalries, nations, logos, codecheck, export, validation, backup)
└── tests/ (roundtrip/, fixtures/ — potongan kecil sintetis, bukan file game utuh)
```

## 9. Checklist Bacad
Lihat `LANGKAH_AWAL.md`.

## 10. Roadmap

| Fase | Isi | Selesai kalau |
|---|---|---|
| 0 | Repo + Vite/React/TS/Tailwind + PWA kosong di GitHub Pages | bisa di-install di HP |
| 1 | Pecah panduan ke spesifikasi per file + `input_manifest.md` (hash file B6b/B7b) — **spesifikasi selesai (Sesi 02)**; hash menunggu Bacad | label keyakinan lengkap |
| 2 | `core/fmf` (port `fmmcore.js` + `ByteSource`), flag 0 **dan** 3, tes Node — **selesai (Sesi 02)**, tinggal uji dengan file asli | buka 3 arsip, TOC sama dengan `fmfio.py` |
| 3 | Adapter `competition`, `club` (lengkap), `lng`, `stadium`, `rivalries`, `fmmlists`, `dbc` + round-trip per entri + golden Python — **`competition` + `club` selesai (Sesi 03)** | semua identik |
| 4 | Penjelajah read-only + Database Tools + Game Code Check — **penjelajah kompetisi & klub sudah ada (Sesi 03)** | Bacad bisa melihat data B7b di HP |
| 5 | Writer tambal-di-ujung + jalur Documents + laporan perubahan | **uji game**: ubah 1 reputasi via jalur B, lalu via jalur A |
| 6 | **Club Editor** + aksi batch "reputasi/status/fasilitas per strata" → **B7c dibuat lewat aplikasi** | B7c jalan, Adjust Budgets tidak freeze |
| 7 | Competition + Load Lists + Stadium + Rivalry | klon stadion/klub lengkap dengan semua daftar terkait |
| 8 | Rules (`comps.dbc`) editor + validator struktur liga | ulang B6 dari aplikasi, hasil sama |
| 9 | Logo (port editor lama) | 1 logo baru tampil |
| 10 | B3 (sesi analisis terpisah): `people.dat`/`players.dat`/`non_players.dat` → Player/Staff Editor + impor CSV | 1 pemain baru tampil di game |
| 11 | Polish: offline penuh, backup, panduan singkat | |
| 12 | Pembungkus lintas platform (opsional) | |

Aturan urutan: writer (Fase 5) lulus uji game dulu sebelum editor dipakai untuk data nyata.

## 11. Prinsip UI HP
Sama dengan v5 bagian 11, ditambah:
- Banner tetap: nama file + versi (B7b dll.) + "ada perubahan belum disimpan".
- Di layar ekspor: kotak peringatan **"Masukkan ke APK dengan Level Store"** dan **"Perubahan terlihat di karier baru"**.
- Reputasi ditampilkan sebagai angka + perkiraan pita (dengan label HYPOTHESIS sampai kalibrasi selesai).

## 12. Uji kompatibilitas
Catat di `docs/compatibility.md`: hash masukan, versi, jalur (A/B), tanggal, perangkat, hasil. Urutan uji: round-trip tanpa ubah → 1 reputasi (jalur B) → 1 reputasi (jalur A, Store) → B7c → klon klub → struktur liga → logo → pemain (setelah B3).

## 13. Risiko tambahan (selain v5)
| Risiko | Mitigasi |
|---|---|
| TOC raw-frame ditolak untuk `db_archive` | uji di Fase 5; cadangan: zstd WASM level 19 |
| Port Python → TS beda hasil diam-diam | golden test wajib per adapter |
| Unduhan > 200 MB gagal di aplikasi Claude | PWA dibuka di Chrome |
| File dimasukkan ke APK dengan kompresi → macet di splash | peringatan di layar ekspor + di `CHANGES.txt` |
| Jalur Documents salah susun → daftar negara kosong | petunjuk: hapus data aplikasi (bukan cache) |
| Rujukan index bergeser karena record disisipkan | model hanya mengizinkan tambah di ujung |
| Game punya batas di kode (`libgame.so`) | Game Code Check + peringatan validator |

## 14. Catatan
Hanya untuk pemakaian pribadi, offline, single-player, pada game yang dimiliki. Jangan mendistribusikan file game, database hasil ekstraksi, atau hasil modifikasinya. Repo private, tanpa file game.
