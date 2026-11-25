"""Championship & Liga Nusantara jadi SATU kompetisi (fase grup di dalam kompetisi induk) — permintaan Bacad 25 Nov (log 83).

Sebelumnya (B7b): klub terdaftar di kompetisi GRUP (Barat/Timur, Grup A/B/C, file *_groups*.dbc) dan induk hanya
memainkan playoff → board & award menilai grup. Pola baru meniru ori 27.1.0:
  - `comp_jpn_first_2026_special_0.dbc` (J1 musim spesial): stage 0 `type 2` fase grup di dalam kompetisi itu sendiri,
    `tems` = {id 1, comp diri sendiri}, `ngps`, `grrl 8192`, `gnty 0`, `gpdt` kosong, `rank` per posisi.
  - `comp_idn_league_two_1442.dbc` ORI 27.1.0 (Championship versi SI): qurl/tppr/btpr/relr/prmr dipasang di stage fase grup
    (berlaku per grup), playoff di stage berikutnya.
  - `comp_inter_asia_nations_cup_1440.dbc`: `exfp` (tambahan peringkat-3 terbaik) untuk Liga Nusantara (3 grup → 8 besar).
Pembagian grup diatur game (`grrl 8192`, dugaan: menurut wilayah) — Barat/Timur & A/B/C tidak lagi dipaksa. HYPOTHESIS.

Dipanggil build_v2710_sicomps.py: apply(files, files_ori_by_name, T) → laporan; `files` = dict nama → baris folder comps.dbc.
"""
import copy
import struct

import dbc
import fmfio

CHAMP, CHAMP_GROUPS = 41042740, (41042741, 41042742)
LN, LN_GROUPS = 41042746, (2000700101, 2000700102, 2000700103)
GROUP_FILES = ('comp_idn_league_two_groups_1442.dbc', 'comp_idn_league_three_group_a_1439.dbc',
               'comp_idn_league_three_groups_bc_1439.dbc')
NEW_IN1 = {0: 20, 1: 21}       # id tanggal (fxds in_1) awal/akhir fase grup di kompetisi induk


def T(n):
    return n.encode('latin1')[::-1]


def u8(n):
    return (0x11, bytes([n]))


def comp_obj(uid):
    return (0x0a, [(T('id  '), (0x02, T('comp'))), (T('comp'), (0x0f, struct.pack('<II', uid, uid))),
                   (T('DBID'), (0x01, struct.pack('<i', uid)))])


def set_uid(cfs, uid):
    """Ganti UID di objek comp, tipe nilai dipertahankan (u32/i32 sederhana atau hash 8 byte + DBID)."""
    t, x = get(cfs, 'comp')
    setf(cfs, 'comp', (t, struct.pack('<I', uid) if len(x) == 4 else struct.pack('<II', uid, uid)))
    if get(cfs, 'DBID') is not None:
        setf(cfs, 'DBID', (0x01, struct.pack('<i', uid)))


def get(fs, k, default=None):
    return next((v for kk, v in fs if kk == T(k)), default)


def setf(fs, k, v, after=None):
    for i, (kk, _v) in enumerate(fs):
        if kk == T(k):
            fs[i] = (kk, v)
            return
    if after is not None:
        j = next(i for i, (kk, _v) in enumerate(fs) if kk == T(after))
        fs.insert(j + 1, (T(k), v))
    else:
        fs.append((T(k), v))


def drop(fs, *keys):
    ks = {T(k) for k in keys}
    fs[:] = [(k, v) for k, v in fs if k not in ks]


def walk_remap_in1(v, mapping):
    """Ganti nilai in_1 (u8) di seluruh pohon (dipakai untuk sche fase grup yang dipindah ke induk)."""
    t, x = v
    if t == 0x0a:
        for i, (k, val) in enumerate(x):
            if k == T('in_1') and val[0] == 0x11 and val[1][0] in mapping:
                x[i] = (k, u8(mapping[val[1][0]]))
            elif val[0] in (0x0a, 0x0b):
                walk_remap_in1(val, mapping)
    elif t == 0x0b:
        for val in x:
            if val[0] in (0x0a, 0x0b):
                walk_remap_in1(val, mapping)


