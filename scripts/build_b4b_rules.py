#!/usr/bin/env python3
# B4b: kunci pembagian grup untuk tahun mulai game 2026 (crgt + gptm).
import sys, struct, copy, os
sys.path.insert(0, '/home/claude/scripts')
import dbcarc, fmfio, dbc, club

SRC = '/home/claude/out/putaranB4/kirim/assets/shared/data/sicomps.fmf'
OUT = '/home/claude/out/putaranB4b/kirim/assets/shared/data/sicomps.fmf'
YEAR = 2026
recs, _, _ = club.parse('/home/claude/out/putaranB4/work/club.dat', verbose=False)
def members(div): return sorted(r['uid'] for r in recs if r['div'] == div)
CH_G = [(41042741, members(1672)), (41042742, members(1673))]
LN_G = [(2000700101, members(1679)), (2000700102, members(1680)), (2000700103, members(1681))]
assert [len(m) for _, m in CH_G] == [10, 10] and [len(m) for _, m in LN_G] == [7, 8, 8]

T = lambda s: s.ljust(4)[::-1].encode('latin1')
I = lambda n: (0x01, struct.pack('<i', n))
U8 = lambda n: (0x11, bytes([n]))
U16 = lambda n: (0x12, struct.pack('<H', n))
I64 = lambda n: (0x0f, struct.pack('<q', n))
BO = lambda b: (0x03, bytes([1 if b else 0]))
FCC = lambda s: (0x02, s.encode('latin1')[::-1])
REC = lambda *kv: (0x0a, [(T(k), v) for k, v in kv])
LST = lambda items: (0x0b, list(items))
def F(fs, name):
    for k, v in fs:
        if k == T(name): return v
    raise KeyError(name)
def S(fs, name, val):
    for i, (k, v) in enumerate(fs):
        if k == T(name): fs[i] = (k, val); return
    fs.append((T(name), val))
def team_ref(uid, tag='team'):
    return REC(('id', FCC(tag)), ('Ttea', I64((uid << 32) | uid)), ('DBID', I(uid)))

def add_registration(fs, groups):
    lst = F(fs, 'crgt')[1] if any(k == T('crgt') for k, _ in fs) else []
    lst = [x for x in lst if dbc.show(F(x[1], 'year')) != YEAR]
    for gi, (cuid, _) in enumerate(groups):
        lst.append(REC(('year', U16(YEAR)), ('id', U8(1)), ('comp', REC(('id', I(1668246896)), ('comp', I(cuid)))), ('info', U8(gi))))
    for gi, (_, uids) in enumerate(groups):
        for u in uids:
            lst.append(REC(('year', U16(YEAR)), ('info', U8(gi)), ('Ttea', team_ref(u, 'Ttea'))))
    S(fs, 'crgt', LST(lst))
def pin(stage_fs, groups):
    S(stage_fs, 'gptm', LST([REC(('gpid', U8(gi)), ('year', U16(YEAR)), ('team', team_ref(u)), ('UGGT', BO(True)))
                             for gi, (_, uids) in enumerate(groups) for u in uids]))

flag, root = dbcarc.load_sicomps(SRC)
dbcrow = dbcarc.find(root, '/comps.dbc'); pre, f2, r2 = dbcarc.load_dbc(fmfio.get(dbcrow))
rows = {p.split('/')[-1]: row for p, row in fmfio.walk(r2)}
def put(row, d): row[2] = dbc.build(d); row[5] = None

for name, groups, stages in (('comp_idn_league_two_1442.dbc', CH_G, (0, 1)), ('comp_idn_league_three_1439.dbc', LN_G, (0,))):
    row = rows[name]; d = dbc.parse(fmfio.get(row)); fs = d['fields']
    add_registration(fs, groups)
    st = F(fs, 'stgs')[1]
    for i in stages: pin(st[i][1], groups)
    put(row, d)

newdbc, _ = fmfio.write(f2, r2); dbcrow[2] = pre + newdbc
os.makedirs(os.path.dirname(OUT), exist_ok=True)
out, _ = fmfio.write(flag, root); open(OUT, 'wb').write(out); print('ok', len(out))
