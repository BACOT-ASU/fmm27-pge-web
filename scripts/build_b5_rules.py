#!/usr/bin/env python3
# B5: pola Serie C. Setiap grup = liga mandiri; kompetisi induk = babak lanjutan.
import sys, struct, copy, os
sys.path.insert(0, '/home/claude/scripts')
import dbcarc, fmfio, dbc

SRC = '/home/claude/out/putaranB4/kirim/assets/shared/data/sicomps.fmf'
OUT = '/home/claude/out/putaranB5/kirim/assets/shared/data/sicomps.fmf'
SL, CH, LN = 41004312, 41042740, 41042746
CHB, CHT = 41042741, 41042742
LNA, LNB, LNC = 2000700101, 2000700102, 2000700103

T = lambda s: s.ljust(4)[::-1].encode('latin1')
I = lambda n: (0x01, struct.pack('<i', n))
U8 = lambda n: (0x11, bytes([n & 255]))
U16 = lambda n: (0x12, struct.pack('<H', n))
I64 = lambda n: (0x0f, struct.pack('<q', n))
BO = lambda b: (0x03, bytes([1 if b else 0]))
FCC = lambda s: (0x02, s.encode('latin1')[::-1])
STR = lambda s: (0x1a, s.encode())
REC = lambda *kv: (0x0a, [(T(k), v) for k, v in kv])
LST = lambda items: (0x0b, list(items))
def F(fs, name):
    for k, v in fs:
        if k == T(name): return v
    raise KeyError(name)
def has(fs, name): return any(k == T(name) for k, _ in fs)
def S(fs, name, val):
    for i, (k, v) in enumerate(fs):
        if k == T(name): fs[i] = (k, val); return
    fs.append((T(name), val))
def D(fs, *names): fs[:] = [(k, v) for k, v in fs if k not in [T(n) for n in names]]
def stg(n): return REC(('id', FCC('nmsn')), ('stgn', I64((n << 32) | n)), ('DBID', U8(n) if n < 256 else U16(n)))
def cref(uid): return REC(('id', I(1668246896)), ('comp', I(uid)))
def ccomp(uid): return REC(('id', FCC('comp')), ('comp', I(uid)))
def fx(in1=None, mnsn=None, dyow=7, dyom=1, mont=1, year=2000, strl=21, time=1530):
    kv = [('strl', U8(strl)), ('time', U16(time))]
    if in1 is not None: kv.append(('in_1', U8(in1)))
    if mnsn is not None: kv.append(('mnsn', U8(mnsn)))
    kv += [('dyow', U8(dyow)), ('dyom', U8(dyom)), ('mont', U8(mont)), ('year', U16(year))]
    return REC(*kv)

flag, root = dbcarc.load_sicomps(SRC)
dbcrow = dbcarc.find(root, '/comps.dbc'); pre, f2, r2 = dbcarc.load_dbc(fmfio.get(dbcrow))
rows = {(row[0] + row[1]).decode(): row for row in r2.files}
def get(name): return dbc.parse(fmfio.get(rows[name]))
def put(name, d, before=None):
    b = dbc.build(d)
    if name in rows: rows[name][2] = b; rows[name][5] = None; return
    tpl = rows['comp_idn_league_two_1442.dbc']
    new = [name[:-4].encode(), b'.dbc', b, tpl[3], tpl[4], None, None, None]
    i = r2.files.index(rows[before]) if before else len(r2.files)
    r2.files.insert(i, new); rows[name] = new

L1 = get('comp_idn_league_one_1439.dbc')
CHo = get('comp_idn_league_two_1442.dbc')         # aturan asli Championship (tanpa B4b)
LNo = get('comp_idn_league_three_1439.dbc')       # aturan B4 Liga Nusantara
keep_fx = [x for x in F(L1['fields'], 'fxds')[1] if has(x[1], 'id_1') and dbc.show(F(x[1], 'id_1')) in (2003398192, 2003398193, 1936023923)]

