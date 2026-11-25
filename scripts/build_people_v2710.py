"""Tambah / perbarui pemain Indonesia (data/pemain_indonesia_v2.csv) di database 27.1.0.

Keputusan Bacad (23 Nov 2026): semua masuk APK; atribut pemain baru boleh PERKIRAAN.

Cara perkiraan (lihat research/format_specs/people_players.md + research/kalibrasi/):
- CA target per kompetisi dari median CA pemain yang sudah ada di klub Indonesia 27.1.0
  (Super League lokal 80 / asing 101, Championship lokal 78 / asing 90), Liga Nusantara & Liga 4
  diperkirakan lebih rendah; digeser +-12 menurut nilai pasar di kompetisinya.
- Atribut, rating posisi, kaki, berat: DISALIN dari pemain nyata di players.dat dengan posisi utama sama
  (rating 20) dan CA terdekat. Jadi sebaran atribut realistis; angka di layar bisa meleset +-2.
- Pemain yang sudah ada di db (nama sama + tgl lahir sama, atau nama sama + orang Indonesia) tidak
  dibuat baru: hanya klub, kontrak, dan nomor punggung yang diperbarui.
- Orang baru: UID mulai 2100000001 (dicek tidak bentrok), ditambahkan di UJUNG people.dat / players.dat / starting_contracts.dat.
  Nama baru ditambahkan di ujung first/second/common_names.dat.

Belum dikerjakan di sini (butuh file lain): daftar muat fmm_people (sicomps), klon klub yang belum ada.
Klub yang belum ada di club.dat diberi index dari peta klub yang diberikan pemanggil (klub klon).

Pakai:
  python3 scripts/build_people_v2710.py <folder_masuk> <folder_keluar> [peta_klub.csv]
peta_klub.csv (opsional): klub_data,club_index,club_uid untuk klub klon.
"""
import csv
import re
import datetime
import hashlib
import os
import struct
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import club as clubmod  # noqa: E402
import people           # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# UID orang baru: rentang 2100000001.. (27.1.0: UID orang maks 2.002.040.995, klub maks 2.000.627.140;
# rentang ini dicek kosong). Rentang lama 2000800001 TIDAK aman (sudah dipakai orang asli).
FIRST_NEW_UID = 2100000001
START_DATE = datetime.date(2026, 7, 1)
IDN = 58
JOB_PLAYER, JOB_COACH, JOB_PHYSIO, JOB_SCOUT, JOB_MANAGER, JOB_ASSISTANT = 1, 2, 12, 14, 16, 20

# Kode negara di dataset -> nama tim nasional di club.dat (index negara diambil dari situ).
ABROAD_CLUB_UID = {'Colorado Rapids': 1903, 'Kelantan The Real Warriors': 23502547, 'Al Wakrah': 135411, 'Sydney FC': 1300490,
                   # keputusan Bacad 24 Nov: São Paulo = "SPFC" (tanpa liga, tetap dipakai); klub yang tidak ada → klub lain berkompetisi
                   'São Paulo FC': 2000211203, 'Águilas FC': 67152828,            # U. Murcia (Segunda Federación, dekat Águilas)
                   'Moi Kampong Dewa': 107341}                    # Kagoshima United (J3; liga Malaysia/Brunei tidak dimuat)
