"""Buat competition.dat dan club.dat SINTETIS (bukan data game) mengikuti spesifikasi,
lalu baca dengan scripts/comp.py dan scripts/club.py sebagai acuan.

Hasil:
  tests/fixtures/db/competition.dat.bin, club.dat.bin
  tests/fixtures/db/expected.json  (hasil parser Python, untuk golden test TS)
Jalankan: python3 scripts/golden/make_db_fixtures.py
"""
import json, os, struct, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import comp, club  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'tests', 'fixtures', 'db')
HDR = bytes([0x03, 0x01, 0x74, 0x61, 0x64, 0x2E, 0x01, 0x00])  # 03 01 "tad." 01 00 (sintetis)


def s(t: str) -> bytes:
    b = t.encode('utf-8')
    return struct.pack('<I', len(b)) + b


def comp_rec(idx, uid, ln, sn, ab, typ, cont, nat, rep, lvl, parent, entrants, g=(0, 0)):
    out = struct.pack('<HI', idx, uid) + s(ln) + bytes([g[0]]) + s(sn) + bytes([g[1]]) + s(ab)
    out += struct.pack('<BHh', typ, cont, nat) + bytes([0x11, 0x22, 0x33, 0x44]) + struct.pack('<HBh', rep, lvl, parent)
    out += struct.pack('<I', len(entrants)) + b''.join(struct.pack('<iHH', *e) for e in entrants)
    out += struct.pack('<iiiHHHH', 116140, -1, 116144, 2025, 0, 2024, 7)
    return out


def club_rec(i, uid, ln, sn, nat, status, tr, yo, att, div, stadium, rep, finance, k, x, squad, staff, g=(0, 0)):
    out = struct.pack('<iI', -1, uid) + s(ln) + bytes([g[0]]) + s(sn) + bytes([g[1]]) + s(ln[:6]) + s(ln[:4].upper()) + s(ln[:3].upper())
    out += struct.pack('<hh', nat, nat)
    out += bytes((i * 7 + j) & 0xFF for j in range(12 + 132))
    out += struct.pack('<BBBhhhB', status, tr, yo, att[0], att[1], att[2], 1)
    out += struct.pack('<hhBHh', div, -1, 0, stadium, div)
    if finance:
        out += b'\x01' + bytes((0x02 if j == 0 else (i + j) & 0xFF) for j in range(68))
    else:
        out += b'\x00'
    out += struct.pack('<I', k) + bytes(range(k))
    out += struct.pack('<BHii', 3, rep, 5, -1) + bytes(12)
    out += struct.pack('<H', x) + bytes((j * 3) & 0xFF for j in range(21 * x))
    out += struct.pack('<H', len(squad)) + b''.join(struct.pack('<i', p) for p in squad)
    out += b''.join(struct.pack('<i', p) for p in staff)
    out += struct.pack('<I', 0xFFFFFFFF) + bytes(27) + bytes(44) + struct.pack('<H', i)
    return out


def build_comps():
    recs = [
        comp_rec(0, 41004312, 'BRI Super League', 'BRI Super League', 'BRI', 0, 1, 58, 164, 0, -1, [(116140, 2026, 0), (116144, 2026, 1)]),
        comp_rec(1, 41042740, 'Pegadaian Championship', 'Pegadaian Champ', 'PCH', 1, 1, 58, 115, 1, -1, []),
        comp_rec(2, 41042741, 'Pegadaian Championship Grup Barat', 'Pegadaian Champ Barat', 'PCB', 1, 1, 58, 100, 1, 1, [], g=(1, 2)),
        comp_rec(3, 7746536, 'Piala Indonesia', 'Piala Indonesia', 'PIN', 2, 1, 58, 120, 100, -1, []),
        comp_rec(4, 999, 'Liga Uji — é', 'Uji', 'UJI', 21, 1, -1, 50, 0, -1, [(1, 2026, 3)], g=(0xFF, 0)),
    ]
    return HDR + struct.pack('<H', len(recs)) + b''.join(recs)


def build_clubs():
    recs = [
        club_rec(0, 116140, 'Persib Bandung', 'Persib', 58, 1, 13, 12, (2500, 1500, 3800), 0, 10, 4600, False, 8, 0, [1, 2, 3], [11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12]),
        club_rec(1, 116144, 'Persija Jakarta', 'Persija', 58, 1, 13, 12, (3000, 1000, 7700), 0, 11, 4500, True, 8, 2, [4, 5], [0] * 12),
        club_rec(2, 2000700017, 'Gresik United', 'Gresik Utd', 58, 2, 5, 4, (300, 100, 2500), 2, 65535, 1500, False, 0, 0, [], [0] * 12, g=(1, 2)),
        club_rec(3, 5, 'Klub Ñandú', 'Ñandú', 55, 3, 1, 1, (10, 5, 20), -1, 65535, 0, True, 64, 60, list(range(400)), [-1] * 12, g=(0xFF, 0xFF)),
    ]
    return HDR + struct.pack('<I', len(recs)) + b''.join(recs)


def tmp(name, data):
    p = os.path.join(tempfile.mkdtemp(), name)
    open(p, 'wb').write(data)
    return p


def main():
    os.makedirs(OUT, exist_ok=True)
    cb, kb = build_comps(), build_clubs()
    open(os.path.join(OUT, 'competition.dat.bin'), 'wb').write(cb)
    open(os.path.join(OUT, 'club.dat.bin'), 'wb').write(kb)
    C, cend, clen = comp.parse(tmp('competition.dat', cb))
    assert cend == clen, ('comp.py tidak habis', cend, clen)
    K, kend, klen = club.parse(tmp('club.dat', kb), verbose=False)
    assert kend == klen and len(K) == 4, ('club.py tidak habis', kend, klen, len(K))
    expected = {
        'competitions': [dict(index=c['idx'], uid=c['uid'], longName=c['long'], shortName=c['short'], abbr=c['abbr'],
                              gap1=c['g'][0], gap2=c['g'][1], type=c['lvl'], continent=c['typ'], nation=c['nat'],
                              colour=c['col'], reputation=c['rep'], level=c['b11'], parent=c['h12'],
                              entrants=[dict(clubUid=e[0], year=e[1], slot=e[2]) for e in c['ent']],
                              winners=list(c['win']), winnerYears=list(c['yrs']), tail=c['u']) for c in C],
        'clubs': [dict(uid=r['uid'], pre=r['pre'], longName=r['long'], shortName=r['short'], name6=r['n6'], code4=r['c4'],
                       code3=r['c3'], nation=r['nat'], basedNation=r['based'], division=r['div'], division2=r['div2'],
                       stadium=r['rep'], lastDivision=r['lastdiv'], hasFinance=bool(r['flag']), k=r['k'],
                       a1=r['a1'], capt=r['capt'], xCount=r['x'], squad=list(r['squad']), staff=list(r['staff']),
                       t0=r['t0'], tailN=r['tailn'], length=r['len'],
                       # field yang tidak diberi nama di club.py: dibaca dari offset yang sama dengan TS
                       misc=list(struct.unpack_from('<BBBhhhB', kb, r['o_misc'])),
                       reputation=struct.unpack_from('<H', kb, r['o_div'] + 10 + (68 if r['flag'] else 0) + 4 + r['k'] + 1)[0])
                  for r in K],
    }
    with open(os.path.join(OUT, 'expected.json'), 'w', encoding='utf-8') as fh:
        json.dump(expected, fh, ensure_ascii=False, indent=1)
    print('competition.dat.bin', len(cb), 'byte;', 'club.dat.bin', len(kb), 'byte')


if __name__ == '__main__':
    main()
