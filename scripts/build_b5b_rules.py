#!/usr/bin/env python3
# B5b: kompetisi induk jadi "divisi induk" (ftye 3 + chdc + dcin) seperti Serie C.
import sys, struct, os
sys.path.insert(0, '/home/claude/scripts')
import dbcarc, fmfio, dbc
SRC = '/home/claude/out/putaranB5/kirim/assets/shared/data/sicomps.fmf'
OUT = '/home/claude/out/putaranB5b/kirim/assets/shared/data/sicomps.fmf'
T = lambda s: s.ljust(4)[::-1].encode('latin1')
I = lambda n: (0x01, struct.pack('<i', n)); U8 = lambda n: (0x11, bytes([n]))
REC = lambda *kv: (0x0a, [(T(k), v) for k, v in kv]); LST = lambda items: (0x0b, list(items))
def S(fs, name, val, pos=None):
    for i, (k, v) in enumerate(fs):
        if k == T(name): fs[i] = (k, val); return
    if pos is None: fs.append((T(name), val))
    else: fs.insert(pos, (T(name), val))
flag, root = dbcarc.load_sicomps(SRC)
dbcrow = dbcarc.find(root, '/comps.dbc'); pre, f2, r2 = dbcarc.load_dbc(fmfio.get(dbcrow))
rows = {(row[0] + row[1]).decode(): row for row in r2.files}
def edit(name, fn):
    d = dbc.parse(fmfio.get(rows[name])); fn(d); rows[name][2] = dbc.build(d); rows[name][5] = None
def parent(children):
    def fn(d):
        d['hdr'] = bytes.fromhex('03010000'); fs = d['fields']
        S(fs, 'ftye', U8(3)); S(fs, 'dcin', U8(len(children)))
        i = [k for k, _ in fs].index(T('bsyr')) + 1
        S(fs, 'chdc', LST([REC(('comp', I(c))) for c in children]), pos=i)
    return fn
def child(n):
    def fn(d):
        d['hdr'] = bytes.fromhex('02010000'); S(d['fields'], 'dcin', U8(n))
    return fn
edit('comp_idn_league_two_1442.dbc', parent([41042741, 41042742]))
edit('comp_idn_league_three_1439.dbc', parent([2000700101, 2000700102, 2000700103]))
edit('comp_idn_league_two_groups_1442.dbc', child(2))
edit('comp_idn_league_three_group_a_1439.dbc', child(3))
edit('comp_idn_league_three_groups_bc_1439.dbc', child(3))
newdbc, _ = fmfio.write(f2, r2); dbcrow[2] = pre + newdbc
os.makedirs(os.path.dirname(OUT), exist_ok=True)
out, _ = fmfio.write(flag, root); open(OUT, 'wb').write(out); print('ok', len(out))
