# Kalibrasi atribut pemain: file vs layar game (23 Nov 2026)

## Sumber data
- File: `players.dat` / `people.dat` / `non_players.dat` / `coaches.dat` **27.1.0 ori** (`samples/v2710/`).
- Layar: 23 screenshot dari Bacad, diambil dari **game modder** yang terpasang di HP. Tanggal di game **15 Agu 2027**, jadi karier sudah berjalan sekitar 1 tahun (umur, latihan, dan penurunan sudah mengubah atribut). Database modder juga bisa berbeda dari ori (Witan di Bali United, kontrak berbeda). Karena itu selisih 1–3 poin masih wajar.
- Angka layar dicatat di `atribut_screenshot_2027-08-15.csv` (8 pemain). Staf: Mourinho, Bento (manajer), Tralhão & Pascua (asisten), Calafat (scout), García Parrales (physio).
- Atribut yang tampil di layar FMM (in-game editor): Aerial, Crossing, Dribbling, Passing, Shooting, Tackling, Technique, Creativity, Decisions, Movement, Aggression, Positioning, Teamwork, Pace, Stamina, Strength, Leadership, + kiper: Agility, Handling, Kicking, Reflexes, Throwing, Communication.

## Hasil
### 1. Atribut 1–20 di file = angka di layar (VERIFIED)
| Pemain | Pace | Stamina | Strength | Technique | Aggression | Leadership | Agility |
|---|---|---|---|---|---|---|---|
| Haaland (layar/file) | 18/18 | 14/14 | 18/18 | 15/14 | 15/15 | 14/13 | – |
| Mbappé | 19/19 | 15/15 | 12/12 | 18/17 | 6/6 | 14/13 | – |
| Klok | 10/11 | 13/13 | 13/14 | 11/11 | 15/15 | 11/10 | – |
| Arhan | 12/12 | 14/14 | 9/9 | 8/8 | 14/14 | 6/6 | – |
| Courtois | 11/11 | 8/8 | 15/15 | 12/12 | 8/8 | 14/14 | 13/13 |
| Messi (40 th, menurun) | 7/10 | 10/11 | 8/9 | 20/20 | 10/10 | 17/17 | 15/15 |

### 2. Atribut bertanda (−100..100): angka layar ≈ dasar + nilai/10 (LIKELY)
"layar − nilai/10" hampir sama untuk semua atribut satu pemain:
| Pemain | CA | dasar (layar − nilai/10) |
|---|---|---|
| Marc Klok | 105 | 9,2 · 9,2 · 9,3 · 9,2 · 9,2 · 9,3 · 10,2 · 9,3 |
| Pratama Arhan | 85 | 9,3 · 10,2 · 9,2 · 11,3 · 9,3 · 10,3 · 9,2 · 9,2 |
| Witan | 91 | 10,5 · 9,6 · 9,6 · 12,5 · 9,6 · 9,6 · 9,6 · 10,5 |
| Ernando (kiper) | 83 | 9,1 · 11,1 · 9,2 · 12,2 · 11,2 · 11,1 · 13,1 · 9,1 |
| Messi | 172 | 12,6 (6 dari 8 atribut persis 12,6) |
| Haaland | 187 | 14,3 – 17,3 |
| Mbappé | 192 | 14,6 – 17,6 |
| Courtois (kiper) | 181 | 14,0 – 16,1 |

- Nilai sangat rendah (−100) di layar tidak turun di bawah kira-kira 9–10 untuk bintang (Mbappé Tackling/Positioning −100 → 10). Diduga ada batas bawah, atau atribut naik karena latihan. UNKNOWN.
- **Asal "dasar" belum diketahui.** Tidak sebanding lurus dengan CA (Klok CA 105 ≈ Arhan CA 85). HYPOTHESIS: dihitung dari CA + posisi.

### 3. Atribut gabungan (LIKELY)
- Shooting ≈ dasar + max(Finishing, Long Shots)/10 (Messi 15, Mbappé 20, Klok 8, Witan 9, Arhan 6: cocok).
- Teamwork ≈ (Work Rate + Unselfishness)/2 (8 pemain, semua selisih ≤ 0,5).
- Aerial (non-kiper) ≈ (Heading + Jumping)/2 (selisih ≤ 1,5). Kiper: belum jelas.

### 4. Staf
- Kepribadian `people.dat` (8 byte) = Adaptability, Ambition, **Determination**, Loyalty, Pressure, Professionalism, Sportsmanship, Temperament. VERIFIED (Mourinho, Bento persis).
- `non_players.dat`: Financial Control, Discipline, Judging Ability, Judging Potential, People Management, Motivating, Tactical Knowledge ditemukan (lihat `people_players.md`).
- idx2 = pelatih (`coaches.dat`), idx3 = scout, idx4 = physio.

## Eksperimen penentu (belum dilakukan)
Supaya rumus "dasar" pasti, perlu uji terkendali di game **ori 27.1.0** (bukan game modder), di hari pertama karier baru:
1. Pemain A tanpa perubahan → screenshot atribut.
2. Pemain A dengan **satu** atribut bertanda dinaikkan +50 (mis. Crossing) → layar harus naik ±5 kalau rumus benar.
3. Pemain A dengan **CA saja** diubah (mis. +40) → lihat apakah semua atribut bertanda ikut naik (dasar = fungsi CA).
Ini sekaligus menguji writer aplikasi (jalur B, paket Documents).
