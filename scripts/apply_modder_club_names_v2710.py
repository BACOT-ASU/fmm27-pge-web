"""Nama klub & kompetisi versi MODDER (nama asli berlisensi, mis. "Casciavit Milano" → "AC Milan") untuk yang NON-Indonesia.

Permintaan Bacad (23 Nov 2026). Data Indonesia tetap milik kita. Pencocokan lewat UID.
- club.dat        : segmen nama (nama panjang+g, pendek+g, 3 teks lain) record kita diganti segmen record modder.
                    Field lain (divisi, stadion, reputasi, dst.) tidak disentuh.
- competition.dat : segmen nama (panjang+g, pendek+g, singkatan) diganti versi modder.
- <bahasa>.lng    : record nama klub (UID + 4 teks) diganti versi modder, hanya untuk bahasa yang file modder-nya ada
                    (Bacad kirim eng.lng dan id.lng).
Segmen nama selalu: u32 + teks + 1 byte, u32 + teks + 1 byte, lalu (klub) 3 × (u32 + teks) / (kompetisi) 1 × (u32 + teks).

Pakai: python3 scripts/apply_modder_club_names_v2710.py <folder db kita> <folder db modder>
"""
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import club as clubmod   # noqa: E402
import comp as compmod   # noqa: E402

IDN = 58


def name_end(b, p, flags):
    for ff in flags:
        p += 4 + struct.unpack_from('<I', b, p)[0] + (1 if ff else 0)
    return p


def lng_records(b):
    n = struct.unpack_from('<I', b, 8)[0]; p = 12; out = []
    for _ in range(n):
        st = p; uid = struct.unpack_from('<I', b, p)[0]; p += 4
        p = name_end(b, p, (1, 1, 0, 0))
        out.append((uid, st, p))
    return out, p


def apply(ourdir, moddir, verbose=True):
    ourdir = ourdir.rstrip('/') + '/'; moddir = moddir.rstrip('/') + '/'
    rep = {}
    # ------------------------------------------------------------ club.dat
    ob = open(ourdir + 'club.dat', 'rb').read(); mb = open(moddir + 'club.dat', 'rb').read()
    CO, e, L = clubmod.parse(ourdir + 'club.dat', verbose=False); assert e == L
    CM, e, L = clubmod.parse(moddir + 'club.dat', verbose=False); assert e == L
    mby = {c['uid']: c for c in CM}
    out = [ob[:12]]; pos = 12; changed = []
    for c in CO:
        m = mby.get(c['uid'])
        rec = ob[c['off']:c['off'] + c['len']]
        assert c['off'] == pos
        if m is not None and c['nat'] != IDN and m['nat'] != IDN:
            a_end = name_end(ob, c['off'] + 8, (1, 1, 0, 0, 0)) - c['off']
            mrec = mb[m['off']:m['off'] + m['len']]
            m_end = name_end(mb, m['off'] + 8, (1, 1, 0, 0, 0)) - m['off']
            if rec[8:a_end] != mrec[8:m_end]:
                rec = rec[:8] + mrec[8:m_end] + rec[a_end:]
                changed.append((c['uid'], c['long'], m['long']))
        out.append(rec); pos += c['len']
    out.append(ob[pos:])
    nb = b''.join(out)
    open(ourdir + 'club.dat', 'wb').write(nb)
    C2, e, L = clubmod.parse(ourdir + 'club.dat', verbose=False); assert e == L and len(C2) == len(CO)
    rep['klub'] = changed

    # ------------------------------------------------------------ competition.dat
    ob = open(ourdir + 'competition.dat', 'rb').read(); mb = open(moddir + 'competition.dat', 'rb').read()
    KO, e, L = compmod.parse(ourdir + 'competition.dat'); assert e == L
    KM, e2, L2 = compmod.parse(moddir + 'competition.dat'); assert e2 == L2
    offO = [k['off'] for k in KO] + [e]; offM = [k['off'] for k in KM] + [e2]
    kmby = {k['uid']: i for i, k in enumerate(KM)}
    out = [ob[:10]]; kchanged = []
    for i, k in enumerate(KO):
        rec = ob[offO[i]:offO[i + 1]]
        j = kmby.get(k['uid'])
        if j is not None and k['nat'] != IDN and KM[j]['nat'] != IDN:
            mrec = mb[offM[j]:offM[j + 1]]
            a_end = name_end(rec, 6, (1, 1, 0)); m_end = name_end(mrec, 6, (1, 1, 0))
            if rec[6:a_end] != mrec[6:m_end]:
                rec = rec[:6] + mrec[6:m_end] + rec[a_end:]
                kchanged.append((k['uid'], k['long'], KM[j]['long']))
        out.append(rec)
    open(ourdir + 'competition.dat', 'wb').write(b''.join(out))
    K2, e, L = compmod.parse(ourdir + 'competition.dat'); assert e == L and len(K2) == len(KO)
    rep['kompetisi'] = kchanged

    # ------------------------------------------------------------ .lng (bahasa yang ada versi modder-nya)
    idn_uids = {c['uid'] for c in C2 if c['nat'] == IDN}
    for f in sorted(os.listdir(moddir)):
        if not f.endswith('.lng') or not os.path.exists(ourdir + f):
            continue
        ob = open(ourdir + f, 'rb').read(); mb = open(moddir + f, 'rb').read()
        ro, endO = lng_records(ob); rm, _ = lng_records(mb)
        mmap = {u: mb[s:t] for u, s, t in rm}
        parts = [ob[:12]]; n = 0
        for u, s, t in ro:
            r = ob[s:t]
            if u not in idn_uids and u in mmap and mmap[u] != r:
                r = mmap[u]; n += 1
            parts.append(r)
        parts.append(ob[endO:])
        nb = b''.join(parts)
        assert struct.unpack_from('<I', nb, 8)[0] == len(C2)
        open(ourdir + f, 'wb').write(nb)
        rep[f] = n
    if verbose:
        print('nama versi modder: klub %d, kompetisi %d, %s' % (
            len(changed), len(kchanged), ', '.join('%s %d' % (k, v) for k, v in rep.items() if k.endswith('.lng'))))
    return rep


if __name__ == '__main__':
    apply(sys.argv[1], sys.argv[2])