# ---------- pembuat aturan grup (liga mandiri, satu aturan untuk beberapa kompetisi) ----------
def group_rule(comps, size, nrds, nmdt, fxri, levl, start, end, fates, fname, xsvc):
    d = copy.deepcopy(L1); fs = d['fields']
    d['hdr'] = bytes.fromhex('02000000')
    d['key'] = LST([REC(('comp', I(c))) for c in comps])
    D(fs, 'comp', 'hlps', 'fnrg', 'DOmf', 'sfal', 'agdt')
    fs.insert(0, (T('vlys'), LST([REC(('mntm', U8(size)), ('mxtm', U8(size)))])))
    S(fs, 'ftye', U8(2))
    fs.insert(2, (T('cmps'), LST([REC(('comp', I(c))) for c in comps])))
    S(fs, 'levl', U8(levl)); S(fs, 'fxri', U8(fxri)); S(fs, 'dtrn', F(CHo['fields'], 'dtrn'))
    S(fs, 'fxds', LST([fx(0, None, *start), fx(1, None, *end)] + copy.deepcopy(keep_fx)))
    st = F(fs, 'stgs')[1][0][1]
    S(st, 'ntms', U8(size)); S(st, 'nrds', U8(nrds)); S(st, 'ttac', BO(False))
    D(st, 'relr', 'prmr', 'tppr', 'btpr', 'qurl', 'tfpr')
    for k, v in fates: S(st, k, v)
    sc = F(st, 'sche')[1][0][1]
    S(sc, 'sdfd', REC(('id', FCC('sdfd')), ('in_1', U8(0))))
    S(sc, 'edfd', REC(('id', FCC('edfd')), ('in_1', U8(1))))
    S(sc, 'nmdt', U8(nmdt))
    pz = F(st, 'przm')[1][:size]; S(st, 'przm', LST(pz))
    S(fs, 'typz', LST(F(fs, 'typz')[1][:size]))
    S(fs, 'file', STR(fname)); S(fs, 'XSvC', U8(xsvc)); S(fs, 'Bran', U16(1442 if 'two' in fname else 1439))
    return d

# ---------- Championship: dua grup mandiri ----------
ch_fates = [
    ('qurl', LST([REC(('nmsn', stg(142)), ('topp', U8(0)), ('btpl', U8(0)), ('comp', ccomp(CH)), ('stag', U8(0)))])),
    ('tppr', REC(('id', I(1953525874)), ('nrpl', U8(1)), ('nmsn', stg(117)), ('stag', U8(0)), ('comp', cref(CH)))),
    ('btpr', REC(('id', I(1651798130)), ('nrpl', U8(1)), ('nmsn', stg(111)), ('stag', U8(0)), ('comp', cref(CH)))),
    ('relr', REC(('id', I(1919249522)), ('nrpl', U8(1)), ('comp', cref(LN)), ('mnpl', U8(3)), ('mxpl', U8(3)))),
    ('prmr', REC(('id', I(1886547314)), ('nrpl', U8(0)), ('comp', cref(SL)), ('mnpl', U8(3)), ('mxpl', U8(3)))),
]
chg = group_rule([CHB, CHT], 10, 3, 27, 1, 1, (7, 12, 9, 2000), (7, 1, 5, 2001), ch_fates, 'idn_league_two_groups', 1)
put('comp_idn_league_two_groups_1442.dbc', chg)

# ---------- Championship: kompetisi induk = final, playoff promosi, playoff degradasi ----------
d = copy.deepcopy(CHo); fs = d['fields']; st = F(fs, 'stgs')[1]
cupA, cupB = copy.deepcopy(st[3]), copy.deepcopy(st[4])
grp_req = LST([REC(('pref', BO(False)), ('comp', ccomp(c)), ('stag', U8(0)), ('iEsT', BO(False))) for c in (CHB, CHT)])
def xteams(names, comps, parent):
    out = []
    for n in names:
        for i, c in enumerate(comps):
            out.append(REC(('id', U8(2)), ('stag', U8(0)), ('comp', ccomp(c)), ('nmsn', stg(n)), ('indx', U8(0)),
                           ('semt', U8(0)), ('seed', U8(i)), ('ncmp', ccomp(parent))))
    return LST(out)
S(cupA[1], 'indx', U8(0)); S(cupA[1], 'strq', grp_req); S(cupA[1], 'tems', xteams([117, 142], [CHB, CHT], CH))
S(cupB[1], 'indx', U8(1)); S(cupB[1], 'strq', grp_req); S(cupB[1], 'tems', xteams([111], [CHB, CHT], CH))
S(fs, 'stgs', LST([cupA, cupB]))
D(fs, 'rkli', 'crgt')
for t in F(fs, 'Tp3t')[1]: S(t[1], 'stag', U8(0))
S(fs, 'sfal', LST([REC(('sfar', U8(2)), ('indx', U8(0)), ('sths', BO(True)))]))
S(fs, 'XSvC', U8(241))
put('comp_idn_league_two_1442.dbc', d)

# ---------- Liga Nusantara: grup mandiri (A: 7 klub lolos 2; B,C: 8 klub lolos 3) ----------
def ln_fates(nq):
    return [('qurl', LST([REC(('nmsn', stg(177)), ('topp', U8(0)), ('btpl', U8(nq - 1)), ('comp', ccomp(LN)), ('stag', U8(0)))]))]
