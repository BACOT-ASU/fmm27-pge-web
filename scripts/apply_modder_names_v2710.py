"""Pakai nama orang versi MODDER untuk orang NON-Indonesia yang namanya berbeda dari ori 27.1.0.

Permintaan Bacad (23 Nov 2026): nama pemain asing (yang main di Indonesia maupun di luar negeri) ikut versi modder.
Orang berkebangsaan Indonesia tidak diubah (nama dari dataset kita sendiri).
Pencocokan lewat UID (semua UID ori ada di modder; lihat research/log_sesi.md poin 32).
Nama yang belum ada di first/second/common_names.dat kita ditambahkan di ujung (record nama disalin dari modder,
index diganti). Hanya field first/second/common di people.dat yang berubah.

Pakai (dipanggil dari build_v2710_db.py, atau mandiri):
  python3 scripts/apply_modder_names_v2710.py <folder db kita> <folder db modder>
"""
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import people                              # noqa: E402
from build_people_v2710 import NameFile    # noqa: E402

IDN = 58


def apply(ourdir, moddir, verbose=True):
    ourdir = ourdir.rstrip('/') + '/'; moddir = moddir.rstrip('/') + '/'
    ph, recs, _ = people.parse_people(open(ourdir + 'people.dat', 'rb').read())
    _, mrecs, _ = people.parse_people(open(moddir + 'people.dat', 'rb').read())
    ours = {n: NameFile(ourdir + n + '_names.dat') for n in ('first', 'second', 'common')}
    mods = {n: NameFile(moddir + n + '_names.dat') for n in ('first', 'second', 'common')}
    mby = {r['uid']: r for r in mrecs}

    def text(nf, i):
        return nf.raw[i][20:].decode('utf-8', 'replace') if 0 <= i < len(nf.raw) else None

    def key(nf_set, r):
        return (text(nf_set['first'], r['first']), text(nf_set['second'], r['second']),
                text(nf_set['common'], r['common']) if r['common'] >= 0 else None)

    changed = []
    for r in recs:
        m = mby.get(r['uid'])
        if m is None or r['nation'] == IDN or m['nation'] == IDN:
            continue
        old, new = key(ours, r), key(mods, m)
        if old == new:
            continue
        for field in ('first', 'second', 'common'):
            mi = m[field]
            if field == 'common' and mi < 0:
                r[field] = -1
                continue
            if field == 'first' and mi >= len(mods['first'].raw):     # 0xFFFFFFFF = tanpa nama depan
                r[field] = mi
                continue
            raw = mods[field].raw[mi]
            nat_uid = struct.unpack_from('<I', raw, 9)[0]
            r[field] = ours[field].get_or_add(raw[20:].decode('utf-8', 'replace'), nat_uid, raw)
        changed.append((r['uid'], old, new))
    open(ourdir + 'people.dat', 'wb').write(people.build_people(ph, recs))
    for n, nf in ours.items():
        open(ourdir + n + '_names.dat', 'wb').write(nf.build())
    if verbose:
        print('nama versi modder dipakai untuk %d orang non-Indonesia' % len(changed))
    return changed


if __name__ == '__main__':
    apply(sys.argv[1], sys.argv[2])
