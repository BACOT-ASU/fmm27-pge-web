#!/usr/bin/env python3
# B6: Piala Indonesia dari kompetisi grup + Liga 4 bayangan; liga cadangan tingkat 3.
import sys, struct, copy, os
sys.path.insert(0, '/home/claude/scripts')
import dbcarc, fmfio, dbc
SRC = '/home/claude/out/putaranB5b/kirim/assets/shared/data/sicomps.fmf'
OUT = '/home/claude/out/putaranB6/kirim/assets/shared/data/sicomps.fmf'
SL, CH, LN, L4 = 41004312, 41042740, 41042746, 41045091
CHG = [41042741, 41042742]; LNG = [2000700101, 2000700102, 2000700103]
L4CLUBS = [2000700023, 2000700024, 2000700025]
T = lambda s: s.ljust(4)[::-1].encode('latin1')
I = lambda n: (0x01, struct.pack('<i', n)); U8 = lambda n: (0x11, bytes([n]))
FCC = lambda s: (0x02, s.encode('latin1')[::-1])
REC = lambda *kv: (0x0a, [(T(k), v) for k, v in kv]); LST = lambda items: (0x0b, list(items))
def F(fs, n):
    for k, v in fs:
        if k == T(n): return v
    raise KeyError(n)
def has(fs, n): return any(k == T(n) for k, _ in fs)
def S(fs, n, val):
    for i, (k, v) in enumerate(fs):
        if k == T(n): fs[i] = (k, val); return
    fs.append((T(n), val))
def D(fs, *ns): fs[:] = [(k, v) for k, v in fs if k not in [T(n) for n in ns]]
flag, root = dbcarc.load_sicomps(SRC)
dbcrow = dbcarc.find(root, '/comps.dbc'); pre, f2, r2 = dbcarc.load_dbc(fmfio.get(dbcrow))
rows = {(row[0] + row[1]).decode(): row for row in r2.files}
def edit(name, fn):
    d = dbc.parse(fmfio.get(rows[name])); fn(d); rows[name][2] = dbc.build(d); rows[name][5] = None

def cup(d):
    fs = d['fields']; st = F(fs, 'stgs')[1][0][1]
    def comp_of(t):
        c = F(t[1], 'comp')[1]
        return dbc.show(F(c, 'DBID')) if has(c, 'DBID') else dbc.show(F(c, 'comp'))
    new = []
    for t in F(st, 'tems')[1]:
        c = comp_of(t)
        kids = {CH: CHG, LN: LNG}.get(c)
        if kids:
            for k in kids:
                e = copy.deepcopy(t); S(e[1], 'comp', REC(('id', I(1668246896)), ('comp', I(k)))); new.append(e)
        elif c == L4:
            e = copy.deepcopy(t); S(e[1], 'comp', REC(('id', I(1668246896)), ('comp', I(L4)))); new.append(e)
        else:
            new.append(t)
    S(st, 'tems', LST(new)); S(fs, 'inac', (0x03, b'\x00'))
    S(fs, 'XSvC', U8((dbc.show(F(fs, 'XSvC')) + 1) & 255))
edit('comp_idn_cup_1438.dbc', cup)

def nation(d):
    nf = d['fields']
    for r in F(nf, 'retm')[1]:
        c = F(r[1], 'comp')[1]; cid = dbc.show(F(c, 'DBID')) if has(c, 'DBID') else dbc.show(F(c, 'comp'))
        if cid == L4:
            D(r[1], 'mntm', 'ntms', 'FBkt', 'Bktm'); S(r[1], 'ntms', U8(3)); S(r[1], 'FBkt', U8(3)); S(r[1], 'Bktm', U8(3))
    cm = F(nf, 'cmps')[1]
    assert any(dbc.show(F(F(e[1], 'comp')[1], 'comp')) == 7746536 for e in cm), 'Piala Indonesia tidak aktif'
edit('nation_idn_comps_1446.dbc', nation)

def reserves(d):
    lst = F(d['fields'], 'rsvl')[1]
    lv1 = [e for e in lst if has(e[1], 'levl') and dbc.show(F(e[1], 'levl')) == 1][0]
    e = copy.deepcopy(lv1); S(e[1], 'levl', U8(2))
    S(e[1], 'sdfd', REC(('id', FCC('sdfd')), ('in_1', U8(0)), ('comp', REC(('id', FCC('comp')), ('comp', I(CHG[0]))))))
    S(e[1], 'edfd', REC(('id', FCC('edfd')), ('comp', REC(('id', FCC('comp')), ('comp', I(CHG[0])))), ('in_1', U8(1))))
    S(e[1], 'nmdt', U8(24))
    lst.append(e)
    S(d['fields'], 'XSvC', U8(dbc.show(F(d['fields'], 'XSvC')) + 1))
edit('nation_idn_reserve_comps_1446.dbc', reserves)
newdbc, _ = fmfio.write(f2, r2); dbcrow[2] = pre + newdbc

def edit_list(name, add):
    row = dbcarc.find(root, '/%s.dat' % name); b = fmfio.get(row); p8 = b[:8]; fl, rt, _ = fmfio.read(b[8:])
    for e in rt.files:
        if e[0] in (b'IDN-0', b'IDN-1', b'IDN-2'):
            data = fmfio.get(e); n = struct.unpack_from('<I', data, 8)[0]
            ids = sorted(set(struct.unpack_from('<%dI' % n, data, 12)) | set(add))
            e[2] = data[:8] + struct.pack('<I', len(ids)) + struct.pack('<%dI' % len(ids), *ids); e[5] = None
    nb, _ = fmfio.write(fl, rt); row[2] = p8 + nb
edit_list('fmm_comps', [L4]); edit_list('fmm_clubs', L4CLUBS)

row = dbcarc.find(root, '/comps.txt'); t = fmfio.get(row).decode()
import re
def bump(m): return '%s,%d' % (m.group(1), int(m.group(2)) + 1)
t = re.sub(r'^(idn_cup\(1438\)),(\d+)', bump, t, flags=re.M)
t = re.sub(r'^(idn_reserve_comps\(1446\)),(\d+)', bump, t, flags=re.M)
row[2] = t.encode()
os.makedirs(os.path.dirname(OUT), exist_ok=True)
out, _ = fmfio.write(flag, root); open(OUT, 'wb').write(out); print('ok', len(out))
