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
import dbc                  # noqa: E402
import unify_idn_leagues_v2710  # noqa: E402

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
    # Piala Indonesia: juaranya TIDAK dapat jatah kontinental (permintaan Bacad 23 Nov; sebelumnya juara
    # Piala Indonesia masuk ACL Two lewat skema cup_winners_cup). Tag `qurl` (= XML "qualification"):
    # 0 winner_qualifies_only, 1 no_team_qualifies, 2 runner_up_can_qualify (dipetakan dari 36 piala utama).
    cup_row = filesB['comp_idn_cup_1438.dbc']
    cup = dbc.parse(fmfio.get(cup_row))
    T = lambda n: n.encode('latin1')[::-1]  # noqa: E731
    fields = cup['fields']
    qi = next(i for i, (k, _v) in enumerate(fields) if k == T('qurl'))
    old_q = fields[qi][1][1][0]
    fields[qi] = (T('qurl'), (0x11, bytes([1])))
    xi = next(i for i, (k, _v) in enumerate(fields) if k == T('XSvC'))
    old_x = fields[xi][1][1][0]
    fields[xi] = (T('XSvC'), (0x11, bytes([(old_x + 1) & 255])))
    cup_row[2] = dbc.build(cup); cup_row[5] = None
    report['piala_indonesia_qurl'] = (old_q, 1)
    report['piala_indonesia_XSvC'] = (old_x, (old_x + 1) & 255)
    # BRI Super League: urutan penerima jatah Asia = posisi liga (CcQR, pola liga India/Jepang:
    # {type 1 league_stage, HdRl false, stag 0, RkIn 1 league_position, ind1 0}). Jumlah slot & kompetisi tujuan
    # (ACL Elite / ACL Two / Challenge League) diatur asi.xml menurut peringkat koefisien negara.
    lg_row = filesB['comp_idn_league_one_1439.dbc']
    lg = dbc.parse(fmfio.get(lg_row))
    if not any(k == T('CcQR') for k, _v in lg['fields']):
        rule = (0x0a, [(T('type'), (0x11, b'\x01')), (T('HdRl'), (0x03, b'\x00')), (T('stag'), (0x11, b'\x00')),
                       (T('RkIn'), (0x11, b'\x01')), (T('ind1'), (0x11, b'\x00'))])
        bi = next(i for i, (k, _v) in enumerate(lg['fields']) if k == T('Bran'))
        lg['fields'].insert(bi, (T('CcQR'), (0x0b, [rule])))
        xi = next(i for i, (k, _v) in enumerate(lg['fields']) if k == T('XSvC'))
        old = lg['fields'][xi][1][1][0]
        lg['fields'][xi] = (T('XSvC'), (0x11, bytes([(old + 1) & 255])))
        lg_row[2] = dbc.build(lg); lg_row[5] = None
        report['bri_ccqr'] = {'XSvC': (old, (old + 1) & 255)}
    # Liga Nusantara: fase 8 besar (stage 0 kompetisi induk, 2 grup × 4, diisi dari Grup A/B/C) — jadwal tampil
    # "Liga Nusantara Group A/B", diklik → macet (uji Bacad 24 Nov, log 74). Disamakan dengan pola ori grup-di-induk
    # (swe_u19_1, swe_second_2018 stage 1, rom_third): beri nama stage (stnm = 177 "Second Phase Group Stage") dan buang
    # field khas stage LIGA yang tidak ada di pola itu (hdst, lgrl, pris, fxor). Rute ke final/playoff (qurl, tppr) tetap.
    # HYPOTHESIS — penyebab pasti macet belum terbukti; cek di game.
    ln_row = next(x for x in folderB.files if (x[0] + x[1]).decode() == 'comp_idn_league_three_1439.dbc')
    ln = dbc.parse(fmfio.get(ln_row))
    si = next(i for i, (k, _v) in enumerate(ln['fields']) if k == T('stgs'))
    st0 = ln['fields'][si][1][1][0]
    keep = [(k, v) for k, v in st0[1] if k not in (T('hdst'), T('lgrl'), T('pris'), T('fxor'))]
    if not any(k == T('stnm') for k, _v in keep):
        tem0 = dict(next(v for k, v in keep if k == T('tems'))[1][0][1])
        nm = tem0[T('nmsn')]
        stnm = (0x0a, [(k, (0x02, T('stnm')) if k == T('id  ') else v) for k, v in nm[1]])
        keep.append((T('stnm'), stnm))
    ln['fields'][si][1][1][0] = (0x0a, keep)
    xi = next(i for i, (k, _v) in enumerate(ln['fields']) if k == T('XSvC'))
    old = ln['fields'][xi][1][1][0]
    ln['fields'][xi] = (T('XSvC'), (0x11, bytes([(old + 1) & 255])))
    ln_row[2] = dbc.build(ln); ln_row[5] = None
    report['ln_8besar'] = {'XSvC': (old, (old + 1) & 255), 'field_stage0': [k[::-1].decode('latin1') for k, _v in keep]}
    # Pegadaian Championship Grup Barat/Timur: 3 putaran (27 laga) → 2 putaran kandang-tandang (18 laga), permintaan
    # Bacad 25 Nov (log 81). Field stage liga: nrds (jumlah putaran) dan sche[0].nmdt (jumlah hari laga = (n-1)*nrds).
    cg_row = next(x for x in folderB.files if (x[0] + x[1]).decode() == 'comp_idn_league_two_groups_1442.dbc')
    cg = dbc.parse(fmfio.get(cg_row))
    si = next(i for i, (k, _v) in enumerate(cg['fields']) if k == T('stgs'))
    st = cg['fields'][si][1][1][0][1]
    ntms = next(v for k, v in st if k == T('ntms'))[1][0]
    ri = next(i for i, (k, _v) in enumerate(st) if k == T('nrds'))
    old_r = st[ri][1][1][0]
    if old_r != 2:
        st[ri] = (T('nrds'), (0x11, bytes([2])))
        sch = next(v for k, v in st if k == T('sche'))[1][0][1]
        di = next(i for i, (k, _v) in enumerate(sch) if k == T('nmdt'))
        old_d = sch[di][1]
        sch[di] = (T('nmdt'), (old_d[0], bytes([(ntms - 1) * 2]) + old_d[1][1:]))
        xi = next(i for i, (k, _v) in enumerate(cg['fields']) if k == T('XSvC'))
        old = cg['fields'][xi][1][1][0]
        cg['fields'][xi] = (T('XSvC'), (0x11, bytes([(old + 1) & 255])))
        cg_row[2] = dbc.build(cg); cg_row[5] = None
        report['champ_2_putaran'] = {'XSvC': (old, (old + 1) & 255), 'nrds': (old_r, 2),
                                     'nmdt': (old_d[1][0], (ntms - 1) * 2)}
    # Championship & Liga Nusantara jadi satu kompetisi (fase grup di induk, pola J1 2026) — Bacad 25 Nov, log 83
    all_rows = {(x[0] + x[1]).decode(): x for x in folderB.files}
    uni = unify_idn_leagues_v2710.apply(all_rows, all_rows)
    folderB.files[:] = [x for x in folderB.files if (x[0] + x[1]).decode() not in uni['dihapus']]
    report['liga_satu_kesatuan'] = uni
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
    lB = [('idn_cup(1438),%d' % report['piala_indonesia_XSvC'][1]) if l.startswith('idn_cup(1438),') else l for l in lB]
    if 'ln_8besar' in report:
        lB = [('idn_league_three(1439),%d' % report['ln_8besar']['XSvC'][1]) if l.startswith('idn_league_three(1439),') else l for l in lB]
    if 'champ_2_putaran' in report:
        lB = [('idn_league_two_groups(1442),%d' % report['champ_2_putaran']['XSvC'][1]) if l.startswith('idn_league_two_groups(1442),') else l for l in lB]
    if 'bri_ccqr' in report:
        lB = [('idn_league_one(1439),%d' % report['bri_ccqr']['XSvC'][1]) if l.startswith('idn_league_one(1439),') else l for l in lB]
    if 'liga_satu_kesatuan' in report:
        uni = report['liga_satu_kesatuan']
        def txt_key(fn):   # comp_idn_league_two_1442.dbc → idn_league_two(1442)
            base = fn[:-len('.dbc')].split('_', 1)[1]
            nm, num = base.rsplit('_', 1)
            return '%s(%s)' % (nm, num)
        gone = {txt_key(g) for g in uni['dihapus']}
        lB = [l for l in lB if l.split(',')[0] not in gone]
        for name, xv in uni['xsvc'].items():
            key = txt_key(name)
            idx = [i for i, l in enumerate(lB) if l.split(',')[0] == key]
            assert len(idx) == 1, (key, idx)
            lB[idx[0]] = '%s,%d' % (key, xv)
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
        # + semua orang baru build kita (≥ 2.100.000.001), termasuk staf timnas asing tanpa klub (log 76)
        'fmm_people': {p['uid'] for p in P if p['club_index'] in idn_club_set or p['nation'] == IDN
                       or IDN in p['other_nations'] or p['uid'] >= 2100000001},
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
    gone = set(report.get('liga_satu_kesatuan', {}).get('dihapus', []))
    assert all(a in names2 for a in added if a not in gone) and not (gone & names2)
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