CODE_TO_TEAM = {
    'EGY': 'Egypt', 'ITA': 'Italy', 'CAN': 'Canada', 'SUI': 'Switzerland',
    'IDN': 'Indonesia', 'BRA': 'Brazil', 'JPN': 'Japan', 'ESP': 'Spain', 'ARG': 'Argentina',
    'POR': 'Portugal', 'NED': 'Netherlands', 'SRB': 'Serbia', 'MKD': 'North Macedonia',
    'MNE': 'Montenegro', 'MLI': 'Mali', 'CRC': 'Costa Rica', 'CIV': 'Ivory Coast', 'COL': 'Colombia',
    'AUS': 'Australia', 'FRA': 'France', 'KOR': 'South Korea', 'ENG': 'England', 'URU': 'Uruguay',
    'POL': 'Poland', 'MEX': 'Mexico', 'CZE': 'Czechia', 'PAR': 'Paraguay', 'GNB': 'Guinea-Bissau',
    'GHA': 'Ghana', 'NGR': 'Nigeria', 'NGA': 'Nigeria', 'FIN': 'Finland', 'BOE': 'Bonaire',
    'NZL': 'New Zealand', 'DEN': 'Denmark', 'ANG': 'Angola', 'JAM': 'Jamaica', 'MAR': 'Morocco',
    'SVK': 'Slovakia', 'HAI': 'Haiti', 'PHI': 'Philippines', 'GAM': 'The Gambia', 'BOL': 'Bolivia',
    'SEN': 'Senegal', 'BUL': 'Bulgaria', 'TLS': 'East Timor', 'SLO': 'Slovenia', 'RSA': 'South Africa',
    'MAS': 'Malaysia', 'BDI': 'Burundi', 'UGA': 'Uganda', 'CPV': 'Cape Verde', 'CGO': 'Congo',
    'BIH': 'Bosnia and Herzegovina', 'CRO': 'Croatia', 'TJK': 'Tajikistan', 'KGZ': 'Kyrgyzstan',
    'EQG': 'Equatorial Guinea', 'UZB': 'Uzbekistan', 'MAD': 'Madagascar', 'TRI': 'Trinidad and Tobago',
    'BEL': 'Belgium', 'BLR': 'Belarus', 'CMR': 'Cameroon', 'IRN': 'Iran', 'ARM': 'Armenia',
    'SSD': 'South Sudan', 'NOR': 'Norway',
}
POS_CODE = {'GK': 'gk', 'DL': 'dl', 'DC': 'dc', 'DR': 'dr', 'DM': 'dm', 'ML': 'ml', 'MC': 'mc',
            'MR': 'mr', 'AML': 'aml', 'AMC': 'amc', 'AMR': 'amr', 'ST': 'st'}
# CA dasar (lokal, asing) per kompetisi. SL/CH dari data 27.1.0; LN/L4 perkiraan.
CA_BASE = {'BRI Super League': (80, 101), 'Pegadaian Champ Barat': (77, 90),
           'Pegadaian Champ Timur': (77, 88), 'Liga Nusantara': (64, 75), 'Liga 4': (52, 62)}


def norm(s):
    s = unicodedata.normalize('NFKD', s.strip().lower())
    return ''.join(c for c in s if not unicodedata.combining(c))


def h(s, n):
    """Angka semu-acak tetap (deterministik) dari teks."""
    return int(hashlib.sha256(s.encode()).hexdigest()[:8], 16) % n


def day_year(d):
    return ((d - datetime.date(d.year, 1, 1)).days, d.year)


def from_day_year(day, year):
    return datetime.date(year, 1, 1) + datetime.timedelta(days=day)


def comp_key(k):
    return 'Liga Nusantara' if k.startswith('Liga Nusantara') else k


# ------------------------------------------------------------- file nama (raw)
class NameFile:
    """first/second/common_names.dat: record mentah disimpan; nama baru ditambah di ujung."""

    def __init__(self, path):
        d = open(path, 'rb').read()
        self.header = d[:12]
        n = struct.unpack_from('<I', d, 8)[0]
        p = 12; self.raw = []; self.index = {}
        for i in range(n):
            st = p
            _z, idx, _g, nat, _u, _fl, ln = struct.unpack_from('<IIBIHBI', d, p); p += 20
            name = d[p:p + ln].decode('utf-8', 'replace'); p += ln
            self.raw.append(d[st:p])
            self.index.setdefault((name, nat), idx)
            self.index.setdefault((name, None), idx)
        if p != len(d):
            raise people.Bad('%s: sisa %d byte' % (path, len(d) - p))
        self.template = {}

    def get_or_add(self, name, nation_uid, template_raw):
        if (name, nation_uid) in self.index:
            return self.index[(name, nation_uid)]
        if (name, None) in self.index:
            return self.index[(name, None)]
        idx = len(self.raw)
        rec = bytearray(template_raw[:20])
        struct.pack_into('<I', rec, 4, idx)
        struct.pack_into('<I', rec, 9, nation_uid)
        b = name.encode('utf-8')
        struct.pack_into('<I', rec, 16, len(b))
        self.raw.append(bytes(rec) + b)
        self.index[(name, nation_uid)] = idx
        self.index[(name, None)] = idx
        return idx

    def build(self):
        hd = bytearray(self.header); struct.pack_into('<I', hd, 8, len(self.raw))
        return bytes(hd) + b''.join(self.raw)


