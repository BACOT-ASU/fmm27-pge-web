#!/usr/bin/env python3
# B6: Liga 4 bayangan (41045091) + 3 klub untuk melengkapi Piala Indonesia (64 klub).
import sys, struct, os
sys.path.insert(0, '/home/claude/scripts')
import club, comp
SRC = '/home/claude/out/putaranB4/work/'
OUT = '/home/claude/out/putaranB6/work/'
os.makedirs(OUT, exist_ok=True)
L4_IDX, L4_UID = 1682, 41045091
NEW = {2000700023: ('Persid Jember', 'Persid', 'PERSID', 'PSID', 'PSJ'),
       2000700024: ('PS Mojokerto Putra', 'PS Mojokerto Putra', 'PSMP', 'PSMP', 'PMP'),
       2000700025: ('Persikoba Batu', 'Persikoba', 'PSKOBA', 'PSKB', 'PKB')}
TEMPLATE = 2000700017
def sb(v, ff=None):
    b = v.encode(); o = struct.pack('<I', len(b)) + b
    return o + (bytes([ff]) if ff is not None else b'')
# club.dat
d = open(SRC + 'club.dat', 'rb').read(); recs, end, L = club.parse(SRC + 'club.dat', verbose=False); assert end == L
tpl = recs[[r['uid'] for r in recs].index(TEMPLATE)]; tb = d[tpl['off']:tpl['off'] + tpl['len']]
def make(uid, names):
    p = 8; parts = []
    for ff in (1, 1, 0, 0, 0):
        l = struct.unpack_from('<I', tb, p)[0]; p += 4 + l; g = None
        if ff: g = tb[p]; p += 1
        parts.append(g)
    rest = bytearray(tb[p:])
    struct.pack_into('<hh', rest, 0, 58, 58)
    o = 4 + 12 + 132 + 10
    struct.pack_into('<h', rest, o, L4_IDX); struct.pack_into('<h', rest, o + 7, L4_IDX)
    head = bytearray(tb[:8]); struct.pack_into('<I', head, 4, uid)
    return bytes(head) + b''.join(sb(names[i], parts[i]) for i in range(5)) + bytes(rest)
assert max(r['uid'] for r in recs) < min(NEW)
body = d[12:] + b''.join(make(u, n) for u, n in sorted(NEW.items()))
open(OUT + 'club.dat', 'wb').write(d[:8] + struct.pack('<I', len(recs) + len(NEW)) + body)
# .lng
for f in [f for f in os.listdir(SRC) if f.endswith('.lng')]:
    b = open(SRC + f, 'rb').read(); n = struct.unpack_from('<I', b, 8)[0]; assert n == len(recs)
    p = 12
    for i in range(n):
        p += 4
        for ff in (1, 1, 0, 0):
            l = struct.unpack_from('<I', b, p)[0]; p += 4 + l + (1 if ff else 0)
    # flag byte nama panjang/pendek diambil dari entri Gresik
    q = b.find(struct.pack('<I', TEMPLATE) + struct.pack('<I', len('Gresik United FC')) + b'Gresik United FC')
    g1 = b[q + 8 + 16]; l2 = struct.unpack_from('<I', b, q + 8 + 17)[0]; g2 = b[q + 8 + 17 + 4 + l2]
    add = b''.join(struct.pack('<I', u) + sb(nm[0], g1) + sb(nm[1], g2) + sb(nm[2]) + sb(nm[3]) for u, nm in sorted(NEW.items()))
    open(OUT + f, 'wb').write(b[:8] + struct.pack('<I', n + len(NEW)) + b[12:p] + add + b[p:])
# competition.dat
cd = open(SRC + 'competition.dat', 'rb').read(); cs, cend, cL = comp.parse(SRC + 'competition.dat'); assert cend == cL
assert len(cs) == L4_IDX and L4_UID not in [c['uid'] for c in cs]
ln = cs[1678]; offs = [c['off'] for c in cs] + [cend]; lb = bytearray(cd[offs[1678]:offs[1679]])
p = 6; gs = []
for ff in (1, 1, 0):
    l = struct.unpack_from('<I', lb, p)[0]; p += 4 + l; g = None
    if ff: g = lb[p]; p += 1
    gs.append(g)
rest = bytearray(lb[p:])
struct.pack_into('<H', rest, 9, 40); rest[11] = 3; struct.pack_into('<h', rest, 12, -1)
rec = struct.pack('<HI', L4_IDX, L4_UID) + sb('Liga 4', gs[0]) + sb('Liga 4', gs[1]) + sb('L4') + bytes(rest)
open(OUT + 'competition.dat', 'wb').write(cd[:8] + struct.pack('<H', len(cs) + 1) + cd[10:] + rec)
print('ok')
