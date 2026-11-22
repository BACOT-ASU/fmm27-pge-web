#!/usr/bin/env python3
# B4: susunan klub 2026/27 + kompetisi grup Liga Nusantara.
import sys, struct, json, os
sys.path.insert(0, '/home/claude/scripts')
import club, comp

SRC = '/home/claude/out/putaranB1/work/'
OUT = '/home/claude/out/putaranB4/work/'
os.makedirs(OUT, exist_ok=True)

SL, CH, CHB, CHT, LN = 1670, 1671, 1672, 1673, 1678
LNA, LNB, LNC = 1679, 1680, 1681
LN_UIDS = {LNA: 2000700101, LNB: 2000700102, LNC: 2000700103}

# ---------- susunan klub (uid -> divisi) ----------
ASSIGN = {
    SL: [5622736, 7742801, 41053239, 41021352, 2000090667, 2000465597, 2000561624, 2000561620, 41051597,
         116145, 116140, 116144, 5622745, 5622879, 5622746, 135500, 135494, 5622747],
    CHB: [2000185211, 2000700019, 5385015, 135512, 41042730, 135497, 135491, 5622732, 135534, 2000465590],
    CHT: [135531, 2000561617, 135528, 2000004193, 7741454, 5623382, 135515, 5622862, 41001022, 2000185227],
    LNA: [2000700007, 2000700011, 2000700008, 2000700004, 2000700002, 2000700003, 2000700006],
    LNB: [2000700017, 2000700015, 2000700012, 7742876, 41001012, 2000700018, 2000700001, 2000700010],
    LNC: [2000700005, 2000700020, 7742798, 2000700016, 2000700014, 2000700021, 2000700013, 2000700022],
}
# klub yang keluar dari ketiga strata
DROP = [41010806, 2000466001, 2000700009]   # Persibas Banyumas, Waanal Brothers, Perserang Serang
# ganti nama: uid -> (long, short, n6, c4, c3 atau None=tetap)
RENAME = {
    41042730: ('PSGC Ciamis', 'PSGC', 'PSGC', 'PSGC', None),
    2000465590: ('Sumsel United FC', 'Sumsel United', 'SUMSEL', 'SSU', None),
    135528: ('Deltras FC', 'Deltras', 'DELTRA', 'DRS', None),
    2000700010: ('Putra Sang Fajar FC', 'Putra Sang Fajar', 'PSFAJR', 'PSF', 'PSF'),
    2000700014: ('Persinab Nabire', 'Persinab', 'PSINAB', 'PSNB', 'PNB'),
    2000700002: ('Persikotas Nusantara', 'Persikotas', 'PKOTAS', 'PKTS', 'PKT'),
    2000700003: ('Pesik Kuningan', 'Pesik', 'PESIK', 'PSKK', 'PSK'),
    2000700006: ('Persekat Tegal', 'Persekat', 'PSEKAT', 'PSKT', 'PKE'),
    2000700012: ('Persibangga Purbalingga', 'Persibangga', 'PSBNGA', 'PSBG', 'PBG'),
    2000700018: ('Persinga Ngawi', 'Persinga', 'PSINGA', 'PSNG', 'PNG'),
    2000700005: ('Donggala United FC', 'Donggala United', 'DONGGA', 'DUFC', 'DGL'),
}
NEW = {   # klub baru, disalin dari catatan Gresik United (klon B1)
    2000700019: ('Persikad Depok', 'Persikad', 'PSIKAD', 'PSKD', 'PKD'),
    2000700020: ('Pasuruan United', 'Pasuruan United', 'PASUTD', 'PSRU', 'PSU'),
    2000700021: ('Persipani Paniai', 'Persipani', 'PSPANI', 'PSPN', 'PPN'),
    2000700022: ('PSN Ngada', 'PSN Ngada', 'PSNNGD', 'PSNN', 'PSN'),
}
TEMPLATE = 2000700017

def sbytes(v, ff=None):
    b = v.encode('utf-8'); out = struct.pack('<I', len(b)) + b
    if ff is not None: out += bytes([ff])
    return out

# ---------- club.dat ----------
d = open(SRC + 'club.dat', 'rb').read()
recs, end, L = club.parse(SRC + 'club.dat', verbose=False)
assert end == L
by = {r['uid']: r for r in recs}
def rec_bytes(r): return bytearray(d[r['off']:r['off'] + r['len']])
def split_names(b):
    # kembalikan (prefix8, [(teks, gbyte|None)x5], rest)
    p = 8; parts = []
    for ff in (1, 1, 0, 0, 0):
        l = struct.unpack_from('<I', b, p)[0]; t = b[p + 4:p + 4 + l].decode('utf-8'); p += 4 + l
        g = None
        if ff: g = b[p]; p += 1
        parts.append((t, g))
    return bytes(b[:8]), parts, bytes(b[p:])
def join_names(pre, parts, rest):
    out = bytearray(pre)
    for t, g in parts: out += sbytes(t, g)
    return out + rest
def renamed(b, names):
    pre, parts, rest = split_names(b)
    new = [(names[i] if (i < 4 or names[4] is not None) else parts[i][0], parts[i][1]) for i in range(5)]
    return join_names(pre, new, rest), len(join_names(pre, new, rest)) - len(rest)
