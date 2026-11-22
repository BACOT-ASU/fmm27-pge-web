#!/usr/bin/env python3
# B4: aturan Liga Nusantara 3 grup -> 8 besar 2x4 -> final + playoff promosi.
import sys, struct, copy, os
sys.path.insert(0, '/home/claude/scripts')
import dbcarc, fmfio, dbc

SRC = '/home/claude/out/putaranB2b/kirim/assets/shared/data/sicomps.fmf'
OUT = '/home/claude/out/putaranB4/kirim/assets/shared/data/sicomps.fmf'
LN, CH = 41042746, 41042740
GRP = [2000700101, 2000700102, 2000700103]
GSIZE = [7, 8, 8]
NEWCLUBS = [2000700019, 2000700020, 2000700021, 2000700022]
ENSURE_CLUBS = [135491, 2000561617]   # PSMS, De Red

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
def stgname(n):  # bentuk tercache seperti di aturan Championship
    return REC(('id', FCC('nmsn')), ('stgn', I64((n << 32) | n)), ('DBID', U8(n) if n < 256 else U16(n)))
def named(tag, n):
    return REC(('id', FCC(tag)), ('stgn', I64((n << 32) | n)), ('DBID', U8(n) if n < 256 else U16(n)))
def comp_ref(uid): return REC(('id', I(1668246896)), ('comp', I(uid)))
def F(fs, name):
    for k, v in fs:
        if k == T(name): return v
    raise KeyError(name)
def S(fs, name, val):
    for i, (k, v) in enumerate(fs):
        if k == T(name): fs[i] = (k, val); return
    fs.append((T(name), val))
def D(fs, name): fs[:] = [(k, v) for k, v in fs if k != T(name)]

flag, root = dbcarc.load_sicomps(SRC)
dbcrow = dbcarc.find(root, '/comps.dbc'); pre, f2, r2 = dbcarc.load_dbc(fmfio.get(dbcrow))
rows = {p.split('/')[-1]: row for p, row in fmfio.walk(r2)}
def put(row, d): row[2] = dbc.build(d); row[5] = None

ch = dbc.parse(fmfio.get(rows['comp_idn_league_two_1442.dbc']))
chf = ch['fields']; chst = F(chf, 'stgs')[1]
old_ln = dbc.parse(fmfio.get(rows['comp_idn_league_three_1439.dbc']))

d = copy.deepcopy(ch); fs = d['fields']
d['key'] = I(LN)
S(fs, 'comp', I(LN)); S(fs, 'levl', U8(2)); S(fs, 'fxri', U8(2))

# ---------- tanggal (pola tahun dasar 2000/2001) ----------
def fx(in1=None, mnsn=None, dyow=6, dyom=1, mont=1, year=2000, strl=21, time=1530):
    kv = [('strl', U8(strl)), ('time', U16(time))]
    if in1 is not None: kv.append(('in_1', U8(in1)))
    if mnsn is not None: kv.append(('mnsn', U8(mnsn)))
    kv += [('dyow', U8(dyow)), ('dyom', U8(dyom)), ('mont', U8(mont)), ('year', U16(year))]
    return REC(*kv)
old_fx = F(chf, 'fxds')[1]
keep = [x for x in old_fx if any(k == T('id_1') for k, _ in x[1]) and dbc.show(F(x[1], 'id_1')) in (2003398192, 2003398193, 1936023923)]
fxds = [fx(0, None, 7, 7, 11, 2000),          # babak grup mulai: Sabtu 7 Nov
        fx(1, None, 7, 13, 2, 2001),          # babak grup selesai: Sabtu 13 Feb
        fx(2, None, 7, 27, 2, 2001),          # 8 besar mulai: Sabtu 27 Feb
        fx(3, None, 7, 13, 3, 2001),          # 8 besar selesai: Sabtu 13 Mar
        fx(None, 19, 7, 20, 3, 2001, strl=2, time=1600),   # playoff promosi
        fx(None, 142, 1, 21, 3, 2001, strl=2, time=1900)]  # final
S(fs, 'fxds', LST(fxds + keep))

