#!/usr/bin/env python3
# B7a: daftarkan 13 stadion baru ke fmm_stadiums IDN-0/1/2 (aturan comps.dbc tidak diubah).
import sys, struct, os
sys.path.insert(0, '/home/claude/scripts')
import dbcarc, fmfio
SRC = '/home/claude/out/putaranB6/kirim/assets/shared/data/sicomps.fmf'
OUT = '/home/claude/out/putaranB7a/kirim/assets/shared/data/sicomps.fmf'
NEW = list(range(2000700201, 2000700214))
flag, root = dbcarc.load_sicomps(SRC)
row = dbcarc.find(root, '/fmm_stadiums.dat'); b = fmfio.get(row); p8 = b[:8]; fl, rt, _ = fmfio.read(b[8:])
hit = 0
for e in rt.files:
    if e[0] in (b'IDN-0', b'IDN-1', b'IDN-2'):
        data = fmfio.get(e); n = struct.unpack_from('<I', data, 8)[0]
        ids = sorted(set(struct.unpack_from('<%dI' % n, data, 12)) | set(NEW))
        e[2] = data[:8] + struct.pack('<I', len(ids)) + struct.pack('<%dI' % len(ids), *ids); e[5] = None; hit += 1
assert hit == 3
nb, _ = fmfio.write(fl, rt); row[2] = p8 + nb; row[5] = None
os.makedirs(os.path.dirname(OUT), exist_ok=True)
out, _ = fmfio.write(flag, root); open(OUT, 'wb').write(out); print('ok', len(out))
