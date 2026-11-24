"""Award Indonesia (Player of the Month, Best 11 of the Round / Team of the Week, dst.) di awards.dat 27.1.0.

Struktur awards.dat (dibongkar 23 Nov 2026, research/format_specs/awards_dat.md):
  header 8 + u32 jumlah; record = u32 idx (urut), u32 award_id, nama generik (u32+teks) + FF, nama bermerek (u32+teks) + FF,
  ekor 102 byte: u16 benua, i16 negara, i16 INDEX kompetisi (competition.dat), u8 jenis, u8 subjek (1 pemain, 7 tim,
  2 manajer), ..., byte 15 = frekuensi (1 mingguan, 2 bulanan, 3 tahunan), ..., byte 23..100 = 3 slot riwayat pemenang.
1.055 award menautkan liga lewat index kompetisi (negara selalu = negara kompetisi). Jadi award Indonesia ditambahkan dengan
MENYALIN set award liga Asia (record utuh) lalu mengganti: idx, award_id (baru, unik), nama, negara (58), index kompetisi,
dan mengosongkan riwayat pemenang (pola slot kosong dari award yang belum punya pemenang). Ditambah di ujung.
HYPOTHESIS sampai terlihat di game.

Pakai (dipanggil build_v2710_db.py): add(dbdir)
"""
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comp as compmod  # noqa: E402

IDN = 58
FIRST_AWARD_ID = 2100600001
PREFIXES = ('Premier League ', 'Hana Bank K League 1 ', 'K League 1 ', 'J2 ', 'J3 ', 'CSL ', 'Korea Cup ', 'League Cup ')
# kompetisi Indonesia (UID) -> daftar (UID kompetisi templat, filter nama generik atau None = semua)
# Koreksi Bacad 24 Nov (log 74): award liga per KASTA (kompetisi induk), bukan per grup; Manager of the Month belum muncul →
# templat bulanan manajer dari Premier League (pola ori: kompetisi induk berkelompok seperti Swedish Second Division juga
# punya award sendiri termasuk Manager of the Month).
PLAN = [
    (41004312, [('kor1', None), ('epl', 'Manager of the Month')]),            # BRI Super League
    (41042740, [('j2', None), ('epl', 'Manager of the Month')]),              # Pegadaian Championship (induk Barat+Timur)
    (41042746, [('j3', None), ('epl', 'Manager of the Month')]),              # Liga Nusantara (induk Grup A/B/C)
    (7746536, [('kcup', None)]),                                                # Piala Indonesia
    (2000560926, [('jlc', None)]),                                              # Piala Liga Indonesia
]
# kompetisi templat lewat UID (nama bisa berubah oleh nama versi modder): K League 1, Chinese Super League, J2, J3,
# Korea Cup, Japanese League Cup
TEMPLATE_COMPS = {'epl': 11, 'kor1': 136407, 'csl': 130931, 'j2': 115424, 'j3': 791180, 'kcup': 136408, 'jlc': 102430}


def parse_awards(d):
    n = struct.unpack_from('<I', d, 8)[0]; p = 12; out = []
    for _ in range(n):
        st = p; idx, aid = struct.unpack_from('<II', d, p); p += 8
        names = []
        for _k in range(2):
            ln = struct.unpack_from('<I', d, p)[0]
            names.append(d[p + 4:p + 4 + ln].decode('utf-8', 'replace')); p += 4 + ln
            assert d[p] == 0xFF; p += 1
        p += 102
        out.append({'idx': idx, 'aid': aid, 'n1': names[0], 'n2': names[1], 'off': st, 'end': p,
                    'comp': struct.unpack_from('<h', d, p - 102 + 4)[0]})
    return out, p


def strip_prefix(s):
    for pfx in PREFIXES:
        if s.startswith(pfx):
            return s[len(pfx):]
    return s


def add(dbdir, verbose=True):
    path = os.path.join(dbdir, 'awards.dat')
    d = open(path, 'rb').read()
    A, end = parse_awards(d); assert end == len(d)
    comps = compmod.parse(os.path.join(dbdir, 'competition.dat'))[0]
    by_uid = {c['uid']: i for i, c in enumerate(comps)}
    tidx = {k: by_uid[v] for k, v in TEMPLATE_COMPS.items()}
    # pola riwayat kosong: ekor award yang belum punya pemenang (Best 11 of the Round K League 1)
    empty = next(d[a['end'] - 102 + 23:a['end'] - 1] for a in A if a['comp'] == tidx['kor1'] and 'Best 11' in a['n1'])
    asia_cont = next(d[a['end'] - 102:a['end'] - 100] for a in A if a['comp'] == tidx['kor1'])
    used = {a['aid'] for a in A}
    next_aid = FIRST_AWARD_ID
    recs = []; report = []
    for cuid, sources in PLAN:
        ci = by_uid[cuid]; cname = comps[ci]['long']
        assert comps[ci]['nat'] == IDN, cname
        for tkey, only in sources:
            for a in A:
                if a['comp'] != tidx[tkey] or (only and a['n1'] != only):
                    continue
                while next_aid in used:
                    next_aid += 1
                used.add(next_aid)
                generic = strip_prefix(a['n1'])
                branded = '%s %s' % (cname, generic)
                tail = bytearray(d[a['end'] - 102:a['end']])
                tail[0:2] = asia_cont                              # benua Asia (templat Premier League = Eropa)
                struct.pack_into('<hh', tail, 2, IDN, ci)          # negara, index kompetisi
                tail[23:101] = empty                               # riwayat pemenang kosong
                n1 = generic.encode('utf-8'); n2 = branded.encode('utf-8')
                rec = (struct.pack('<II', len(A) + len(recs), next_aid) + struct.pack('<I', len(n1)) + n1 + b'\xff'
                       + struct.pack('<I', len(n2)) + n2 + b'\xff' + bytes(tail))
                recs.append(rec)
                report.append((next_aid, branded))
                next_aid += 1
    out = d[:8] + struct.pack('<I', len(A) + len(recs)) + d[12:] + b''.join(recs)
    A2, e2 = parse_awards(out); assert e2 == len(out) and len(A2) == len(A) + len(recs)
    assert all(A2[i]['idx'] == i for i in range(len(A2)))
    open(path, 'wb').write(out)
    if verbose:
        print('award Indonesia ditambah: %d' % len(recs))
    return report


if __name__ == '__main__':
    for aid, name in add(sys.argv[1]):
        print(aid, name)