# ---------- tahap 0: babak grup ----------
s0 = copy.deepcopy(chst[1]); f0 = s0[1]
S(f0, 'indx', U8(0)); S(f0, 'ntms', U8(sum(GSIZE))); S(f0, 'ngps', U8(3)); S(f0, 'gnty', U8(0)); S(f0, 'nrds', U8(2))
sche = F(f0, 'sche')[1][0][1]
S(sche, 'dats', LST([REC(('in_1', U8(0))), REC(('in_1', U8(1)))]))
S(sche, 'sdfd', REC(('id', FCC('sdfd')), ('in_1', U8(0))))
S(sche, 'edfd', REC(('id', FCC('edfd')), ('in_1', U8(1))))
D(sche, 'brpd')
S(f0, 'tems', LST([REC(('id', U8(5))), REC(('id', U8(1)), ('comp', comp_ref(LN)))]))
def grp_rank(n):
    lv = [(0, 0, 5), (0, 0, 5), (6, 0, 6), (7,), (8,), (9,), (10,), (11,)][:n]
    if n == 7: lv[6] = (11,)
    out = []
    for i, t in enumerate(lv):
        kv = [('team', U8(i)), ('crk', U8(t[0]))]
        if len(t) == 3: kv += [('hgrk', U8(t[1])), ('lwrk', U8(t[2]))]
        out.append(REC(*kv))
    return LST(out)
gp = []
for i, (uid, n) in enumerate(zip(GRP, GSIZE)):
    gp.append(REC(('sche', LST([])), ('gpid', U8(i)), ('prio', U8(2)), ('comp', comp_ref(uid)),
                  ('ttac', BO(False)), ('ngrt', U8(n)), ('rank', grp_rank(n))))
S(f0, 'gpdt', LST(gp))
S(f0, 'ngrt', U8(8))
S(f0, 'rank', grp_rank(8))
S(f0, 'qurl', LST([REC(('nmsn', stgname(177)), ('nrpl', U8(2)), ('stag', U8(1)))]))
S(f0, 'exfp', LST([REC(('nrpl', U8(2)), ('olpl', U8(255)), ('nwpl', U8(0)), ('nptc', U8(1)))]))

# ---------- tahap 1: 8 besar, 2 grup x 4, satu putaran ----------
s1 = copy.deepcopy(chst[2]); f1 = s1[1]
for tag in ('exlg', 'gcfp', 'cftp', 'ExHG'): D(f1, tag)
S(f1, 'indx', U8(1)); S(f1, 'ntms', U8(8)); S(f1, 'ngps', U8(2)); S(f1, 'gnty', U8(0)); S(f1, 'grrl', I(0))
S(f1, 'ngrt', U8(4)); S(f1, 'nrds', U8(1))
S(f1, 'lgrl', F(chst[1][1], 'lgrl'))
S(f1, 'strq', LST([REC(('pref', BO(False)), ('stag', U8(0)))]))
S(f1, 'tems', LST([REC(('id', U8(2)), ('stag', U8(0)), ('nmsn', stgname(177)))]))
sc1 = F(f1, 'sche')[1][0][1]
S(sc1, 'dats', LST([REC(('in_1', U8(2))), REC(('in_1', U8(3)))]))
S(sc1, 'sdfd', REC(('id', FCC('sdfd')), ('in_1', U8(2))))
S(sc1, 'edfd', REC(('id', FCC('edfd')), ('in_1', U8(3))))
S(f1, 'gpdt', LST([]))
S(f1, 'rank', LST([REC(('team', U8(0)), ('crk', U8(0)), ('hgrk', U8(0)), ('lwrk', U8(1))),
                   REC(('team', U8(1)), ('crk', U8(2)), ('hgrk', U8(2)), ('lwrk', U8(3))),
                   REC(('team', U8(2)), ('crk', U8(4))), REC(('team', U8(3)), ('crk', U8(5)))]))
S(f1, 'qurl', LST([REC(('nmsn', stgname(142)), ('nrpl', U8(1)), ('stag', U8(2)))]))
S(f1, 'tppr', REC(('id', I(1953525874)), ('nrpl', U8(1)), ('nmsn', stgname(117)), ('stag', U8(2))))

