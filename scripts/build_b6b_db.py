#!/usr/bin/env python3
# B6b: nama pendek Championship -> "Pegadaian Champ Barat/Timur"
import sys, struct, os
sys.path.insert(0, '/home/claude/scripts')
import fmfio, comp
SRC = '/home/claude/out/putaranB6/kirim/assets/data/game/db_archive_2706.fmf'
OUTD = '/home/claude/out/putaranB6b/kirim/assets/data/game/'; os.makedirs(OUTD, exist_ok=True)
d = open(SRC, 'rb').read(); flag, root, _ = fmfio.read(d)
row = [r for p, r in fmfio.walk(root) if p.endswith('competition.dat')]; assert len(row) == 1; row = row[0]
cd = bytearray(fmfio.get(row))
def sb(v, ff=None):
    b = v.encode(); return struct.pack('<I', len(b)) + b + (bytes([ff]) if ff is not None else b'')
for old, new in ((b'Grup Barat', 'Pegadaian Champ Barat'), (b'Grup Timur', 'Pegadaian Champ Timur')):
    pat = struct.pack('<I', len(old)) + old
    assert cd.count(pat) == 1, (old, cd.count(pat))
    i = cd.find(pat); g = cd[i + 4 + len(old)]
    cd[i:i + 4 + len(old) + 1] = sb(new, g)
open('/tmp/comp_b6b.dat', 'wb').write(cd)
row[2] = bytes(cd); row[5] = None
out, _ = fmfio.write(flag, root)
open(OUTD + 'db_archive_2706.fmf', 'wb').write(out); print(len(out))
