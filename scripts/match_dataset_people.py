"""Cocokkan dataset Indonesia (data/pemain_indonesia_v2.csv, data/staf_indonesia_v2.csv) dengan people.dat.

Cocok = nama sama persis (nama umum, atau nama depan + belakang; tanpa beda huruf besar/kecil).
Untuk pemain, tanggal lahir dipakai sebagai pembeda kalau nama ganda.
Hasil: ringkasan di layar + CSV di folder keluaran (default: folder sampel).

Pakai:
  python3 scripts/match_dataset_people.py samples/v2710 [folder_keluaran]
"""
import csv
import datetime
import os
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import names   # noqa: E402
import people  # noqa: E402
import club    # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def norm(s):
    s = unicodedata.normalize('NFKD', s.strip().lower())
    return ''.join(c for c in s if not unicodedata.combining(c))


def full_name(r, F, S):
    first = F[r['first']] if r['first'] < len(F) else ''   # 0xFFFFFFFF = tanpa nama depan
    second = S[r['second']] if r['second'] < len(S) else ''
    return (first + ' ' + second).strip()


def dob_of(r):
    return datetime.date(r['dob_year'], 1, 1) + datetime.timedelta(days=r['dob_day'])


def load_people(folder):
    folder = folder.rstrip('/') + '/'
    _, recs, _ = people.parse_people(open(folder + 'people.dat', 'rb').read())
    F = [x[0] for x in names.load(folder + 'first_names.dat')[0]]
    S = [x[0] for x in names.load(folder + 'second_names.dat')[0]]
    C = [x[0] for x in names.load(folder + 'common_names.dat')[0]]
    clubs, _, _ = club.parse(folder + 'club.dat', verbose=False)
    idx = {}
    for i, r in enumerate(recs):
        keys = {norm(full_name(r, F, S))}
        if r['common'] >= 0:
            keys.add(norm(C[r['common']]))
        for k in keys:
            idx.setdefault(k, []).append(i)
    return recs, F, S, C, clubs, idx


def main(folder, outdir):
    recs, F, S, C, clubs, idx = load_people(folder)

    def club_name(r):
        ci = r['club_index']
        return clubs[ci]['long'] if 0 <= ci < len(clubs) else ''

    def disp(r):
        return C[r['common']] if r['common'] >= 0 else full_name(r, F, S)

    for kind, path, is_player in (('pemain', 'data/pemain_indonesia_v2.csv', True),
                                  ('staf', 'data/staf_indonesia_v2.csv', False)):
        rows = list(csv.DictReader(open(os.path.join(REPO, path), encoding='utf-8')))
        out = []; stat = {'cocok': 0, 'cocok_nama_saja': 0, 'ganda': 0, 'tidak_ada': 0}
        for row in rows:
            cand = idx.get(norm(row['nama']), [])
            if is_player:
                cand = [i for i in cand if recs[i]['player_index'] >= 0] or cand
            hasil, pick = 'tidak_ada', None
            if len(cand) == 1:
                pick = cand[0]; hasil = 'cocok_nama_saja'
            elif len(cand) > 1:
                hasil = 'ganda'
            if is_player and cand and row.get('tgl_lahir'):
                same = [i for i in cand if dob_of(recs[i]).isoformat() == row['tgl_lahir']]
                if len(same) == 1:
                    pick = same[0]; hasil = 'cocok'
            if not is_player and pick is not None:
                hasil = 'cocok'
            stat[hasil] += 1
            r = recs[pick] if pick is not None else None
            out.append({**{k: row[k] for k in ('kompetisi', 'klub', 'nama')},
                        'hasil': hasil, 'kandidat': len(cand),
                        'uid': r['uid'] if r else '', 'nama_db': disp(r) if r else '',
                        'lahir_db': dob_of(r).isoformat() if r else '',
                        'klub_db': club_name(r) if r else '',
                        'pemain': (r['player_index'] >= 0) if r else '',
                        'staf': (r['non_player_index'] >= 0) if r else ''})
        os.makedirs(outdir, exist_ok=True)
        fn = os.path.join(outdir, 'cocok_%s.csv' % kind)
        with open(fn, 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=list(out[0].keys())); w.writeheader(); w.writerows(out)
        print('%s: %d baris -> %s  (%s)' % (kind, len(rows), fn, ', '.join('%s %d' % kv for kv in stat.items())))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else sys.argv[1])
