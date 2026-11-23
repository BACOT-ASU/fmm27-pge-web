"""Peta aset gabungan untuk tab Wajah & Logo di aplikasi: wajah + logo klub/timnas + logo kompetisi dari modder.

Logo modder (config.xml di pictures_logos modder, log poin 36): 12.713 klub (termasuk timnas: timnas = klub di club.dat)
dan 1.559 kompetisi, semua `custom/<UID>`. Modder memakai logo & nama asli untuk klub tanpa lisensi
(mis. Casciavit Milano → AC Milan), jadi logo modder dipakai untuk SEMUA klub/kompetisi non-Indonesia yang ada di db kita,
termasuk yang di ori sudah punya logo. Klub/kompetisi Indonesia: logo modder dipakai KECUALI 23 logo buatan Bacad
(data/logo_klub) yang sudah ada di pictures_logos hasil build.

Keluaran CSV: jenis,ukuran,from,to_uid  (jenis = person | club | comp ; ukuran = normal | small)
Baris wajah diambil dari CSV peta wajah (scripts/map_faces_v2710.py).

Pakai:
  python3 scripts/map_logos_v2710.py <folder config modder> <folder db kita> <peta_wajah.csv> <keluar.csv>
folder config modder berisi "normal club/config.xml", "small club/config.xml", "normal comps/config.xml", "small comps/config.xml".
"""
import csv
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import club as clubmod   # noqa: E402
import comp as compmod   # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RE = re.compile(r'<record from="([^"]*)" to="graphics/pictures/(club|comp)/(\d+)/(logo|icon)"/>')
CLONE_TO_NATIVE = {2000700004: 41023300, 2000700014: 41001027, 2000700019: 2000465973}


def build(cfgdir, dbdir, faces_csv, out_csv, verbose=True):
    clubs, _, _ = clubmod.parse(os.path.join(dbdir, 'club.dat'), verbose=False)
    comps = compmod.parse(os.path.join(dbdir, 'competition.dat'))[0]
    club_uids = {c['uid'] for c in clubs}; comp_uids = {c['uid'] for c in comps}
    bacad = {CLONE_TO_NATIVE.get(int(f.split('_')[0]), int(f.split('_')[0]))
             for f in os.listdir(os.path.join(REPO, 'data/logo_klub')) if f.lower().endswith('.png')}
    rows = []; stat = {}
    for jenis, folder, uids in (('club', 'club', club_uids), ('comp', 'comps', comp_uids)):
        for ukuran in ('normal', 'small'):
            text = open(os.path.join(cfgdir, '%s %s' % (ukuran, folder), 'config.xml'), encoding='utf-8-sig').read()
            n = skip_db = skip_bacad = 0
            for frm, _t, uid, _s in RE.findall(text):
                uid = int(uid)
                if uid not in uids:
                    skip_db += 1; continue
                if jenis == 'club' and uid in bacad:
                    skip_bacad += 1; continue
                rows.append({'jenis': jenis, 'ukuran': ukuran, 'from': frm, 'to_uid': uid}); n += 1
            stat['%s_%s' % (jenis, ukuran)] = (n, skip_db, skip_bacad)
    nf = 0
    for r in csv.DictReader(open(faces_csv, encoding='utf-8')):
        if r['to_uid']:
            rows.append({'jenis': 'person', 'ukuran': 'normal', 'from': r['from'], 'to_uid': r['to_uid']}); nf += 1
    stat['person_normal'] = (nf, 0, 0)
    with open(out_csv, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['jenis', 'ukuran', 'from', 'to_uid']); w.writeheader(); w.writerows(rows)
    if verbose:
        for k, (n, a, b) in stat.items():
            print('%-14s %6d baris (tidak ada di db %d, logo Bacad dipertahankan %d)' % (k, n, a, b))
        print('total', len(rows))
    return rows, stat


if __name__ == '__main__':
    build(*sys.argv[1:5])
