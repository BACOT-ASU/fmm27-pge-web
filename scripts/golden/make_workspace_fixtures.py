"""Arsip SINTETIS (bukan data game) untuk uji Workspace: db_archive, sicomps, pictures_logos.
Isi memakai fixture tests/fixtures/{db,more}. Arsip bersarang (comps.dbc, fmm_*.dat) = prefix 8 byte + .fmf flag 3.
Jalankan: python3 scripts/golden/make_workspace_fixtures.py
"""
import os, struct, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import fmfio  # noqa: E402
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
F = os.path.join(ROOT, 'tests', 'fixtures')
OUT = os.path.join(F, 'workspace')
T = 1_763_800_000
FT = 134_078_400_000_000_000  # waktu gaya sicomps (> 2^53)
rd = lambda *p: open(os.path.join(F, *p), 'rb').read()
HDR = bytes([0x03, 0x01, 0x74, 0x61, 0x64, 0x2E, 0x01, 0x00])

def nation():
    out = b''
    for i in range(61):
        nm = ('Indonesia' if i == 58 else f'Negara {i}').encode()
        out += struct.pack('<IHI', 1000 + i, i, len(nm)) + nm + b'\xff' + b'\x00' * 5 + bytes([0xff, 0x7f, 0xd4, 0, 0, 0, 0xff, 0x7f]) + bytes([0, 1, 0, 1 if i == 58 else 13, 1, 5, 0, 9, 0])
    return HDR + struct.pack('<H', 61) + out

def lng(names):
    body = b''.join(struct.pack('<I', u) + struct.pack('<I', len(a.encode())) + a.encode() + b'\x00' + struct.pack('<I', len(b.encode())) + b.encode() + b'\x00' + struct.pack('<I', 3) + b'ABC' + struct.pack('<I', 4) + b'ABCD' for u, a, b in names)
    return HDR + struct.pack('<I', len(names)) + body

def inner(flag, files, prefix):
    r = fmfio.Folder(b'inner')
    for n, e, d in files: r.files.append([n, e, d, FT, FT])
    out, _ = fmfio.write(flag, r)
    return prefix + out

def main():
    os.makedirs(OUT, exist_ok=True)
    clubs = [(116140, 'Persib Bandung', 'Persib'), (116144, 'Persija Jakarta', 'Persija'), (2000700017, 'Gresik United', 'Gresik Utd'), (5, 'Klub Ñandú', 'Ñandú')]
    db = fmfio.Folder(b'db_archive_2706')
    for n, d in [('club', rd('db', 'club.dat.bin')), ('competition', rd('db', 'competition.dat.bin')), ('stadium', rd('more', 'stadium.dat.bin')),
                 ('rivalries', rd('more', 'rivalries.dat.bin')), ('nation', nation())]:
        db.files.append([n.encode(), b'.dat', d, T, T])
    db.files.append([b'eng', b'.lng', lng(clubs), T, T])
    db.files.append([b'ind', b'.lng', lng(clubs), T, T])
    open(os.path.join(OUT, 'db_archive_2706.fmf.bin'), 'wb').write(fmfio.write(0, db)[0])

    lst = rd('more', 'IDN-0.dat.bin')
    pre_dat = bytes([0x03, 0x01, 0x74, 0x61, 0x64, 0x2E, 0x01, 0x00])
    pre_dbc = bytes([0x03, 0x01, 0x63, 0x62, 0x64, 0x2E, 0x04, 0x00])
    sc = fmfio.Folder(b'sicomps')
    sc.files.append([b'comps', b'.dbc', inner(3, [(b'comp_idn_league_two_1442', b'.dbc', rd('more', 'entry.dbc.bin')), (b'fixtures_1', b'.dbc', bytes(25))], pre_dbc), FT, FT])
    sc.files.append([b'comps', b'.txt', b'idn_cup(1438),38\nidn_league_two(1442),241\n', FT, FT])
    y = fmfio.Folder(b'2700')
    for n in ('fmm_stadiums', 'fmm_clubs', 'fmm_people'):
        y.files.append([n.encode(), b'.dat', inner(3, [(b'IDN-0', b'.dat', lst), (b'IDN-1', b'.dat', lst), (b'IDN-2', b'.dat', lst), (b'ENG-0', b'.dat', lst)], pre_dat), FT, FT])
    sc.subs.append(y)
    open(os.path.join(OUT, 'sicomps.fmf.bin'), 'wb').write(fmfio.write(0, sc)[0])

    lg = fmfio.Folder(b'pictures_logos'); logos = fmfio.Folder(b'logos'); lg.subs.append(logos)
    for sz in ('normal', 'small'):
        s = fmfio.Folder(sz.encode()); logos.subs.append(s)
        for kind, t in (('clubs', 'club'), ('comps', 'comp')):
            k = fmfio.Folder(kind.encode()); s.subs.append(k)
            sfx = 'logo' if sz == 'normal' else 'icon'
            cfg = f'<?xml version="1.0"?>\n<record>\n\t<list id="maps">\n\t\t<record from="custom/1" to="graphics/pictures/{t}/1/{sfx}"/>\n\t</list>\n</record>\n'
            k.files.append([b'config', b'.xml', cfg.encode(), T, T])
            c = fmfio.Folder(b'custom'); c.files.append([b'1', b'.png', b'\x89PNG lama', T, T]); k.subs.append(c)
    open(os.path.join(OUT, 'pictures_logos.fmf.bin'), 'wb').write(fmfio.write(0, lg)[0])
    print('ok')

if __name__ == '__main__':
    main()
