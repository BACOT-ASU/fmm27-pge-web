"""people.dat, players.dat, non_players.dat, starting_contracts.dat (db_archive).

Dibongkar dari APK 27.1.0 ori (23 Nov 2026). Spesifikasi + label keyakinan:
research/format_specs/people_players.md

Struktur (batas record, urutan field) = VERIFIED: seluruh file terbaca sampai byte
terakhir dan ditulis ulang identik. Arti field = lihat spesifikasi (banyak yang LIKELY).
Semua bagian yang belum dimengerti disimpan apa adanya (bytes) dan ditulis ulang apa adanya.

Pakai:
  python3 scripts/people.py <folder berisi people.dat dkk.>     (ringkasan + uji round-trip)
"""
import struct
import sys

HEADER_LEN = {'people': 13, 'players': 12, 'non_players': 12, 'starting_contracts': 12}
PLAYER_LEN, NON_PLAYER_LEN, CONTRACT_LEN = 82, 39, 54


class Bad(Exception):
    pass


# ---------------------------------------------------------------- people.dat
def parse_person(d, p):
    """Baca satu record orang mulai offset p. Kembalikan (record, offset sesudahnya)."""
    r = {}
    (r['pre'], r['uid'], r['first'], r['second'], r['common'],
     r['dob_day'], r['dob_year'], r['nation']) = struct.unpack_from('<iIIIiHHH', d, p); p += 26
    if r['pre'] != -1:
        raise Bad('awal record bukan -1 di offset %d' % p)
    n = struct.unpack_from('<H', d, p)[0]; p += 2
    if n > 8:
        raise Bad('jumlah negara lain %d di offset %d' % (n, p))
    r['other_nations'] = list(struct.unpack_from('<%dH' % n, d, p)); p += 2 * n
    r['intl_a'] = d[p]; p += 1                                   # UNKNOWN
    r['intl_b'] = struct.unpack_from('<i', d, p)[0]; p += 4      # UNKNOWN
    r['intl_c'] = d[p]; p += 1                                   # UNKNOWN
    r['intl_date'] = struct.unpack_from('<HH', d, p); p += 4     # (hari, tahun); 1/1900 = kosong
    r['caps'], r['intl_goals'] = struct.unpack_from('<HH', d, p); p += 4
    r['intl_x'] = d[p:p + 2]; p += 2                             # UNKNOWN
    r['club_index'] = struct.unpack_from('<i', d, p)[0]; p += 4  # index club.dat, -1 = tanpa klub
    r['joined'] = struct.unpack_from('<HH', d, p); p += 4        # (hari, tahun)
    r['pad0'] = d[p:p + 2]; p += 2                               # selalu 00 00 di 27.1.0
    r['personality'] = d[p:p + 8]; p += 8                        # 8 nilai 1-20 (0 utk wasit)
    r['player_index'], r['non_player_index'], r['idx2'], r['idx3'], r['idx4'] = \
        struct.unpack_from('<5i', d, p); p += 20
    r['staff_extra'] = None
    if r['non_player_index'] >= 0 or r['idx2'] >= 0 or r['idx3'] >= 0 or r['idx4'] >= 0:
        r['staff_extra'] = d[p:p + 2]; p += 2                    # UNKNOWN, ada jika bukan pemain murni
    r['official_index'] = struct.unpack_from('<i', d, p)[0]; p += 4
    r['flags3'] = d[p:p + 3]; p += 3                             # byte ke-3 = ada bahasa utama
    if r['flags3'][2] not in (0, 1):
        raise Bad('flag bahasa %d di offset %d' % (r['flags3'][2], p))
    r['main_language'] = None
    if r['flags3'][2]:
        r['main_language'] = struct.unpack_from('<HB', d, p); p += 3   # (id bahasa, tingkat)
    m = d[p]; p += 1
    r['languages'] = [struct.unpack_from('<HB', d, p + 3 * i) for i in range(m)]; p += 3 * m
    m = struct.unpack_from('<H', d, p)[0]; p += 2
    if m > 500:
        raise Bad('jumlah relasi %d di offset %d' % (m, p))
    r['relations'] = [d[p + 8 * i:p + 8 * i + 8] for i in range(m)]; p += 8 * m
    return r, p


