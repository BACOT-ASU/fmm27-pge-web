#!/usr/bin/env python3
# B7a: stadion untuk klub tanpa stadion (club.dat u16 di o_div+5), stadion baru di stadium.dat,
#      youth rating Indonesia di nation.dat (byte kandidat, 1 -> YOUTH).
import sys, struct, os
sys.path.insert(0, '/home/claude/scripts')
import fmfio, club, stadium
SRC = '/home/claude/out/putaranB6b/kirim/assets/data/game/db_archive_2706.fmf'
OUT = '/home/claude/out/putaranB7a/kirim/assets/data/game/'
YOUTH = 10
d = open(SRC, 'rb').read(); flag, root, _ = fmfio.read(d)
rows = {p.split('/')[-1]: r for p, r in fmfio.walk(root)}
def tmp(name, b): open('/tmp/b7_' + name, 'wb').write(b); return '/tmp/b7_' + name
# ---- stadium.dat
sd = fmfio.get(rows['stadium.dat']); S, e, L = stadium.parse(tmp('stadium.dat', sd)); assert e == L
byname = {x['name']: x for x in S}
def cityof(n): return byname[n]['city']
NEW = [  # nama, kapasitas, kota diambil dari stadion
    ('Gelora Bumi Kartini', 20000, 'Wergu Wetan'),
    ('Tuah Pahoe', 15000, '17 Mei'),
    ('Soemantri Brodjonegoro', 5000, 'Jakarta International Stadium'),
    ('Yos Sudarso', 15000, 'Goentoer Darjono'),
    ('Angkatan 45', 5000, 'Manahan'),
    ('Joyokusumo', 15000, 'Wergu Wetan'),
    ('Ketonggo', 10000, 'Wilis'),
    ('Untung Suropati', 10000, 'Raden Soedarsono-Pogar'),
    ('Lebijaga', 5000, 'Gelora Ngurah Rai'),
    ('Gajah Mada Mojosari', 15000, 'Gelora Delta'),
    ('Kompyang Sujana', 8000, 'Gelora Ngurah Rai'),
    ('Kudungga', 15000, 'Segiri'),
    ('Kota Lama', 10000, 'Cendrawasih'),
]
tpl = byname['Gelora Joko Samudro']; tb = sd[tpl['off']:tpl['off'] + tpl['len']]
n0 = len(S); add = b''; newidx = {}
for i, (nm, cap, cs) in enumerate(NEW):
    idx = n0 + i; uid = 2000700201 + i; nb = nm.encode()
    rec = struct.pack('<IIHII', idx, uid, cityof(cs), cap, int(cap * 1.5)) + struct.pack('<I', len(nb)) + nb + struct.pack('<I', 0) + bytes.fromhex(tpl['tail'])
    add += rec; newidx[nm] = (idx, uid)
sd2 = sd[:8] + struct.pack('<H', n0 + len(NEW)) + sd[10:] + add
S2, e, L = stadium.parse(tmp('stadium2.dat', sd2)); assert e == L and len(S2) == n0 + len(NEW)
def sidx(nm): return newidx[nm][0] if nm in newidx else byname[nm]['idx']
# ---- club.dat
HOME = {
 'Persijap Jepara': 'Gelora Bumi Kartini', 'Isenmulang Kalteng FC': 'Tuah Pahoe', 'Persiraja Banda Aceh': 'Harapan Bangsa',
 'Persikad Depok': 'Merpati', 'Persikotas Nusantara': 'Wiradadaha', 'Pesik Kuningan': 'Mashud Wisnusaputra',
 'Batavia FC': 'Soemantri Brodjonegoro', 'Persekat Tegal': 'Yos Sudarso', 'Pekanbaru FC': 'Kaharuddin Nasution',
 'Persikota Tangerang': 'Benteng Reborn', 'Persitara Jakarta Utara': 'Wibawa Mukti', 'Persika Karanganyar': 'Angkatan 45',
 'Persipa Pati': 'Joyokusumo', 'Putra Sang Fajar FC': 'Gelora Supriyadi', 'Persibangga Purbalingga': 'Goentoer Darjono',
 'Persiba Bantul': 'Sultan Agung', 'Gresik United FC': 'Gelora Joko Samudro', 'Persinga Ngawi': 'Ketonggo',
 'Donggala United FC': 'Gawalise', 'Persikutim United': 'Kudungga', 'Persinab Nabire': 'Kota Lama',
 'Perseden Denpasar': 'Kompyang Sujana', 'Pasuruan United': 'Untung Suropati', 'Persipani Paniai': 'Kota Lama',
 'PSN Ngada': 'Lebijaga', 'Persid Jember': 'Notohadinegoro', 'PS Mojokerto Putra': 'Gajah Mada Mojosari',
 'Persikoba Batu': 'Gelora Brantas',
}
cd = bytearray(fmfio.get(rows['club.dat'])); C, e, L = club.parse(tmp('club.dat', bytes(cd)), verbose=False); assert e == L
done = set()
for x in C:
    if x['nat'] == 58 and 1670 <= x['div'] <= 1682 and x['long'] in HOME:
        o = x['o_div'] + 5; assert struct.unpack_from('<H', cd, o)[0] == x['rep'] == 0xFFFF, x['long']
        struct.pack_into('<H', cd, o, sidx(HOME[x['long']])); done.add(x['long'])
assert done == set(HOME), set(HOME) - done
# ---- nation.dat: youth rating Indonesia
nd = bytearray(fmfio.get(rows['nation.dat']))
i = nd.find(b'\x71\x00\x00\x00\x3a\x00\x09\x00\x00\x00Indonesia\xff'); assert i > 0
k = nd.find(b'\xff\x7f\xd4\x00\x00\x00\xff\x7f', i); assert 0 < k - i < 120
q = k + 8 + 3; assert nd[q] == 1, nd[q]; nd[q] = YOUTH
rows['stadium.dat'][2] = sd2; rows['club.dat'][2] = bytes(cd); rows['nation.dat'][2] = bytes(nd)
for r in ('stadium.dat', 'club.dat', 'nation.dat'): rows[r][5] = None
os.makedirs(OUT, exist_ok=True)
out, _ = fmfio.write(flag, root); open(OUT + 'db_archive_2706.fmf', 'wb').write(out)
import json; json.dump({k: list(v) for k, v in newidx.items()}, open('/home/claude/out/putaranB7a/new_stadiums.json', 'w'), indent=1)
print('db', len(out), 'stadion baru', len(NEW), 'klub', len(done), 'youth', YOUTH)
