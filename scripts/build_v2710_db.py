"""Build database 27.1.0 (db_archive_2707.fmf) = 27.1.0 ori + mod Indonesia dari B7b (27.0) + pemain dataset.

Keputusan Bacad (23 Nov 2026): semua masuk APK; atribut pemain baru perkiraan. Dasar = ori 27.1.0.
Sumber mod = B7b kita sendiri (sudah jalan di game 27.0), dipindah lewat UID (index 27.0 ≠ 27.1.0):
  1. competition.dat : 13 kompetisi Indonesia B7b (index 1670–1682 di B7b) ditambah di ujung; index induk dipetakan ulang.
  2. stadium.dat     : 13 stadion baru B7a (UID 2000700201–213) di ujung; index kota dipetakan lewat UID kota (city.dat berubah).
  3. club.dat        : klub IDN yang sudah ada di 27.1.0 → field B7b disalin (status/fasilitas/penonton, divisi, stadion,
                       reputasi). Klon B7b yang sudah punya padanan asli di 27.1.0 (Batavia FC, Persinab Nabire, Persikad)
                       → pakai klub asli. Sisanya (22 klon) → record B7b ditambah di ujung + nama di 16 .lng.
  4. rivalries.dat   : intensitas rivalitas Indonesia mengikuti B7b (UID sama, index klub sudah benar di 27.1.0).
  5. nation.dat      : youth rating Indonesia 19 (seperti B7b; HYPOTHESIS) ; people.dat: Noah Adnan → Indonesia (B7b).
  6. pemain dataset  : scripts/build_people_v2710.py (perbarui + tambah pemain).
Keluaran: <folder_keluar>/db_archive_2707.fmf + laporan. Semua .dat hasil dibaca ulang oleh parser.

Pakai:
  python3 scripts/build_v2710_db.py <db_archive_2707.fmf ori> <db_archive_2706.fmf B7b> <folder_keluar>
"""
import json
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import club as clubmod          # noqa: E402
import comp as compmod          # noqa: E402
import fmfio                    # noqa: E402
import people as peoplemod      # noqa: E402
import riv as rivmod            # noqa: E402
import stadium as stadmod       # noqa: E402
import build_people_v2710       # noqa: E402

IDN = 58
B7B_COMP_RANGE = range(1670, 1683)          # index kompetisi Indonesia di competition.dat B7b
# klon B7b (UID 20007000xx) yang di 27.1.0 sudah ada sebagai klub asli (nama di 27.1.0)
NATIVE_FOR_CLONE = {'Batavia FC': 'Batavia FC', 'Persinab Nabire': 'Persinab Nabire', 'Persikad Depok': 'Persikad Kota Depok'}
NOAH_ADNAN = 2000430201
YOUTH_IDN = 19


def tmpfile(folder, name, data):
    p = os.path.join(folder, name)
    open(p, 'wb').write(data)
    return p


def load_arc(path):
    flag, root, _ = fmfio.read(open(path, 'rb').read())
    rows = {p.split('/')[-1]: r for p, r in fmfio.walk(root)}
    return flag, root, rows


def sb(text, g=None):
    t = text.encode('utf-8') if isinstance(text, str) else text
    return struct.pack('<I', len(t)) + t + (bytes([g]) if g is not None else b'')