def set_div(b, div):
    pre, parts, rest = split_names(b)
    head = len(b) - len(rest)            # rest dimulai di field negara
    o_div = head + 4 + 12 + 132 + 10
    struct.pack_into('<hh', b, head, 58, 58)
    struct.pack_into('<h', b, o_div, div)
    struct.pack_into('<h', b, o_div + 7, div)   # divisi musim lalu
    return b

newrecs = {}
target = {}
for div, uids in ASSIGN.items():
    for u in uids: target[u] = div
for u in DROP: target[u] = -1
assert len(set(sum(ASSIGN.values(), []))) == sum(len(v) for v in ASSIGN.values()), 'uid dobel'

out_recs = []
for r in recs:
    b = rec_bytes(r)
    if r['uid'] in RENAME: b, _ = renamed(b, RENAME[r['uid']])
    if r['uid'] in target: b = set_div(b, target[r['uid']])
    out_recs.append((r['uid'], bytes(b)))
tpl = rec_bytes(by[TEMPLATE])
for u, names in sorted(NEW.items()):
    assert u not in by
    b = bytearray(tpl); struct.pack_into('<I', b, 4, u)
    b, _ = renamed(b, names); b = set_div(b, target[u])
    out_recs.append((u, bytes(b)))
out_recs.sort(key=lambda x: x[0])
clubdat = d[:8] + struct.pack('<I', len(out_recs)) + b''.join(b for _, b in out_recs)
open(OUT + 'club.dat', 'wb').write(clubdat)

# ---------- 16 file .lng ----------
LNG = [f for f in os.listdir(SRC) if f.endswith('.lng')]
assert len(LNG) == 16, LNG
for f in LNG:
    b = open(SRC + f, 'rb').read()
    n = struct.unpack_from('<I', b, 8)[0]; assert n == len(recs)
    p = 12; ent = []
    for i in range(n):
        st = p; uid = struct.unpack_from('<I', b, p)[0]; p += 4
        fl = []
        for ff in (1, 1, 0, 0):
            l = struct.unpack_from('<I', b, p)[0]; t = b[p + 4:p + 4 + l]; p += 4 + l
            g = None
            if ff: g = b[p]; p += 1
            fl.append((t, g))
        ent.append([uid, fl])
    tail = b[p:]
    tplent = [e for e in ent if e[0] == TEMPLATE][0]
    for e in ent:
        if e[0] in RENAME:
            nm = RENAME[e[0]]; e[1] = [(nm[i].encode('utf-8'), e[1][i][1]) for i in range(4)]
    for u, nm in sorted(NEW.items()):
        ent.append([u, [(nm[i].encode('utf-8'), tplent[1][i][1]) for i in range(4)]])
    ent.sort(key=lambda e: e[0])
    assert [e[0] for e in ent] == [u for u, _ in out_recs]
    body = bytearray()
    for uid, fl in ent:
        body += struct.pack('<I', uid)
        for t, g in fl:
            body += struct.pack('<I', len(t)) + t
            if g is not None: body.append(g)
    open(OUT + f, 'wb').write(b[:8] + struct.pack('<I', len(ent)) + bytes(body) + tail)

# ---------- competition.dat ----------
cd = open(SRC + 'competition.dat', 'rb').read()
cs, cend, cL = comp.parse(SRC + 'competition.dat'); assert cend == cL
offs = [c['off'] for c in cs] + [cend]
raw = {c['idx']: bytearray(cd[offs[i]:offs[i + 1]]) for i, c in enumerate(cs)}
def comp_rename(b, longn, shortn, abbr):
    p = 6; parts = []
    for ff in (1, 1, 0):
        l = struct.unpack_from('<I', b, p)[0]; t = b[p + 4:p + 4 + l].decode(); p += 4 + l
        g = None
        if ff: g = b[p]; p += 1
        parts.append(g)
    rest = b[p:]
    out = bytearray(b[:6]) + sbytes(longn, parts[0]) + sbytes(shortn, parts[1]) + sbytes(abbr) + rest
    return out, len(out) - len(rest)
raw[CHB], _ = comp_rename(raw[CHB], 'Pegadaian Championship Grup Barat', 'Grup Barat', 'CHB')
raw[CHT], _ = comp_rename(raw[CHT], 'Pegadaian Championship Grup Timur', 'Grup Timur', 'CHT')
for idx, (nm, sh, ab) in zip((LNA, LNB, LNC), (('Liga Nusantara Grup A', 'Grup A', 'LNA'), ('Liga Nusantara Grup B', 'Grup B', 'LNB'), ('Liga Nusantara Grup C', 'Grup C', 'LNC'))):
    b = bytearray(raw[LN]); struct.pack_into('<HI', b, 0, idx, LN_UIDS[idx])
    b, fixed = comp_rename(b, nm, sh, ab)
    struct.pack_into('<h', b, fixed + 12, LN)      # induk = Liga Nusantara
    raw[idx] = b
n = len(raw); assert sorted(raw) == list(range(n))
compdat = cd[:8] + struct.pack('<H', n) + b''.join(bytes(raw[i]) for i in range(n))
open(OUT + 'competition.dat', 'wb').write(compdat)
json.dump({'new_clubs': sorted(NEW), 'ln_groups': LN_UIDS}, open(OUT + 'b4_ids.json', 'w'))
print('club.dat', len(out_recs), 'competition.dat', n)