# ---------------------------------------------------------------------- utama
def build(src, dst, club_map_extra=None, verbose=True):
    src = src.rstrip('/') + '/'
    ph, recs, _ = people.parse_people(open(src + 'people.dat', 'rb').read())
    plh, pls = people.split_fixed(open(src + 'players.dat', 'rb').read(), 82, 'players')
    sch, scs = people.split_fixed(open(src + 'starting_contracts.dat', 'rb').read(), 54, 'contracts')
    FN, SN, CN = (NameFile(src + n + '_names.dat') for n in ('first', 'second', 'common'))
    clubs, _, _ = clubmod.parse(src + 'club.dat', verbose=False)

    team_nat = {}
    for c in clubs:
        team_nat.setdefault(c['long'], c['nat'])
    # nation index -> nation UID dipakai file nama: ambil dari nama orang yang sudah ada
    nat_uid = {}
    for r in recs:
        if r['first'] < len(FN.raw) and r['nation'] not in nat_uid:
            nat_uid[r['nation']] = struct.unpack_from('<I', FN.raw[r['first']], 9)[0]

    # peta klub dataset -> (index, uid)
    kl = list(csv.DictReader(open(os.path.join(REPO, 'data/klub_indonesia.csv'), encoding='utf-8')))
    by_uid = {c['uid']: i for i, c in enumerate(clubs)}
    by_name = {}
    for i, c in enumerate(clubs):
        by_name.setdefault(norm(c['long']), i)
    alias = {'persikad depok': 'persikad kota depok'}
    club_map = {}
    for r in kl:
        # Bug v13 (Bacad 25 Nov): "Bali United FC" muncul 2x di CSV (BRI SL uid 7742801 dan baris "Dikeluarkan"
        # uid 2000340112 = Bali United Women). Baris kedua menimpa → pemain & staf masuk tim wanita.
        # Baris pertama menang; baris "Dikeluarkan" tidak pernah menimpa.
        if r['klub_data'] in club_map:
            continue
        u = int(r['uid']) if r['uid'] else None
        if u in by_uid:
            club_map[r['klub_data']] = (by_uid[u], u)
        elif norm(alias.get(norm(r['klub_data']), r['klub_data'])) in by_name:
            i = by_name[norm(alias.get(norm(r['klub_data']), r['klub_data']))]
            club_map[r['klub_data']] = (i, clubs[i]['uid'])
    if club_map_extra:
        club_map.update(club_map_extra)

    # templat orang per negara (pemain pertama dari negara itu); Indonesia: Pratama Arhan bila ada
    person_tpl = {}
    for r in recs:
        if r['player_index'] >= 0 and r['nation'] not in person_tpl and r['main_language']:
            person_tpl[r['nation']] = r
    # templat kontrak = kontrak PEMAIN di klub Indonesia (byte 24 = jabatan: 1 pemain, 16 manajer, 20 asisten,
    # 2 pelatih, 12 physio, 14 scout). Bug 23 Nov: templat pertama kebetulan kontrak manajer → semua pemain baru
    # tercatat sebagai manajer. Sekarang jabatan dipaksa 1.
    player_uids = {r['uid'] for r in recs if r['player_index'] >= 0}
    contract_tpl = None
    idn_club_uids = {u for _, u in club_map.values()}
    for x in scs:
        c = people.contract_fields(x)
        if c['club_uid'] in idn_club_uids and c['person_uid'] in player_uids and x[24] == 1:
            contract_tpl = x
            break
    assert contract_tpl is not None

    # kumpulan templat pemain per posisi utama
    pos_names = people.PLAYER_POSITIONS
    pool = {p: [] for p in pos_names}
    for i, x in enumerate(pls):
        for k, p in enumerate(pos_names):
            if x[42 + k] == 20:
                pool[p].append((struct.unpack_from('<h', x, 59)[0], i))
    for p in pool:
        pool[p].sort()

    # gaji & reputasi median per CA di klub Indonesia
    idn_clubs = {i for i, _ in club_map.values()}
    wage_by_uid = {people.contract_fields(x)['person_uid']: people.contract_fields(x)['wage'] for x in scs}
    ref = []
    for r in recs:
        if r['player_index'] >= 0 and r['club_index'] in idn_clubs:
            f = people.player_fields(pls[r['player_index']])
            ref.append((f['ca'], wage_by_uid.get(r['uid'], 0), f['rep_63'], f['rep_65'], f['rep_67']))

    def near(ca):
        s = sorted(ref, key=lambda t: abs(t[0] - ca))[:9]
        med = lambda k: sorted(t[k] for t in s)[len(s) // 2]  # noqa: E731
        return med(1), med(2), med(3), med(4)

    # pencocokan orang yang sudah ada
    name_idx = {}
    for i, r in enumerate(recs):
        f = FN.raw[r['first']] if r['first'] < len(FN.raw) else None
        first = f[20:].decode('utf-8', 'replace') if f else ''
        second = SN.raw[r['second']][20:].decode('utf-8', 'replace') if r['second'] < len(SN.raw) else ''
        keys = {norm((first + ' ' + second).strip())}
        if r['common'] >= 0:
            keys.add(norm(CN.raw[r['common']][20:].decode('utf-8', 'replace')))
        for k in keys:
            name_idx.setdefault(k, []).append(i)

    skipped = []
    rows = list(csv.DictReader(open(os.path.join(REPO, 'data/pemain_indonesia_v2.csv'), encoding='utf-8')))
    vals = {}
    for row in rows:
        vals.setdefault(comp_key(row['kompetisi']), []).append(float(row['nilai_juta_rp'] or 0))
    # Pemain Indonesia di luar negeri yang BELUM ada di database (data/pemain_indonesia_luar_negeri.csv, di_database = tidak;
    # log 73, mis. Mitchell Baker). Klub luar dipetakan manual lewat UID (nama di CSV ≠ nama di club.dat).
    # Kemampuan = perkiraan setara pemain lokal BRI Super League bernilai median (Bacad: "pakai perkiraan").
    foreign_map = {}
    by_uid_club = {c['uid']: i for i, c in enumerate(clubs)}
    sl_vals = sorted(vals.get(comp_key('BRI Super League'), [0]))
    med = sl_vals[len(sl_vals) // 2]
    for a in csv.DictReader(open(os.path.join(REPO, 'data/pemain_indonesia_luar_negeri.csv'), encoding='utf-8')):
        if a['di_database'].strip() != 'tidak':
            continue
        cu = ABROAD_CLUB_UID.get(a['klub'])
        if cu is None or cu not in by_uid_club:
            skipped.append((a['nama'], a['klub'], 'klub luar negeri tidak ada di database'))
            continue
        foreign_map[a['klub']] = (by_uid_club[cu], cu)
        m = re.search(r'tinggi (\d+)', a['catatan'] or '')
        rows.append({'kompetisi': 'BRI Super League', 'klub': a['klub'], 'no': '', 'nama': a['nama'], 'posisi': a['posisi'],
                     'posisi_lain': a['posisi_lain'], 'negara': 'IDN', 'tgl_lahir': a['tgl_lahir'], 'tinggi_cm': m.group(1) if m else '',
                     'kaki': '', 'nilai_juta_rp': str(med), 'kontrak_sampai': '', 'sumber': a['sumber'], 'perkiraan': 'luar negeri'})
    report = []; next_uid = FIRST_NEW_UID
    used = {r['uid'] for r in recs} | {c['uid'] for c in clubs}
    by_uid_contract = {people.contract_fields(x)['person_uid']: j for j, x in enumerate(scs)}

    for row in rows:
        if row['klub'] not in club_map and row['klub'] not in foreign_map:
            skipped.append((row['nama'], row['klub'], 'klub belum ada'))
            continue
        ci, cuid = club_map.get(row['klub']) or foreign_map[row['klub']]
        dob = datetime.date.fromisoformat(row['tgl_lahir']) if row['tgl_lahir'] else datetime.date(2000, 1, 1)
        end = datetime.date.fromisoformat(row['kontrak_sampai']) if row['kontrak_sampai'] else datetime.date(2027, 5, 31)
        codes = row['negara'].split('/') if row['negara'] else ['IDN']
        nats = [team_nat.get(CODE_TO_TEAM.get(c, ''), -1) for c in codes]
        if nats[0] < 0:
            skipped.append((row['nama'], row['klub'], 'negara %s tidak dikenal' % row['negara']))
            continue
        number = int(row['no']) if row['no'].isdigit() and int(row['no']) < 100 else 0

        # --- orang sudah ada?
        cand = [i for i in name_idx.get(norm(row['nama']), []) if recs[i]['player_index'] >= 0]
        same = [i for i in cand if from_day_year(recs[i]['dob_day'], recs[i]['dob_year']) == dob]
        idn_c = [i for i in cand if recs[i]['nation'] == IDN or recs[i]['club_index'] in idn_clubs]
        pick = same[0] if len(same) == 1 else (idn_c[0] if len(idn_c) == 1 else None)
        if pick is not None:
            r = recs[pick]
            old_club = r['club_index']
            r['club_index'] = ci
            if old_club != ci:
                r['joined'] = day_year(START_DATE)
            x = bytearray(pls[r['player_index']])
            if number:
                x[72] = number
            pls[r['player_index']] = bytes(x)
            j = by_uid_contract.get(r['uid'])
            if j is not None:
                c = bytearray(scs[j])
                struct.pack_into('<I', c, 4, cuid)
                if old_club != ci:
                    struct.pack_into('<HH', c, 16, *day_year(START_DATE))
                struct.pack_into('<HH', c, 20, *day_year(end))
                scs[j] = bytes(c)
            report.append({'aksi': 'perbarui', 'uid': r['uid'], 'nama': row['nama'], 'klub': row['klub'],
                           'ca': people.player_fields(pls[r['player_index']])['ca'], 'templat': ''})
            continue

        # --- orang baru
        while next_uid in used:
            next_uid += 1
        used.add(next_uid)
        ck = comp_key(row['kompetisi'])
        lokal, asing = CA_BASE.get(ck, (60, 70))
        base = lokal if codes[0] == 'IDN' else asing
        v = sorted(vals.get(ck, [0]))
        pct = (v.index(float(row['nilai_juta_rp'] or 0)) / max(1, len(v) - 1)) if v else 0.5
        ca = max(30, min(150, int(round(base + (pct - 0.5) * 24))))
        age = START_DATE.year - dob.year
        pa = min(200, ca + (25 if age < 21 else 12 if age < 24 else 4 if age < 28 else 0))
        pos = POS_CODE.get(row['posisi'], 'mc')
        cands = pool[pos] or pool['mc']
        cands = sorted(cands, key=lambda t: (abs(t[0] - ca), t[1]))[:15]
        tpl_i = cands[h(row['nama'] + row['tgl_lahir'], len(cands))][1]
        x = bytearray(pls[tpl_i])
        new_pi = len(pls)
        struct.pack_into('<I', x, 0, new_pi)
        # offset 4 = penunjuk riwayat karier (player_history.dat). Disalin dari templat = riwayat ORANG LAIN →
        # pemain baru masuk tim cadangan (uji v7, log 58). 0xFFFFFFFF = tanpa riwayat (pola 4.415 pemain ori).
        struct.pack_into('<I', x, 4, 0xFFFFFFFF)
        struct.pack_into('<hh', x, 59, ca, pa)
        wage, r63, r65, r67 = near(ca)
        struct.pack_into('<hhh', x, 63, r63, r65, r67)
        x[69] = 0
        x[72] = number
        x[73] = 0
        if row['tinggi_cm'].isdigit():
            struct.pack_into('<h', x, 74, int(row['tinggi_cm']))
        if row['kaki'] == 'Kanan':
            x[58] = 20
        elif row['kaki'] == 'Kiri':
            x[57] = 20
        elif row['kaki'] == 'Dua kaki':
            x[57] = x[58] = 18
        for alt in [a.strip() for a in row['posisi_lain'].split(',') if a.strip()]:
            if alt in POS_CODE:
                x[42 + pos_names.index(POS_CODE[alt])] = max(x[42 + pos_names.index(POS_CODE[alt])], 15)
        pls.append(bytes(x))

        tp = person_tpl.get(nats[0]) or person_tpl[IDN]
        nuid = nat_uid.get(nats[0], nat_uid[IDN])
        words = row['nama'].split()
        tplF = FN.raw[tp['first']] if tp['first'] < len(FN.raw) else FN.raw[0]
        tplS = SN.raw[tp['second']]
        tplC = CN.raw[tp['common']] if tp['common'] >= 0 else CN.raw[0]
        if len(words) == 1:   # pola Ferdiansyah: tanpa nama depan, nama belakang + nama umum
            fi, si = 0xFFFFFFFF, SN.get_or_add(words[0], nuid, tplS)
            co = CN.get_or_add(words[0], nuid, tplC)
        else:
            fi = FN.get_or_add(words[0], nuid, tplF)
            si = SN.get_or_add(' '.join(words[1:]), nuid, tplS)
            co = -1
        r = dict(tp)
        r.update({'uid': next_uid, 'first': fi, 'second': si, 'common': co,
                  'dob_day': day_year(dob)[0], 'dob_year': dob.year, 'nation': nats[0],
                  'other_nations': [n for n in nats[1:] if n >= 0],
                  'intl_date': (1, 1900), 'caps': 0, 'intl_goals': 0, 'intl_x': b'\x00\x00',
                  'club_index': ci, 'joined': day_year(START_DATE), 'pad0': b'\x00\x00',
                  'personality': bytes(8 + h(row['nama'] + str(k), 9) for k in range(8)),
                  'player_index': new_pi, 'non_player_index': -1, 'idx2': -1, 'idx3': -1, 'idx4': -1,
                  'staff_extra': None, 'official_index': -1, 'languages': [], 'relations': []})
        recs.append(r)
        c = bytearray(contract_tpl)
        struct.pack_into('<II', c, 0, next_uid, cuid)
        struct.pack_into('<HH', c, 16, *day_year(START_DATE))
        struct.pack_into('<HH', c, 20, *day_year(end))
        struct.pack_into('<I', c, 26, max(50, wage))
        struct.pack_into('<H', c, 24, JOB_PLAYER)
        scs.append(bytes(c))
        report.append({'aksi': 'baru', 'uid': next_uid, 'nama': row['nama'], 'klub': row['klub'],
                       'ca': ca, 'templat': tpl_i})
        next_uid += 1

    os.makedirs(dst, exist_ok=True)
    dst = dst.rstrip('/') + '/'
    open(dst + 'people.dat', 'wb').write(people.build_people(ph, recs))
    open(dst + 'players.dat', 'wb').write(people.join_fixed(plh, pls))
    open(dst + 'starting_contracts.dat', 'wb').write(people.join_fixed(sch, scs))
    for n, nf in (('first', FN), ('second', SN), ('common', CN)):
        open(dst + n + '_names.dat', 'wb').write(nf.build())
    with open(dst + 'laporan_pemain.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['aksi', 'uid', 'nama', 'klub', 'ca', 'templat'])
        w.writeheader(); w.writerows(report)
    with open(dst + 'dilewati_pemain.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['nama', 'klub', 'alasan']); w.writerows(skipped)
    new_uids = [x['uid'] for x in report if x['aksi'] == 'baru']
    if verbose:
        print('baru %d, diperbarui %d, dilewati %d (lihat %s)' % (
            len(new_uids), sum(x['aksi'] == 'perbarui' for x in report), len(skipped), dst))
    build.last_club_map = club_map
    return new_uids, report, skipped


def read_club_map(path):
    out = {}
    for r in csv.DictReader(open(path, encoding='utf-8')):
        out[r['klub_data']] = (int(r['club_index']), int(r['club_uid']))
    return out


if __name__ == '__main__':
    extra = read_club_map(sys.argv[3]) if len(sys.argv) > 3 else None
    build(sys.argv[1], sys.argv[2], extra)
