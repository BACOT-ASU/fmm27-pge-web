"""Build sicomps.fmf 27.1.0 = ori 27.1.0 + aturan & daftar muat Indonesia dari B7b + pemain baru.

1. comps.dbc (arsip bersarang flag 3): 17 entri Indonesia dari B7b (yang sudah jalan di game 27.0) menimpa
   entri bernama sama di 27.1.0 dan menambah entri baru (league_three, league_three_group_a,
   league_three_groups_bc, league_two_groups). Entri non-Indonesia tidak disentuh.
2. comps.txt: blok baris `idn_*` diganti blok B7b (posisi sama).
3. sicomps/2700/fmm_*.dat (6 daftar muat): IDN-0/1/2 dibuat dari isi B7b, disaring ke UID yang ada di database
   hasil build (orang/klub/kompetisi/stadion/kota), lalu ditambah: semua klub & kompetisi & stadion Indonesia,
   semua orang di klub Indonesia + berkebangsaan Indonesia + pemain baru.
Semua isi dibaca ulang sesudah ditulis.

Pakai:
  python3 scripts/build_v2710_sicomps.py <sicomps.fmf ori 27.1.0> <sicomps.fmf B7b> <folder db hasil build> <keluar.fmf>
(folder db = samples/out_v2710/kerja/db dari build_v2710_db.py)
"""
import json
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import club as clubmod      # noqa: E402
import comp as compmod      # noqa: E402
import fmfio                # noqa: E402
import people as peoplemod  # noqa: E402
import stadium as stadmod   # noqa: E402

IDN = 58
LISTS = ('fmm_comps', 'fmm_clubs', 'fmm_reserve_clubs', 'fmm_cities', 'fmm_stadiums', 'fmm_people')
IDN_ENTRIES = (b'IDN-0', b'IDN-1', b'IDN-2')


def rows_by_path(root):
    return dict(fmfio.walk(root))


def ids_of(data):
    n = struct.unpack_from('<I', data, 8)[0]
    assert 12 + 4 * n == len(data), 'format daftar UID tidak dikenal'
    return list(struct.unpack_from('<%dI' % n, data, 12))


def make_ids(header8, ids):
    ids = sorted(set(ids))
    return header8 + struct.pack('<I', len(ids)) + struct.pack('<%dI' % len(ids), *ids)