lna = group_rule([LNA], 7, 2, 14, 2, 2, (7, 7, 11, 2000), (7, 13, 2, 2001), ln_fates(2), 'idn_league_three_group_a', 1)
lnbc = group_rule([LNB, LNC], 8, 2, 14, 2, 2, (7, 7, 11, 2000), (7, 13, 2, 2001), ln_fates(3), 'idn_league_three_groups_bc', 1)
for g in (lna, lnbc):
    gf = F(g['fields'], 'stgs')[1][0][1]
    S(g['fields'], 'itvm', F(LNo['fields'], 'itvm')); S(g['fields'], 'MtTv', F(LNo['fields'], 'MtTv'))
put('comp_idn_league_three_group_a_1439.dbc', lna, before='comp_idn_league_two_1442.dbc')
put('comp_idn_league_three_groups_bc_1439.dbc', lnbc, before='comp_idn_league_two_1442.dbc')

# ---------- Liga Nusantara induk: 8 besar + final/playoff ----------
d = copy.deepcopy(LNo); fs = d['fields']; st = F(fs, 'stgs')[1]
eb, cup = copy.deepcopy(st[1]), copy.deepcopy(st[2])
S(eb[1], 'indx', U8(0))
S(eb[1], 'strq', LST([REC(('pref', BO(False)), ('comp', ccomp(c)), ('stag', U8(0)), ('iEsT', BO(False))) for c in (LNA, LNB, LNC)]))
S(eb[1], 'tems', LST([REC(('id', U8(2)), ('stag', U8(0)), ('comp', ccomp(c)), ('nmsn', stg(177)), ('ncmp', ccomp(LN))) for c in (LNA, LNB, LNC)]))
D(eb[1], 'gptm')
S(cup[1], 'indx', U8(1))
S(cup[1], 'strq', LST([REC(('stag', U8(0)), ('pref', BO(False)), ('iEsT', BO(False)))]))
for t in F(cup[1], 'tems')[1]: S(t[1], 'stag', U8(0))
S(eb[1], 'qurl', LST([REC(('nmsn', stg(142)), ('nrpl', U8(1)), ('stag', U8(1)))]))
S(eb[1], 'tppr', REC(('id', I(1953525874)), ('nrpl', U8(1)), ('nmsn', stg(117)), ('stag', U8(1))))
S(fs, 'stgs', LST([eb, cup]))
D(fs, 'rkli', 'crgt')
for t in F(fs, 'Tp3t')[1]: S(t[1], 'stag', U8(1))
S(fs, 'sfal', LST([REC(('sfar', U8(2)), ('indx', U8(1)), ('sths', BO(True)))]))
S(fs, 'fxds', LST([x for x in F(fs, 'fxds')[1] if not (has(x[1], 'in_1') and dbc.show(F(x[1], 'in_1')) in (0, 1))]))
S(fs, 'XSvC', U8(3))
put('comp_idn_league_three_1439.dbc', d)

# ---------- daftar kompetisi negara: jumlah kompetisi anak ----------
nd = get('nation_idn_comps_1446.dbc'); nf = nd['fields']
for e in F(nf, 'dvlv')[1]:
    c = dbc.show(F(F(e[1], 'comp')[1], 'comp'))
    if c in (CH, 176277226079273780): S(e[1], 'nccc', U8(2))
    if c == LN: S(e[1], 'nccc', U8(3))
for r in F(nf, 'retm')[1]:
    c = F(r[1], 'comp')[1]; cid = dbc.show(F(c, 'DBID')) if has(c, 'DBID') else dbc.show(F(c, 'comp'))
    if cid == CH: D(r[1], 'mntm', 'ntms', 'FBkt', 'Bktm'); S(r[1], 'Bktm', U8(20))
    if cid == LN: D(r[1], 'mntm', 'ntms', 'FBkt', 'Bktm'); S(r[1], 'Bktm', U8(23))
put('nation_idn_comps_1446.dbc', nd)

newdbc, _ = fmfio.write(f2, r2); dbcrow[2] = pre + newdbc

# ---------- comps.txt ----------
row = dbcarc.find(root, '/comps.txt'); t = fmfio.get(row).decode()
nl = '\r\n' if '\r\n' in t else '\n'
lines = [l for l in t.split(nl) if l]
lines = [l for l in lines if not l.startswith(('idn_league_two(', 'idn_league_three('))]
lines += ['idn_league_two(1442),241', 'idn_league_two_groups(1442),1', 'idn_league_three(1439),3',
          'idn_league_three_group_a(1439),1', 'idn_league_three_groups_bc(1439),1']
bom = '﻿' if lines[0].startswith('﻿') else ''
lines = [l.lstrip('﻿') for l in lines]; lines.sort()
row[2] = (bom + nl.join(lines) + nl).encode()

os.makedirs(os.path.dirname(OUT), exist_ok=True)
out, _ = fmfio.write(flag, root); open(OUT, 'wb').write(out); print('ok', len(out))
