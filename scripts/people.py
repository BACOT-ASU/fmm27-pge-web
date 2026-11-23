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

HEADER_LEN = {'people': 13, 'players': 12, 'non_players': 12, 'starting_contracts': 12, 'coaches': 12}
PLAYER_LEN, NON_PLAYER_LEN, CONTRACT_LEN, COACH_LEN = 82, 39, 54, 7

# Urutan 8 nilai kepribadian di people.dat. VERIFIED dengan layar game (Mourinho, Bento: 7 nilai sama persis).
# Byte ke-3 = Determination (editor FMM26 menyebutnya Controversy: keliru). Sportsmanship tidak tampil di layar.
PERSONALITY = ('adaptability', 'ambition', 'determination', 'loyalty', 'pressure',
               'professionalism', 'sportsmanship', 'temperament')


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


# Urutan atribut & posisi: dari nyongrand/fmm-editor (FMMLibrary/Player.cs, FMM26, MIT), dicocokkan dengan
# data 27.1.0 (panjang 82 byte sama, nilai CA/PA/posisi/kaki/tinggi masuk akal). Keyakinan: LIKELY.
PLAYER_ATTRS = ('crossing dribbling tackling finishing long_shots heading jumping passing decisions '
                'unselfishness pace strength stamina technique consistency aggression big_matches '
                'injury_proneness leadership versatility set_pieces penalties creativity movement '
                'positioning work_rate flair handling kicking agility aerial_ability reflexes '
                'communication throwing').split()
# Atribut yang disimpan bertanda -100..100 (bukan 1-20); cara konversi ke angka 1-20 di game: UNKNOWN.
PLAYER_SIGNED_ATTRS = {'crossing', 'dribbling', 'tackling', 'finishing', 'long_shots', 'passing',
                       'decisions', 'creativity', 'movement', 'positioning', 'handling', 'kicking',
                       'aerial_ability', 'reflexes', 'communication', 'throwing'}
PLAYER_POSITIONS = 'gk lib dl dc dr dm ml mc mr aml amc amr st wbl wbr'.split()


def player_fields(x):
    """Field players.dat (82 byte). Offset + keyakinan di research/format_specs/people_players.md."""
    f = {'index': struct.unpack_from('<I', x, 0)[0],
         'u4': struct.unpack_from('<I', x, 4)[0]}          # FMM26 editor: "Uid"; di 27.1.0 bukan UID orang. UNKNOWN
    for k, name in enumerate(PLAYER_ATTRS):
        b = x[8 + k]
        f[name] = b - 256 if (name in PLAYER_SIGNED_ATTRS and b > 127) else b
    for k, name in enumerate(PLAYER_POSITIONS):
        f['pos_' + name] = x[42 + k]
    f.update({
        'left_foot': x[57], 'right_foot': x[58],
        'ca': struct.unpack_from('<h', x, 59)[0], 'pa': struct.unpack_from('<h', x, 61)[0],
        'rep_63': struct.unpack_from('<h', x, 63)[0],   # FMM26 editor: home; dugaan awal kita: current
        'rep_65': struct.unpack_from('<h', x, 65)[0],   # FMM26 editor: current
        'rep_67': struct.unpack_from('<h', x, 67)[0],   # world
        'intl_retired': x[69],
        'squad_number': x[72], 'preferred_number': x[73],
        'height': struct.unpack_from('<h', x, 74)[0], 'weight': struct.unpack_from('<h', x, 76)[0],
    })
    return f


def non_player_fields(x):
    """Field non_players.dat (39 byte). Offset 14..38 = 25 nilai atribut staf; yang sudah dicocokkan dengan
    layar (Mourinho + Bento) diberi nama, sisanya 'a<offset>'. Lihat people_players.md."""
    f = {'index': struct.unpack_from('<I', x, 0)[0],
         'ca': struct.unpack_from('<h', x, 4)[0], 'pa': struct.unpack_from('<h', x, 6)[0],   # LIKELY
         'rep_8': struct.unpack_from('<h', x, 8)[0], 'rep_10': struct.unpack_from('<h', x, 10)[0],
         'rep_12': struct.unpack_from('<h', x, 12)[0]}                                         # LIKELY reputasi
    named = {15: 'financial_control', 19: 'discipline', 21: 'judging_ability', 22: 'judging_potential',
             23: 'people_management', 25: 'motivating', 29: 'tactical_knowledge'}             # VERIFIED (2 orang)
    for off in range(14, 39):
        f[named.get(off, 'a%d' % off)] = x[off]
    return f


# people.idx2 / idx3 / idx4. Struktur scouts/physios dilihat dari file APK modder lain (LIKELY), belum dari ori.
STAFF_ROLE_FILES = ('coaches', 'scouts', 'physios')


def staff_role_fields(x):
    """coaches.dat / scouts.dat / physios.dat (7 byte): u32 nomor urut (-1 = slot kosong, 50 di ujung), 3 x u8.
    Byte 4 = spesialisasi (pelatih: 5 = Goalkeeping, 3 = Attacking; LIKELY). Byte 5-6 UNKNOWN."""
    return {'index': struct.unpack_from('<i', x, 0)[0], 'speciality': x[4], 'b5': x[5], 'b6': x[6]}


coach_fields = staff_role_fields


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
    import os
    for name, ln in (('players', PLAYER_LEN), ('non_players', NON_PLAYER_LEN),
                     ('starting_contracts', CONTRACT_LEN), ('coaches', COACH_LEN),
                     ('scouts', COACH_LEN), ('physios', COACH_LEN)):
        if not os.path.exists(folder + name + '.dat'):
            print('%s.dat: tidak ada, dilewati' % name)
            continue
        x = open(folder + name + '.dat', 'rb').read()
        h, rs = split_fixed(x, ln, name)
        print('%s.dat: %d record x %d byte, round-trip %s' % (
            name, len(rs), ln, 'IDENTIK' if join_fixed(h, rs) == x else 'BEDA'))


if __name__ == '__main__':
    _main(sys.argv[1])