def ref_comp(v):
    """UID dari objek comp (bentuk sederhana u32/i32 atau bentuk hash + DBID)."""
    fs = v[1]
    dbid = get(fs, 'DBID')
    if dbid is not None:
        return struct.unpack('<i', dbid[1][:4])[0] if dbid[0] == 0x01 else int.from_bytes(dbid[1], 'little')
    c = get(fs, 'comp')
    return int.from_bytes(c[1][:4], 'little')


def group_stage(gfile_stage, J, self_uid, ntms, ngps, rank_step):
    """Stage 0 baru = stage liga file grup → fase grup di induk (pola J1 2026)."""
    st = copy.deepcopy(gfile_stage)
    jst = J
    setf(st, 'id  ', get(jst, 'id  '))
    setf(st, 'indx', u8(0))
    setf(st, 'type', u8(2))
    setf(st, 'ntms', u8(ntms))
    setf(st, 'ngps', u8(ngps), after='type')
    # v18 (uji v16/v17: liga tidak termuat, Division macet): pola J1 2026 (strq menunjuk kompetisi sendiri, tems + comp,
    # grrl 8192) hanya dipakai kompetisi SPESIAL (type 4). Liga senior biasa ori dengan fase grup di stage 0
    # (bra_nat_third_1439, uru_second_1440, usa_mls_1443, idn_league_two ori): tems = [{id 1}] tanpa comp, strq KOSONG.
    # grrl 0 seperti bra_nat_third (grrl 8192 tanpa crl2 hanya ada di piala/kompetisi spesial).
    setf(st, 'grrl', (0x01, b'\x00' * 4), after='ngps')
    setf(st, 'gnty', u8(0), after='grrl')
    setf(st, 'gpdt', (0x0b, []), after='gnty')
    setf(st, 'tems', (0x0b, [(0x0a, [(T('id  '), u8(1))])]))
    setf(st, 'strq', (0x0b, []))
    setf(st, 'ngrt', u8(-(-ntms // ngps)))   # tim per grup (bra_nat_third 14, uru_second 7); 23/3 → 8
    rank = []
    for k in range(ntms // ngps + (1 if ntms % ngps else 0)):
        lo = k * rank_step
        hi = min(lo + rank_step - 1, ntms - 1)
        rank.append((0x0a, [(T('team'), u8(k)), (T('crk '), u8(lo)), (T('hgrk'), u8(lo)), (T('lwrk'), u8(hi))]))
    setf(st, 'rank', (0x0b, rank))
    sche = get(st, 'sche')
    if sche is not None:
        walk_remap_in1(sche, NEW_IN1)
    drop(st, 'qurl', 'tppr', 'btpr')
    # field khas stage LIGA yang tidak ada di stage fase grup mana pun (J1 2026, Championship ori, LN 8 besar, Brasil)
    drop(st, 'edtv', 'pspl', 'shsn')
    setf(st, 'subr', u8(61))
    for k, v in (('pwin', 3), ('pdrw', 1), ('pdef', 0)):
        setf(st, k, u8(v))
    return st


def route(nmsn, nrpl, stag, key):
    """qurl item / tppr / btpr bentuk stage di induk: {nmsn, nrpl, stag} (pola stage 0 Liga Nusantara yang sudah jalan)."""
    fs = [(T('nmsn'), copy.deepcopy(nmsn)), (T('nrpl'), u8(nrpl)), (T('stag'), u8(stag))]
    if key != 'qurl':
        fs.insert(0, (T('id  '), (0x01, T(key))))
    return (0x0a, fs)


def local_tems(stage, src_stage):
    """tems playoff: dari kompetisi grup → dari stage `src_stage` kompetisi ini (satu entri per nama babak)."""
    out, seen = [], set()
    for it in get(stage, 'tems')[1]:
        nm = get(it[1], 'nmsn')
        key = get(nm[1], 'DBID')[1]
        if key in seen:
            continue
        seen.add(key)
        out.append((0x0a, [(T('id  '), u8(2)), (T('stag'), u8(src_stage)), (T('nmsn'), copy.deepcopy(nm))]))
    setf(stage, 'tems', (0x0b, out))
    setf(stage, 'strq', (0x0b, [(0x0a, [(T('stag'), u8(src_stage)), (T('pref'), (0x03, b'\x00')),
                                         (T('iEsT'), (0x03, b'\x00'))])]))


def merge_top(P, G):
    """Field tingkat kompetisi: ftye 1, buang chdc, tanggal fase grup (in_1 20/21) + awal/akhir musim dari file grup."""
    fs = P['fields']
    setf(fs, 'ftye', u8(1))
    # Header dbc byte 0 = ftye (VERIFIED: J1 2026 & Championship ori 01010000, induk 03…, anak 02…). Bug v16: header
    # masih 03 → game tidak memuat Championship & Liga Nusantara (Domestic Competitions hanya SL + piala, uji Bacad).
    P['hdr'] = bytes([1]) + P['hdr'][1:]
    drop(fs, 'chdc')
    for k in ('itvm', 'MtTv'):
        if get(fs, k) is None and get(G['fields'], k) is not None:
            fs.append((T(k), copy.deepcopy(get(G['fields'], k))))
    fx = get(fs, 'fxds')[1]
    used = {get(e[1], 'in_1')[1][0] for e in fx if get(e[1], 'in_1') is not None}
    assert not (used & set(NEW_IN1.values())), used
    seas = T('seas')
    fx[:] = [e for e in fx if not (get(e[1], 'id_1') is not None and get(e[1], 'id_1')[1] == seas)]
    for e in get(G['fields'], 'fxds')[1]:
        e = copy.deepcopy(e)
        i1 = get(e[1], 'in_1')
        if i1 is not None and i1[1][0] in NEW_IN1:
            setf(e[1], 'in_1', u8(NEW_IN1[i1[1][0]]))
            fx.append(e)
        elif get(e[1], 'id_1') is not None and get(e[1], 'id_1')[1] == seas:
            fx.append(e)


# v16 (+1) dan v17 (+2) sudah terpasang di HP Bacad → v18 memakai +3 agar versi selalu berbeda.
XSVC_STEP = 3


def bump(d):
    fs = d['fields']
    old = get(fs, 'XSvC')[1][0]
    setf(fs, 'XSvC', u8((old + XSVC_STEP) & 255))
    return (old + XSVC_STEP) & 255


def apply(files, ori_files):
    rep = {'xsvc': {}, 'dihapus': []}
    P = lambda n: dbc.parse(fmfio.get(files[n]))  # noqa: E731
    J1 = dbc.parse(fmfio.get(ori_files['comp_jpn_first_2026_special_0.dbc']))
    jst = get(J1['fields'], 'stgs')[1][0][1]
    AC = dbc.parse(fmfio.get(ori_files['comp_inter_asia_nations_cup_1440.dbc']))
    exfp = copy.deepcopy(get(get(AC['fields'], 'stgs')[1][0][1], 'exfp'))
    setf(exfp[1][0][1], 'nrpl', u8(2))

    def save(name, d):
        rep['xsvc'][name] = bump(d)
        files[name][2] = dbc.build(d); files[name][5] = None
        dbc.parse(files[name][2])

    # ------------------------------------------------ Pegadaian Championship
    n2 = 'comp_idn_league_two_1442.dbc'
    C = P(n2); G = P('comp_idn_league_two_groups_1442.dbc')
    gst = get(G['fields'], 'stgs')[1][0][1]
    gq = get(gst, 'qurl')[1][0][1]
    s0 = group_stage(gst, jst, CHAMP, 20, 2, 2)
    s0 += [(T('qurl'), (0x0b, [route(get(gq, 'nmsn'), 1, 1, 'qurl')])),
           (T('tppr'), route(get(get(gst, 'tppr')[1], 'nmsn'), 1, 1, 'tppr')),
           (T('btpr'), route(get(get(gst, 'btpr')[1], 'nmsn'), 1, 2, 'btpr'))]
    assert get(s0, 'relr') is not None and get(s0, 'prmr') is not None
    old = [it[1] for it in get(C['fields'], 'stgs')[1]]
    s1, s2 = copy.deepcopy(old[0]), copy.deepcopy(old[1])
    setf(s1, 'indx', u8(1)); local_tems(s1, 0)
    setf(s2, 'indx', u8(2)); local_tems(s2, 0)
    setf(C['fields'], 'stgs', (0x0b, [(0x0a, s0), (0x0a, s1), (0x0a, s2)]))
    merge_top(C, G)
    save(n2, C)
    rep['championship'] = 'grup 2 × 10 di induk; juara grup → Champions Playoff + promosi; peringkat 2 → Promotion Playoff; ' \
                          'peringkat 9 → Relegation Playoff; juru kunci degradasi'

    # ------------------------------------------------ Liga Nusantara
    n3 = 'comp_idn_league_three_1439.dbc'
    L = P(n3); GB = P('comp_idn_league_three_groups_bc_1439.dbc')
    gst = get(GB['fields'], 'stgs')[1][0][1]
    gq = get(gst, 'qurl')[1][0][1]
    s0 = group_stage(gst, jst, LN, 23, 3, 3)
    s0 += [(T('qurl'), (0x0b, [route(get(gq, 'nmsn'), 2, 1, 'qurl')])), (T('exfp'), exfp)]
    old = [it[1] for it in get(L['fields'], 'stgs')[1]]
    s1, s2 = copy.deepcopy(old[0]), copy.deepcopy(old[1])
    setf(s1, 'indx', u8(1)); local_tems(s1, 0)
    for k in ('qurl', 'tppr'):
        v = get(s1, k)
        items = v[1] if v[0] == 0x0b else [v]
        for it in items:
            setf(it[1], 'stag', u8(2))
    setf(s2, 'indx', u8(2)); local_tems(s2, 1)
    setf(L['fields'], 'stgs', (0x0b, [(0x0a, s0), (0x0a, s1), (0x0a, s2)]))
    merge_top(L, GB)
    save(n3, L)
    rep['liga_nusantara'] = '3 grup (23 klub) di induk; 2 teratas tiap grup + 2 peringkat-3 terbaik → 8 besar (2 × 4); ' \
                            'final & perebutan tempat 3; 3 promosi'

    # ------------------------------------------------ rujukan lain ke kompetisi grup
    groups = set(CHAMP_GROUPS) | set(LN_GROUPS)
    parent = {g: CHAMP for g in CHAMP_GROUPS} | {g: LN for g in LN_GROUPS}
    # nation_idn_comps: daftar retm tanpa grup
    nc = 'nation_idn_comps_1446.dbc'
    N = P(nc)
    retm = get(N['fields'], 'retm')[1]
    retm[:] = [it for it in retm if ref_comp(get(it[1], 'comp')) not in groups]
    # dvlv: `nccc` = jumlah kompetisi anak (pola induk ftye 3). Kompetisi tunggal di ori (Championship SI, J1/J2/J3) tanpa nccc.
    for it in get(N['fields'], 'dvlv')[1]:
        if ref_comp(get(it[1], 'comp')) in (CHAMP, LN):
            drop(it[1], 'nccc')
    save(nc, N)
    # Piala Indonesia: peserta per kompetisi liga → induk
    cup = 'comp_idn_cup_1438.dbc'
    K = P(cup)
    n_fix = 0
    for st in get(K['fields'], 'stgs')[1]:
        tems = get(st[1], 'tems')
        if tems is None:
            continue
        new, seen = [], set()
        for it in tems[1]:
            c = get(it[1], 'comp')
            if c is not None and ref_comp(c) in groups:
                p = parent[ref_comp(c)]
                n_fix += 1
                if p in seen:
                    continue
                seen.add(p)
                it = copy.deepcopy(it)
                cv = get(it[1], 'comp')[1]
                set_uid(cv, p)
            new.append(it)
        tems[1][:] = new
    assert n_fix == 5, n_fix
    save(cup, K)
    # liga cadangan: tanggal dari Grup Barat → tanggal fase grup di induk
    rs = 'nation_idn_reserve_comps_1446.dbc'
    Rz = P(rs)
    n_fix = [0]

    def fix_dates(v):
        t, x = v
        if t == 0x0a:
            c = get(x, 'comp')
            if c is not None and c[0] == 0x0a and get(c[1], 'comp') is not None and ref_comp(c) in groups \
                    and get(x, 'in_1') is not None:
                p = parent[ref_comp(c)]
                set_uid(c[1], p)
                setf(x, 'in_1', u8(NEW_IN1[get(x, 'in_1')[1][0]]))
                n_fix[0] += 1
            for _k, val in x:
                if val[0] in (0x0a, 0x0b):
                    fix_dates(val)
        elif t == 0x0b:
            for val in x:
                if val[0] in (0x0a, 0x0b):
                    fix_dates(val)
    fix_dates((0x0a, Rz['fields']))
    assert n_fix[0] == 2, n_fix
    save(rs, Rz)
    # file kompetisi grup tidak dipakai lagi
    for g in GROUP_FILES:
        del files[g]
        rep['dihapus'].append(g)
    return rep
