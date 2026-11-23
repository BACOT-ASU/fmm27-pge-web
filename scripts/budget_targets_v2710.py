"""Target anggaran klub Indonesia (Transfer per musim, Gaji per minggu) untuk B7c langkah 3.

Sumber (keputusan Bacad 23 Nov, log poin 49–50):
  - BRI Super League: data/estimasi_anggaran_super_league_2026_27.md (estimasi Bacad, Rupiah):
    gaji/minggu = kolom "Est. gaji/minggu"; transfer = titik tengah kolom "Est. transfer budget/musim".
  - Kasta lain (tim kecil): minimal Bacad = Transfer $675.000, Gaji $3.400/minggu (uji Persikad 22 Nov, tidak freeze).
Transfer klub SL tidak boleh di bawah minimal ($675.000). Kurs = ASUMSI (bisa diubah): Rp per USD dan per GBP. Mata uang di game mengikuti pengaturan (screenshot memakai £).
Keluaran: data/target_anggaran_idn.csv
Pakai: python3 scripts/budget_targets_v2710.py
"""
import csv
import os

RP_PER_USD = 16500       # ASUMSI
RP_PER_GBP = 22000       # ASUMSI
MIN_TRANSFER_USD = 675_000
MIN_WAGE_USD = 3_400

# (UID club.dat 27.1.0, nama, gaji/minggu Rp juta, transfer Rp miliar min, max) — dari file .md Bacad
SUPER_LEAGUE = [
    (116144, 'Persija Jakarta', 2144, 15, 31),
    (116140, 'Persib Bandung', 2014, 14, 29),
    (7742801, 'Bali United FC', 1497, 10, 22),
    (2000090667, 'Dewa United Banten FC', 1482, 10, 21),
    (116145, 'Persebaya Surabaya', 1393, 10, 20),
    (41053239, 'Bhayangkara Presisi Lampung FC', 1170, 8, 17),
    (135500, 'PSIM Yogyakarta', 1094, 8, 16),
    (5622879, 'Persik Kediri', 1072, 7, 15),
    (41021352, 'Borneo FC Samarinda', 1071, 7, 15),
    (2000561620, 'Java United FC', 1025, 7, 15),
    (135494, 'PSM Makassar', 987, 7, 14),
    (2000465597, 'Garudayaksa FC', 976, 7, 14),
    (5622746, 'Persita Tangerang', 961, 7, 14),
    (5622747, 'PSS Sleman', 862, 6, 12),
    (5622736, 'Arema FC', 839, 6, 12),
    (41051597, 'Madura United FC', 815, 6, 12),
    (2000561624, 'Isenmulang Kalteng FC', 705, 5, 10),
    (5622745, 'Persijap Jepara', 424, 3, 6),
]


def rows():
    for uid, name, wage_jt, tmin, tmax in SUPER_LEAGUE:
        wage_rp = wage_jt * 1_000_000
        tr_rp = (tmin + tmax) / 2 * 1_000_000_000
        yield {'uid': uid, 'klub': name, 'kasta': 'BRI Super League',
               'transfer_usd': max(MIN_TRANSFER_USD, round(tr_rp / RP_PER_USD)), 'gaji_minggu_usd': round(wage_rp / RP_PER_USD),
               'transfer_gbp': max(round(MIN_TRANSFER_USD * RP_PER_USD / RP_PER_GBP), round(tr_rp / RP_PER_GBP)), 'gaji_minggu_gbp': round(wage_rp / RP_PER_GBP),
               'sumber': 'estimasi Bacad (.md)'}
    yield {'uid': '*', 'klub': 'klub IDN lain (Championship, Liga Nusantara, Liga 4)', 'kasta': 'lainnya',
           'transfer_usd': MIN_TRANSFER_USD, 'gaji_minggu_usd': MIN_WAGE_USD,
           'transfer_gbp': round(MIN_TRANSFER_USD * RP_PER_USD / RP_PER_GBP),
           'gaji_minggu_gbp': round(MIN_WAGE_USD * RP_PER_USD / RP_PER_GBP), 'sumber': 'minimal Bacad'}


if __name__ == '__main__':
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'target_anggaran_idn.csv')
    rs = list(rows())
    with open(out, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rs[0]))
        w.writeheader(); w.writerows(rs)
    for r in rs:
        print(f"{r['klub'][:32]:32s} transfer ${r['transfer_usd']:>11,}  gaji ${r['gaji_minggu_usd']:>9,}/mgg  (£{r['gaji_minggu_gbp']:,})")