def build_person(r):
    out = [struct.pack('<iIIIiHHH', r['pre'], r['uid'], r['first'], r['second'], r['common'],
                       r['dob_day'], r['dob_year'], r['nation']),
           struct.pack('<H', len(r['other_nations'])),
           struct.pack('<%dH' % len(r['other_nations']), *r['other_nations']),
           struct.pack('<BiB', r['intl_a'], r['intl_b'], r['intl_c']),
           struct.pack('<HHHH', *r['intl_date'], r['caps'], r['intl_goals']),
           r['intl_x'], struct.pack('<i', r['club_index']), struct.pack('<HH', *r['joined']),
           r['pad0'], r['personality'],
           struct.pack('<5i', r['player_index'], r['non_player_index'], r['idx2'], r['idx3'], r['idx4'])]
    has_extra = r['non_player_index'] >= 0 or r['idx2'] >= 0 or r['idx3'] >= 0 or r['idx4'] >= 0
    if has_extra != (r['staff_extra'] is not None):
        raise Bad('staff_extra tidak sesuai index (uid %d)' % r['uid'])
    if has_extra:
        out.append(r['staff_extra'])
    out += [struct.pack('<i', r['official_index']), r['flags3']]
    if r['flags3'][2] != (r['main_language'] is not None):
        raise Bad('main_language tidak sesuai flag (uid %d)' % r['uid'])
    if r['main_language'] is not None:
        out.append(struct.pack('<HB', *r['main_language']))
    out.append(struct.pack('<B', len(r['languages'])))
    out += [struct.pack('<HB', *x) for x in r['languages']]
    out.append(struct.pack('<H', len(r['relations'])))
    out += r['relations']
    return b''.join(out)


def parse_people(d):
    """Kembalikan (header, daftar record, raw per record). Galat kalau tidak habis tepat."""
    n = struct.unpack_from('<I', d, 8)[0]
    p = HEADER_LEN['people']; recs = []; raws = []
    for _ in range(n):
        st = p
        r, p = parse_person(d, p)
        recs.append(r); raws.append(d[st:p])
    if p != len(d):
        raise Bad('people.dat: berhenti di %d, panjang file %d' % (p, len(d)))
    return d[:HEADER_LEN['people']], recs, raws


def build_people(header, recs):
    h = bytearray(header); struct.pack_into('<I', h, 8, len(recs))
    return bytes(h) + b''.join(build_person(r) for r in recs)


# ------------------------------------------------- file record tetap-ukuran
def split_fixed(d, rec_len, name):
    n = struct.unpack_from('<I', d, 8)[0]
    if 12 + n * rec_len != len(d):
        raise Bad('%s: 12 + %d x %d != %d' % (name, n, rec_len, len(d)))
    return d[:12], [d[12 + i * rec_len:12 + (i + 1) * rec_len] for i in range(n)]


def join_fixed(header, recs):
    h = bytearray(header); struct.pack_into('<I', h, 8, len(recs))
    return bytes(h) + b''.join(recs)


def player_fields(x):
    """Field players.dat (82 byte) yang sudah dikenali. Offset di research/format_specs/people_players.md."""
    return {
        'index': struct.unpack_from('<I', x, 0)[0],
        'u4': struct.unpack_from('<I', x, 4)[0],          # UNKNOWN
        'attrs': x[8:42],                                 # 34 byte atribut (sebagian 1-20, sebagian bertanda) UNKNOWN
        'positions': x[42:57],                            # 15 nilai 1-20 (urutan posisi HYPOTHESIS)
        'left_foot': x[57], 'right_foot': x[58],
        'ca': struct.unpack_from('<H', x, 59)[0], 'pa': struct.unpack_from('<H', x, 61)[0],
        'rep_current': struct.unpack_from('<H', x, 63)[0],
        'rep_home': struct.unpack_from('<H', x, 65)[0],
        'rep_world': struct.unpack_from('<H', x, 67)[0],
        'club_number': x[72], 'nation_number': x[73],
        'height': x[74], 'weight': x[76],
    }


def contract_fields(x):
    return {
        'person_uid': struct.unpack_from('<I', x, 0)[0],
        'club_uid': struct.unpack_from('<I', x, 4)[0],
        'x8': x[8:16],                                    # UNKNOWN (umumnya ff)
        'start': struct.unpack_from('<HH', x, 16), 'end': struct.unpack_from('<HH', x, 20),
        'u24': struct.unpack_from('<H', x, 24)[0],        # UNKNOWN (umumnya 1)
        'wage': struct.unpack_from('<I', x, 26)[0],       # LIKELY gaji per minggu
        'rest': x[30:54],                                 # UNKNOWN (klausul? umumnya ff)
    }


# --------------------------------------------------------------------- CLI
def _main(folder):
    folder = folder.rstrip('/') + '/'
    d = open(folder + 'people.dat', 'rb').read()
    hdr, recs, raws = parse_people(d)
    rebuilt = build_people(hdr, recs)
    print('people.dat: %d orang, round-trip %s' % (len(recs), 'IDENTIK' if rebuilt == d else 'BEDA'))
    for name, ln in (('players', PLAYER_LEN), ('non_players', NON_PLAYER_LEN),
                     ('starting_contracts', CONTRACT_LEN)):
        x = open(folder + name + '.dat', 'rb').read()
        h, rs = split_fixed(x, ln, name)
        print('%s.dat: %d record x %d byte, round-trip %s' % (
            name, len(rs), ln, 'IDENTIK' if join_fixed(h, rs) == x else 'BEDA'))


if __name__ == '__main__':
    _main(sys.argv[1])