def build(ori_path, b7b_path, out_dir, verbose=True):
    os.makedirs(out_dir, exist_ok=True)
    work = os.path.join(out_dir, 'kerja'); os.makedirs(work, exist_ok=True)
    flag, root, R = load_arc(ori_path)
    _, _, A = load_arc(b7b_path)
    get = lambda rows, n: fmfio.get(rows[n])  # noqa: E731
    report = {}

    # ------------------------------------------------------------ competition.dat
    cdB = get(R, 'competition.dat'); cdA = get(A, 'competition.dat')
    cB, endB, LB = compmod.parse(tmpfile(work, 'compB.dat', cdB)); assert endB == LB
    cA, endA, LA = compmod.parse(tmpfile(work, 'compA.dat', cdA)); assert endA == LA
    offA = [c['off'] for c in cA] + [endA]
    have = {c['uid'] for c in cB}
    comp_map = {}                                   # index B7b -> index 27.1.0
    for i in B7B_COMP_RANGE:
        assert cA[i]['nat'] == IDN and cA[i]['uid'] not in have, cA[i]['long']
        comp_map[i] = len(cB) + len(comp_map)
    new_recs = []
    club_uids_B = None
    for i in B7B_COMP_RANGE:
        rec = bytearray(cdA[offA[i]:offA[i + 1]])
        struct.pack_into('<H', rec, 0, comp_map[i])
        # posisi field tetap sesudah 3 teks: jenis u8, benua u16, negara i16, warna 4, rep u16, tingkat u8, induk i16
        p = 6
        for ff in (1, 1, 0):
            p += 4 + struct.unpack_from('<I', rec, p)[0] + (1 if ff else 0)
        parent = struct.unpack_from('<h', rec, p + 12)[0]
        if parent >= 0:
            struct.pack_into('<h', rec, p + 12, comp_map[parent])
        new_recs.append(bytes(rec))
    cd_new = cdB[:8] + struct.pack('<H', len(cB) + len(new_recs)) + cdB[10:] + b''.join(new_recs)
    c2, e2, L2 = compmod.parse(tmpfile(work, 'comp_new.dat', cd_new)); assert e2 == L2 and len(c2) == len(cB) + 13
    report['kompetisi_baru'] = [(comp_map[i], cA[i]['uid'], cA[i]['long']) for i in B7B_COMP_RANGE]

    # ------------------------------------------------------------ stadium.dat (+ peta kota lewat UID)
    def cities(b):
        # city.dat: header 8 + u16 jumlah; record 20 byte = u16 nomor urut, u32 UID kota, u16 negara, f32, f32, 4 byte
        n = struct.unpack_from('<H', b, 8)[0]
        assert 10 + 20 * n == len(b), (n, len(b))
        assert all(struct.unpack_from('<H', b, 10 + 20 * i)[0] == i for i in range(n))
        return [struct.unpack_from('<I', b, 12 + 20 * i)[0] for i in range(n)]
    cityA = cities(get(A, 'city.dat')); cityB = cities(get(R, 'city.dat'))
    city_idx_B = {u: i for i, u in enumerate(cityB)}
    sdB = get(R, 'stadium.dat'); sdA = get(A, 'stadium.dat')
    sB, eB, LsB = stadmod.parse(tmpfile(work, 'stadB.dat', sdB)); assert eB == LsB
    sA, eA, LsA = stadmod.parse(tmpfile(work, 'stadA.dat', sdA)); assert eA == LsA
    stad_by_uid_B = {s['uid']: s['idx'] for s in sB}
    new_stad = [s for s in sA if s['uid'] >= 2000700201 and s['uid'] <= 2000700213]
    assert len(new_stad) == 13 and not any(s['uid'] in stad_by_uid_B for s in new_stad)
    add = b''; city_fallback = []
    for k, s in enumerate(new_stad):
        rec = bytearray(sdA[s['off']:s['off'] + s['len']])
        nidx = len(sB) + k
        cu = cityA[s['city']]
        if cu in city_idx_B:
            cidx = city_idx_B[cu]
        else:   # kota hilang di 27.1.0: pinjam kota stadion lain di kota yang sama (pola B7a)
            sis = [x for x in sA if x['city'] == s['city'] and x['uid'] in stad_by_uid_B and x['uid'] < 2000700201]
            assert sis, ('kota tidak ada di 27.1.0 dan tidak ada stadion saudara', s['name'], cu)
            cidx = sB[stad_by_uid_B[sis[0]['uid']]]['city']
            city_fallback.append((s['name'], sis[0]['name']))
        struct.pack_into('<IIH', rec, 0, nidx, s['uid'], cidx)
        add += bytes(rec)
        stad_by_uid_B[s['uid']] = nidx
    report['kota_pinjam'] = city_fallback
    sd_new = sdB[:8] + struct.pack('<H', len(sB) + 13) + sdB[10:] + add
    s2, e2, L2 = stadmod.parse(tmpfile(work, 'stad_new.dat', sd_new)); assert e2 == L2 and len(s2) == len(sB) + 13

    def stad_map(idx_a):
        if idx_a == 0xFFFF:
            return 0xFFFF
        return stad_by_uid_B[sA[idx_a]['uid']]

    def comp_remap(v):
        return comp_map.get(v, v) if v >= 0 else v

    # ------------------------------------------------------------ club.dat
    cdbB = bytearray(get(R, 'club.dat')); cdbA = get(A, 'club.dat')
    CB, e, L = clubmod.parse(tmpfile(work, 'clubB.dat', bytes(cdbB)), verbose=False); assert e == L
    CA, e, L = clubmod.parse(tmpfile(work, 'clubA.dat', cdbA), verbose=False); assert e == L
    club_idx_B = {c['uid']: i for i, c in enumerate(CB)}
    name_idx_B = {}
    for i, c in enumerate(CB):
        if c['nat'] == IDN:
            name_idx_B.setdefault(c['long'], i)
    idn_A = [c for c in CA if c['nat'] == IDN or c['div'] in comp_map]

    def rep_off(c):          # offset reputasi (u16) relatif awal record
        return c['o_div'] - c['off'] + 10 + (68 if c['flag'] else 0) + 4 + c['k'] + 1

    patched, cloned, natives = [], [], []
    tail_add = []
    for c in idn_A:
        a0 = c['off']
        misc = cdbA[c['o_misc']:c['o_misc'] + 10]
        div, div2 = struct.unpack_from('<hh', cdbA, c['o_div'])
        stad = struct.unpack_from('<H', cdbA, c['o_div'] + 5)[0]
        lastdiv = struct.unpack_from('<h', cdbA, c['o_div'] + 7)[0]
        rep = struct.unpack_from('<H', cdbA, a0 + rep_off(c))[0]
        vals = (misc, comp_remap(div), comp_remap(div2), stad_map(stad), comp_remap(lastdiv), rep)
        target = club_idx_B.get(c['uid'])
        if target is None and c['long'] in NATIVE_FOR_CLONE:
            target = name_idx_B.get(NATIVE_FOR_CLONE[c['long']])
            assert target is not None, c['long']
            natives.append((c['long'], c['uid'], CB[target]['uid']))
        if target is not None:
            t = CB[target]
            cdbB[t['o_misc']:t['o_misc'] + 10] = vals[0]
            struct.pack_into('<hh', cdbB, t['o_div'], vals[1], vals[2])
            struct.pack_into('<H', cdbB, t['o_div'] + 5, vals[3])
            struct.pack_into('<h', cdbB, t['o_div'] + 7, vals[4])
            struct.pack_into('<H', cdbB, t['off'] + rep_off(t), vals[5])
            patched.append((t['long'], t['uid']))
        else:
            rec = bytearray(cdbA[a0:a0 + c['len']])
            rd = c['o_div'] - a0
            struct.pack_into('<hh', rec, rd, vals[1], vals[2])
            struct.pack_into('<H', rec, rd + 5, vals[3])
            struct.pack_into('<h', rec, rd + 7, vals[4])
            tail_add.append(bytes(rec))
            cloned.append((c['long'], c['uid']))
    n_old = len(CB)
    club_new = bytes(cdbB[:8]) + struct.pack('<I', n_old + len(tail_add)) + bytes(cdbB[12:]) + b''.join(tail_add)
    C2, e, L = clubmod.parse(tmpfile(work, 'club_new.dat', club_new), verbose=False)
    assert e == L and len(C2) == n_old + len(tail_add)
    report.update(klub_diperbarui=len(patched), klub_asli_pengganti_klon=natives, klon_baru=cloned)

    # ------------------------------------------------------------ 16 .lng (nama klon di ujung, urutan sama dengan club.dat)
    clone_uids = [u for _, u in cloned]
    lng_out = {}
    for name in [n for n in R if n.endswith('.lng')]:
        bB = get(R, name); bA = get(A, name)
        def recs(b):
            n = struct.unpack_from('<I', b, 8)[0]; p = 12; out = {}
            for _ in range(n):
                st = p; uid = struct.unpack_from('<I', b, p)[0]; p += 4
                for ff in (1, 1, 0, 0):
                    p += 4 + struct.unpack_from('<I', b, p)[0] + (1 if ff else 0)
                out[uid] = b[st:p]
            return out, p, n
        rA, _, _ = recs(bA)
        _, endB, nB = recs(bB)
        assert nB == n_old, (name, nB, n_old)
        add = b''.join(rA[u] for u in clone_uids)
        lng_out[name] = bB[:8] + struct.pack('<I', nB + len(clone_uids)) + bB[12:endB] + add + bB[endB:]
        assert struct.unpack_from('<I', lng_out[name], 8)[0] == len(C2)

    # ------------------------------------------------------------ rivalries.dat (intensitas B7b)
    rvB = bytearray(get(R, 'rivalries.dat'))
    RB, _, _, _ = rivmod.parse(tmpfile(work, 'rivB.dat', bytes(rvB)))
    RA, _, _, _ = rivmod.parse(tmpfile(work, 'rivA.dat', get(A, 'rivalries.dat')))
    rb = {r['uid']: r for r in RB}
    riv_changes = []
    for r in RA:
        if 0 <= r['a'] < len(CA) and CA[r['a']]['nat'] == IDN and r['uid'] in rb:
            t = rb[r['uid']]
            if r['tail'][:1] != t['tail'][:1]:
                o = t['off'] + t['len'] - 15
                assert rvB[o] == t['tail'][0]
                rvB[o] = r['tail'][0]
                riv_changes.append((r['name'], t['tail'][0], r['tail'][0]))
    report['rivalitas'] = riv_changes

    # ------------------------------------------------------------ nation.dat youth + people Noah Adnan
    nd = bytearray(get(R, 'nation.dat'))
    i = nd.find(b'\x71\x00\x00\x00\x3a\x00\x09\x00\x00\x00Indonesia\xff'); assert i > 0
    k = nd.find(b'\xff\x7f\xd4\x00\x00\x00\xff\x7f', i); assert 0 < k - i < 120
    report['youth_idn'] = (nd[k + 11], YOUTH_IDN); nd[k + 11] = YOUTH_IDN

    # ------------------------------------------------------------ tulis folder kerja untuk build pemain
    dbdir = os.path.join(work, 'db'); os.makedirs(dbdir, exist_ok=True)
    for n in R:
        open(os.path.join(dbdir, n), 'wb').write(get(R, n))
    for n, b in (('competition.dat', cd_new), ('stadium.dat', sd_new), ('club.dat', club_new),
                 ('rivalries.dat', bytes(rvB)), ('nation.dat', bytes(nd))):
        open(os.path.join(dbdir, n), 'wb').write(b)
    for n, b in lng_out.items():
        open(os.path.join(dbdir, n), 'wb').write(b)
    # Noah Adnan
    ph, precs, _ = peoplemod.parse_people(open(os.path.join(dbdir, 'people.dat'), 'rb').read())
    for r in precs:
        if r['uid'] == NOAH_ADNAN:
            report['noah_adnan'] = (r['nation'], IDN); r['nation'] = IDN
    open(os.path.join(dbdir, 'people.dat'), 'wb').write(peoplemod.build_people(ph, precs))

    pdir = os.path.join(work, 'people_out')
    new_uids, prep, skipped = build_people_v2710.build(dbdir, pdir, verbose=verbose)
    for n in ('people.dat', 'players.dat', 'starting_contracts.dat', 'first_names.dat', 'second_names.dat', 'common_names.dat'):
        open(os.path.join(dbdir, n), 'wb').write(open(os.path.join(pdir, n), 'rb').read())
    report['pemain_baru'] = len(new_uids)
    report['pemain_diperbarui'] = sum(x['aksi'] == 'perbarui' for x in prep)
    report['pemain_dilewati'] = skipped
    json.dump(new_uids, open(os.path.join(out_dir, 'uid_pemain_baru.json'), 'w'))

    # ------------------------------------------------------------ rakit db_archive_2707.fmf
    for n, row in R.items():
        b = open(os.path.join(dbdir, n), 'rb').read()
        if b != get(R, n):
            row[2] = b; row[5] = None
    out, _ = fmfio.write(flag, root)
    open(os.path.join(out_dir, 'db_archive_2707.fmf'), 'wb').write(out)
    # verifikasi: baca ulang arsip
    f2, r2, _ = fmfio.read(out)
    back = {p.split('/')[-1]: fmfio.get(x) for p, x in fmfio.walk(r2)}
    for n in R:
        assert back[n] == open(os.path.join(dbdir, n), 'rb').read(), n
    report['ukuran'] = len(out)
    json.dump(report, open(os.path.join(out_dir, 'laporan_db.json'), 'w'), indent=1, ensure_ascii=False, default=str)
    if verbose:
        print('kompetisi +%d, stadion +13, klub diperbarui %d, klon %d, asli pengganti klon %d, rivalitas %d, pemain baru %d, diperbarui %d'
              % (len(new_recs), len(patched), len(cloned), len(natives), len(riv_changes), len(new_uids), report['pemain_diperbarui']))
        print('db_archive_2707.fmf', len(out), 'byte')
    return report


if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2], sys.argv[3])