# ---------- tahap 2: final + playoff promosi ----------
s2 = copy.deepcopy(chst[3]); f2s = s2[1]
S(f2s, 'indx', U8(2))
S(f2s, 'strq', LST([REC(('stag', U8(1)), ('pref', BO(False)), ('iEsT', BO(False)))]))
for t in F(f2s, 'tems')[1]: S(t[1], 'stag', U8(1))
for rnd in F(f2s, 'rnds')[1]:
    for tag, scale in (('wnpz', 10), ('lspz', 10)):
        try:
            r = F(rnd[1], tag)[1]; c = F(r, 'cash'); v = struct.unpack('<q' if c[0] == 0x0f else '<i', c[1])[0]
            S(r, 'cash', I(v // scale))
        except KeyError: pass
for a in F(f2s, 'ftac')[1]:
    try: S(F(a[1], 'Nxdv')[1], 'comp', I(CH)); D(F(a[1], 'Nxdv')[1], 'DBID')
    except KeyError: pass
S(fs, 'stgs', LST([s0, s1, s2]))

# ---------- bagian lain tingkat kompetisi ----------
rk = [(1, 0, 20), (1, 1, 20), (1, 3, 19), (1, 1, 19), (2, 7, None), (2, 7, None), (1, 7, None),
      (3, 17, None), (3, 17, None), (3, 15, None), (2, 15, None), (3, 5, None)]
assert sum(x[0] for x in rk) == sum(GSIZE)
rkli = []
for lv, (n, ty, nm) in enumerate(rk):
    kv = [('ntms', U8(n)), ('type', U8(ty)), ('levl', U8(lv))]
    if nm: kv.append(('mnsn', REC(('id', FCC('mnsn')), ('stgn', U8(nm)))))
    rkli.append(REC(*kv))
S(fs, 'rkli', LST(rkli))
tp = F(fs, 'Tp3t')[1]
for t in tp: S(t[1], 'stag', U8(2))
S(fs, 'sfal', LST([REC(('sfar', U8(2)), ('indx', U8(2)), ('sths', BO(True)))]))
S(fs, 'hlps', LST([REC(('type', U8(23)), ('comp', I(LN)))]))
S(fs, 'crgt', LST([REC(('year', U16(2025)), ('id', U8(1)), ('comp', comp_ref(u)), ('info', U8(i))) for i, u in enumerate(GRP)]))
S(fs, 'MGin', U8(17))
S(fs, 'typz', F(old_ln['fields'], 'typz'))
S(fs, 'itvm', F(old_ln['fields'], 'itvm'))
S(fs, 'MtTv', F(old_ln['fields'], 'MtTv'))
S(fs, 'file', STR('idn_league_three')); S(fs, 'XSvC', U8(2)); S(fs, 'Bran', U16(1439))
put(rows['comp_idn_league_three_1439.dbc'], d)

# ---------- daftar kompetisi negara ----------
row = rows['nation_idn_comps_1446.dbc']; nd = dbc.parse(fmfio.get(row)); nf = nd['fields']
retm = F(nf, 'retm')[1]
for r in retm:
    c = F(r[1], 'comp')[1]
    if dbc.show(F(c, 'comp')) == LN:
        for t in ('ntms', 'FBkt', 'Bktm', 'mntm'): D(r[1], t)
        S(r[1], 'mntm', U8(0))
tmpl = [r for r in retm if any(k == T('DbSt') for k, _ in r[1])][0]
for uid, n in zip(GRP, GSIZE):
    e = copy.deepcopy(tmpl); S(e[1], 'comp', REC(('id', FCC('comp')), ('comp', I(uid))))
    for t in ('Bktm', 'FBkt', 'ntms'): S(e[1], t, U8(n))
    retm.append(e)
put(row, nd)

newdbc, _ = fmfio.write(f2, r2); dbcrow[2] = pre + newdbc

# ---------- daftar muat FMM ----------
def edit_list(name, add):
    row = dbcarc.find(root, '/%s.dat' % name); b = fmfio.get(row); p8 = b[:8]; fl, rt, _ = fmfio.read(b[8:])
    for e in rt.files:
        if e[0] in (b'IDN-0', b'IDN-1', b'IDN-2'):
            data = fmfio.get(e); n = struct.unpack_from('<I', data, 8)[0]
            ids = set(struct.unpack_from('<%dI' % n, data, 12)) | set(add); ids = sorted(ids)
            e[2] = data[:8] + struct.pack('<I', len(ids)) + struct.pack('<%dI' % len(ids), *ids); e[5] = None
    nb, _ = fmfio.write(fl, rt); row[2] = p8 + nb
edit_list('fmm_comps', GRP)
edit_list('fmm_clubs', NEWCLUBS + ENSURE_CLUBS)

# ---------- comps.txt dan XML lama ----------
row = dbcarc.find(root, '/comps.txt'); t = fmfio.get(row)
assert b'idn_league_three(1439),1' in t
row[2] = t.replace(b'idn_league_three(1439),1', b'idn_league_three(1439),2')
def drop_file(f):
    for e in list(f.files):
        if e[0] == b'idn_league_three' and e[1] == b'.xml': f.files.remove(e); return True
    return any(drop_file(s) for s in f.subs)
assert drop_file(root)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
out, _ = fmfio.write(flag, root); open(OUT, 'wb').write(out); print('ok', len(out))