def build(ori_path, b7b_path, dbdir, out_path, verbose=True):
    dbdir = dbdir.rstrip('/') + '/'
    flag, root, _ = fmfio.read(open(ori_path, 'rb').read())
    R = rows_by_path(root)
    _, rootA, _ = fmfio.read(open(b7b_path, 'rb').read())
    A = rows_by_path(rootA)
    report = {}

    # ---------------------------------------------------------------- comps.dbc
    def nested(row):
        b = fmfio.get(row)
        f, r, _ = fmfio.read(b[8:])
        return b[:8], f, r
    preB, fB, rB = nested(R['sicomps/comps.dbc'])
    _, _, rA = nested(A['sicomps/comps.dbc'])
    filesB = {(x[0] + x[1]).decode(): x for x in rB.files}
    replaced, added = [], []
    folderB = rB if rB.files else rB.subs[0]
    for x in (rA.files or rA.subs[0].files):
        name = (x[0] + x[1]).decode()
        if '_idn_' not in name:
            continue
        data = fmfio.get(x)
        if name in filesB:
            if fmfio.get(filesB[name]) != data:
                filesB[name][2] = data; filesB[name][5] = None
                replaced.append(name)
        else:
            ref = folderB.files[0]
            folderB.files.append([x[0], x[1], data, ref[3], ref[4], None, len(data), None])
            added.append(name)
    newdbc, _ = fmfio.write(fB, rB)
    R['sicomps/comps.dbc'][2] = preB + newdbc
    report['dbc_diganti'] = replaced
    report['dbc_ditambah'] = added

    # ---------------------------------------------------------------- comps.txt
    tB = fmfio.get(R['sicomps/comps.txt']).decode('utf-8')
    tA = fmfio.get(A['sicomps/comps.txt']).decode('utf-8')
    lB = tB.split('\n'); lA = tA.split('\n')
    blockA = [l for l in lA if l.startswith('idn_')]
    pos = [i for i, l in enumerate(lB) if l.startswith('idn_')]
    assert pos == list(range(pos[0], pos[-1] + 1)), 'blok idn_ di comps.txt tidak berurutan'
    lB = lB[:pos[0]] + blockA + lB[pos[-1] + 1:]
    R['sicomps/comps.txt'][2] = '\n'.join(lB).encode('utf-8')
    report['comps_txt_idn'] = blockA

    # ---------------------------------------------------------------- data db hasil build
    _, P, _ = peoplemod.parse_people(open(dbdir + 'people.dat', 'rb').read())
    C, _, _ = clubmod.parse(dbdir + 'club.dat', verbose=False)
    CO = compmod.parse(dbdir + 'competition.dat')[0]
    S, _, _ = stadmod.parse(dbdir + 'stadium.dat')
    cd = open(dbdir + 'city.dat', 'rb').read()
    ncity = struct.unpack_from('<H', cd, 8)[0]
    city_uids = [struct.unpack_from('<I', cd, 12 + 20 * i)[0] for i in range(ncity)]   # u16 nomor urut + u32 UID
    valid = {
        'fmm_people': {p['uid'] for p in P}, 'fmm_clubs': {c['uid'] for c in C},
        'fmm_reserve_clubs': {c['uid'] for c in C}, 'fmm_comps': {c['uid'] for c in CO},
        'fmm_stadiums': {s['uid'] for s in S}, 'fmm_cities': set(city_uids),
    }
    idn_comp_idx = {i for i, c in enumerate(CO) if c['nat'] == IDN}
    idn_clubs = [i for i, c in enumerate(C) if c['div'] in idn_comp_idx or c['nat'] == IDN]
    idn_club_set = set(idn_clubs)
    extra = {
        'fmm_comps': {CO[i]['uid'] for i in idn_comp_idx},
        'fmm_clubs': {C[i]['uid'] for i in idn_clubs},
        'fmm_stadiums': {S[C[i]['rep']]['uid'] for i in idn_clubs if C[i]['rep'] != 0xFFFF},
        'fmm_cities': {city_uids[S[C[i]['rep']]['city']] for i in idn_clubs if C[i]['rep'] != 0xFFFF},
        'fmm_people': {p['uid'] for p in P if p['club_index'] in idn_club_set or p['nation'] == IDN
                       or IDN in p['other_nations']},
        'fmm_reserve_clubs': set(),
    }
    new_people = set(json.load(open(os.path.join(os.path.dirname(os.path.dirname(dbdir.rstrip('/'))), 'uid_pemain_baru.json'))))
    assert new_people <= extra['fmm_people']

    # ---------------------------------------------------------------- 6 daftar muat
    lists_report = {}
    for n in LISTS:
        rowB = R['sicomps/2700/%s.dat' % n]; rowA = A['sicomps/2700/%s.dat' % n]
        p8B, flB, rtB = nested(rowB)
        _, _, rtA = nested(rowA)
        assert not any(x[0] in IDN_ENTRIES for x in rtB.files), n
        ref = rtB.files[0]
        hdr = fmfio.get(ref)[:8]
        rep = {}
        for x in rtA.files:
            if x[0] not in IDN_ENTRIES:
                continue
            src = ids_of(fmfio.get(x))
            keep = [u for u in src if u in valid[n]]
            final = set(keep) | (extra[n] & valid[n])
            data = make_ids(hdr, final)
            rtB.files.append([x[0], x[1], data, ref[3], ref[4], None, len(data), None])
            rep[x[0].decode()] = {'b7b': len(src), 'dibuang': len(src) - len(keep), 'akhir': len(set(final))}
        nb, _ = fmfio.write(flB, rtB)
        rowB[2] = p8B + nb
        lists_report[n] = rep
    report['daftar_muat'] = lists_report

    # ---------------------------------------------------------------- tulis + verifikasi
    out, _ = fmfio.write(flag, root)
    open(out_path, 'wb').write(out)
    _, r2, _ = fmfio.read(out)
    R2 = rows_by_path(r2)
    _, _, d2 = nested(R2['sicomps/comps.dbc'])
    names2 = {(x[0] + x[1]).decode() for x in (d2.files or d2.subs[0].files)}
    assert all(a in names2 for a in added)
    for n in LISTS:
        _, _, lt = nested(R2['sicomps/2700/%s.dat' % n])
        got = {x[0]: ids_of(fmfio.get(x)) for x in lt.files if x[0] in IDN_ENTRIES}
        assert len(got) == 3, n
    report['ukuran'] = len(out)
    json.dump(report, open(os.path.splitext(out_path)[0] + '_laporan.json', 'w'), indent=1, ensure_ascii=False)
    if verbose:
        print('comps.dbc: %d diganti, %d ditambah' % (len(replaced), len(added)))
        for n, r in lists_report.items():
            print(' ', n, r.get('IDN-0'))
        print('sicomps.fmf', len(out), 'byte')
    return report


if __name__ == '__main__':
    build(*sys.argv[1:5])
