"""Fixture SINTETIS untuk stadium.dat, rivalries.dat, *.lng, entri comps.dbc, daftar UID fmm_*.
Dibaca dengan skrip acuan (stadium.py, riv.py, dbc.py) lalu hasilnya disimpan ke expected.json.
Jalankan: python3 scripts/golden/make_more_fixtures.py
"""
import json, os, struct, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import stadium, riv, dbc  # noqa: E402
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'tests', 'fixtures', 'more')
HDR = bytes([0x03, 0x01, 0x74, 0x61, 0x64, 0x2E, 0x01, 0x00])

def s(t): b = t.encode(); return struct.pack('<I', len(b)) + b
def tmp(n, d):
    p = os.path.join(tempfile.mkdtemp(), n); open(p, 'wb').write(d); return p

def stadiums():
    rows = [(0, 1001, 5, 38000, 42000, 'Gelora Bandung Lautan Api', ''), (1, 1002, 7, 77000, 82000, 'Jakarta International Stadium', 'JIS'),
            (2, 2000700201, 5, 20000, 30000, 'Gelora Bumi Kartini', ''), (3, 1004, 9, 25000, 25000, 'Gelora Joko Samudro', 'GJS — é')]
    body = b''.join(struct.pack('<IIHII', *r[:5]) + s(r[5]) + s(r[6]) + bytes.fromhex('00000000ff000000') for r in rows)
    return HDR + struct.pack('<H', len(rows)) + body

def rivalries():
    rows = [(0, 501, 'Persija vs Persib', 0, 1, 0, 200), (1, 502, 'Arema vs Persebaya', 0, 5, 6, 190), (2, 503, 'Derby Uji', 1, 2, 3, 50)]
    body = b''.join(struct.pack('<II', *r[:2]) + s(r[2]) + bytes([r[3]]) + struct.pack('<ii', r[4], r[5]) + bytes([r[6]]) + bytes(range(14)) for r in rows)
    return HDR + struct.pack('<H', len(rows)) + body

def lng():
    rows = [(116140, 'Persib Bandung', 0, 'Persib', 0, 'PERSIB', 'PSIB'), (2000700017, 'Gresik United FC', 1, 'Gresik Utd', 2, 'GRESIK', 'GRES')]
    body = b''.join(struct.pack('<I', r[0]) + s(r[1]) + bytes([r[2]]) + s(r[3]) + bytes([r[4]]) + s(r[5]) + s(r[6]) for r in rows)
    return HDR + struct.pack('<I', len(rows)) + body + b'\x00\x00'

def dbc_entry():
    I = lambda v: (0x01, struct.pack('<i', v)); B = lambda v: (0x03, bytes([v])); T = lambda v: (0x0c, v.encode())
    tag = lambda t: t.encode()[::-1]
    fields = [(tag('ftye'), I(1)), (tag('vers'), I(241)), (tag('ntms'), I(10)), (tag('nrds'), I(3)), (tag('inac'), B(0)),
              (tag('name'), T('Pegadaian Championship')), (tag('dyow'), (0x11, bytes([7]))), (tag('date'), (0x20, bytes([1, 2, 3, 4]))),
              (tag('qurl'), (0x0b, [(0x0a, [(tag('nmsn'), I(1)), (tag('comp'), (0x02, struct.pack('<I', 41042740)))]),
                                    (0x0a, [(tag('nmsn'), I(2)), (tag('stag'), (0x12, struct.pack('<H', 117)))])])),
              (tag('fltf'), (0x19, struct.pack('<f', 1.5))), (tag('dblf'), (0x05, struct.pack('<d', 2.25))), (tag('kode'), (0x02, b'XYZA'))]
    d = dict(hdr=bytes([1, 0xF1, 0, 0]), key=(0x0b, [(0x01, struct.pack('<i', 41042741))]), fields=fields, tail=b'')
    return dbc.build(d)

def uidlist():
    ids = [41004312, 41042740, 2000700201]
    return bytes(range(8)) + struct.pack('<I', len(ids)) + struct.pack('<%dI' % len(ids), *ids)

def main():
    os.makedirs(OUT, exist_ok=True)
    files = {'stadium.dat.bin': stadiums(), 'rivalries.dat.bin': rivalries(), 'eng.lng.bin': lng(), 'entry.dbc.bin': dbc_entry(), 'IDN-0.dat.bin': uidlist()}
    for n, d in files.items(): open(os.path.join(OUT, n), 'wb').write(d)
    S, e, L = stadium.parse(tmp('stadium.dat', files['stadium.dat.bin'])); assert e == L
    R, e, L, _ = riv.parse(tmp('rivalries.dat', files['rivalries.dat.bin'])); assert e == L
    D = dbc.parse(files['entry.dbc.bin']); assert dbc.build(D) == files['entry.dbc.bin']
    exp = {
        'stadiums': [dict(index=x['idx'], uid=x['uid'], city=x['city'], capacity=x['cap'], maxCapacity=x['capx'], name=x['name'], altName=x['alt'], tail=x['tail']) for x in S],
        'rivalries': [dict(index=x['idx'], uid=x['uid'], name=x['name'], gap=x['g'], clubA=x['a'], clubB=x['b'], intensity=x['tail'][0], tail=x['tail'][1:].hex()) for x in R],
        'dbc': {dbc.tagname(t): dbc.show(v) for t, v in D['fields']},
        'dbcKey': dbc.show(D['key']),
    }
    json.dump(exp, open(os.path.join(OUT, 'expected.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=str)
    print('ok', {k: len(v) for k, v in files.items()})

if __name__ == '__main__':
    main()
