"""Tambah / perbarui staf Indonesia (data/staf_indonesia_v2.csv) di database 27.1.0.

Pola dari data asli 27.1.0 (lihat research/format_specs/people_players.md, log poin 30):
  jabatan (byte 24 kontrak) | file yang dipakai orang itu
  16 manajer                | non_players.dat
  20 asisten manajer        | non_players.dat + coaches.dat
   2 pelatih               | non_players.dat + coaches.dat
  12 physio                 | physios.dat
  14 scout                  | scouts.dat
Peta jabatan dataset: Head coach → 16; Assistant coach pertama per klub → 20, berikutnya → 2;
Goalkeeping coach / Fitness coach / U20 / U18 Head coach → 2; Physiotherapist & Doctor → 12;
Head of scouting, Analyst, Video analyst → 14 (keputusan "eksekusi" 23 Nov, padanan terdekat).
Technical director, Sporting director, Technical advisor: tidak ada padanannya → dilewati.

Orang baru: record people/non_players/coaches/physios/scouts + kontrak DISALIN dari staf asli dengan jabatan sama
(diutamakan orang Indonesia di klub Indonesia), lalu diganti UID/nama/tgl lahir/negara/klub/indeks. Record baru di
coaches/physios/scouts disisipkan sebelum 50 slot kosong (−1) di ujung, supaya slot kosong tetap di ujung dan
index lama tidak bergeser. Manajer lama di klub yang mendapat Head coach baru: kontraknya dihapus dan klubnya −1.
Semua ini HYPOTHESIS sampai diuji di game. Atribut staf = salinan templat (perkiraan).
"""
import csv
import datetime
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import people                                   # noqa: E402
from build_people_v2710 import (CODE_TO_TEAM, REPO, IDN, NameFile, day_year, h, norm,  # noqa: E402
                                JOB_COACH, JOB_PHYSIO, JOB_SCOUT, JOB_MANAGER, JOB_ASSISTANT, START_DATE)
import club as clubmod                           # noqa: E402

# negara Asia untuk kumpulan templat staf (nama tim nasional di club.dat)
ASIA_TEAMS = ('Indonesia', 'Malaysia', 'Thailand', 'Vietnam', 'Singapore', 'Philippines', 'Japan', 'South Korea', 'China', 'Australia',
              'India', 'Uzbekistan', 'Iran', 'Saudi Arabia', 'Qatar', 'United Arab Emirates', 'Myanmar', 'Cambodia', 'Hong Kong (China PR)')
# staf perempuan yang diketahui (Bacad 24 Nov); tambahan bisa lewat kolom jenis_kelamin = P di data/staf_indonesia_v2.csv
FEMALE_STAFF = {'hilda khoirun nisa'}
ROLE_FILE = {JOB_MANAGER: None, JOB_ASSISTANT: 'coaches', JOB_COACH: 'coaches', JOB_PHYSIO: 'physios', JOB_SCOUT: 'scouts'}
ROLE_IDX = {'coaches': 'idx2', 'scouts': 'idx3', 'physios': 'idx4'}


def job_of(title, first_assistant):
    t = title.strip().lower()
    if t == 'head coach':
        return JOB_MANAGER
    if t == 'assistant coach':
        return JOB_ASSISTANT if first_assistant else JOB_COACH
    if t in ('goalkeeping coach', 'fitness coach', 'u20 head coach', 'u18 head coach'):
        return JOB_COACH
    if t in ('physiotherapist', 'doctor'):          # dokter → physio (staf medis; FMM tidak punya jabatan dokter)
        return JOB_PHYSIO
    if t in ('head of scouting', 'analyst', 'video analyst'):   # analis → scout (scout FMM juga membuat analisa lawan)
        return JOB_SCOUT
    return None


class RoleFile:
    """coaches/scouts/physios.dat: u32 nomor urut (−1 = slot kosong di ujung) + 3 byte."""

    def __init__(self, path):
        d = open(path, 'rb').read()
        self.header, self.recs = people.split_fixed(d, 7, os.path.basename(path))
        k = len(self.recs)
        while k and struct.unpack_from('<i', self.recs[k - 1], 0)[0] == -1:
            k -= 1
        self.used, self.empty = self.recs[:k], self.recs[k:]
        assert all(struct.unpack_from('<i', r, 0)[0] == i for i, r in enumerate(self.used))

    def add(self, template7):
        i = len(self.used)
        r = bytearray(template7); struct.pack_into('<i', r, 0, i)
        self.used.append(bytes(r))
        return i

    def build(self):
        return people.join_fixed(self.header, self.used + self.empty)


def build(src, dst, club_map, verbose=True):
    """src/dst = folder db (people, non_players, coaches, physios, scouts, starting_contracts, 3 file nama).
    club_map: nama klub dataset -> (club_index, club_uid). Mengembalikan (laporan, dilewati)."""
    src = src.rstrip('/') + '/'; dst = dst.rstrip('/') + '/'
    ph, recs, _ = people.parse_people(open(src + 'people.dat', 'rb').read())
    nph, nps = people.split_fixed(open(src + 'non_players.dat', 'rb').read(), 39, 'non_players')
    roles = {n: RoleFile(src + n + '.dat') for n in ('coaches', 'physios', 'scouts')}
    sch, scs = people.split_fixed(open(src + 'starting_contracts.dat', 'rb').read(), 54, 'contracts')
    FN, SN, CN = (NameFile(src + n + '_names.dat') for n in ('first', 'second', 'common'))
    clubs, _, _ = clubmod.parse(src + 'club.dat', verbose=False)
    team_nat = {}
    for c in clubs:
        team_nat.setdefault(c['long'], c['nat'])
    byuid = {r['uid']: i for i, r in enumerate(recs)}
    idn_club_uids = {u for _, u in club_map.values()}
    contracts_by_uid = {}
    for j, x in enumerate(scs):
        contracts_by_uid.setdefault(struct.unpack_from('<I', x, 0)[0], []).append(j)

    # Templat per jabatan (log 72): dulu SATU templat per jabatan → semua staf baru sama persis (atribut, formasi, gaya,
    # badge, aptitude). Sekarang KUMPULAN staf asli Asia (negara di ASIA_TEAMS) per jabatan; tiap orang dapat templat
    # berbeda (dipilih dari hash nama), jadi formasi/gaya/atribut bervariasi seperti data ori.
    asia = {team_nat[n] for n in ASIA_TEAMS if n in team_nat}
    pool = {}
    for x in scs:
        u, cu = struct.unpack_from('<II', x, 0)
        job = x[24]
        if job not in ROLE_FILE or u not in byuid:
            continue
        r = recs[byuid[u]]
        need_np = job in (JOB_MANAGER, JOB_ASSISTANT, JOB_COACH)
        rf = ROLE_FILE[job]
        if need_np != (r['non_player_index'] >= 0) or (rf and r[ROLE_IDX[rf]] < 0) or r['player_index'] >= 0:
            continue
        if r['nation'] in asia and (r['flags3'][0] == 0):
            pool.setdefault(job, []).append((r, bytes(x)))
    assert set(pool) == set(ROLE_FILE), set(ROLE_FILE) - set(pool)
    tpl = {j: (0, l[0][0], l[0][1]) for j, l in pool.items()}

    def full_name(r):
        f = FN.raw[r['first']][20:].decode('utf-8', 'replace') if r['first'] < len(FN.raw) else ''
        s = SN.raw[r['second']][20:].decode('utf-8', 'replace') if r['second'] < len(SN.raw) else ''
        keys = {norm((f + ' ' + s).strip())}
        if r['common'] >= 0:
            keys.add(norm(CN.raw[r['common']][20:].decode('utf-8', 'replace')))
        return keys
    name_idx = {}
    for i, r in enumerate(recs):
        if r['player_index'] < 0:
            for k in full_name(r):
                name_idx.setdefault(k, []).append(i)

    used_uids = {r['uid'] for r in recs} | {c['uid'] for c in clubs}
    next_uid = max([u for u in used_uids if 2100000001 <= u < 2200000000] + [2100000000]) + 1
    rows = list(csv.DictReader(open(os.path.join(REPO, 'data/staf_indonesia_v2.csv'), encoding='utf-8')))
    # kebangsaan & jenis kelamin staf yang kolom negara kosong: data/staf_negara_nama.csv (ditebak dari nama,
    # keputusan Bacad 24 Nov, log 74 — pencarian Wikipedia dihentikan)
    wiki_nat, female_names = {}, set(FEMALE_STAFF)
    wp = os.path.join(REPO, 'data/staf_negara_nama.csv')
    if os.path.exists(wp):
        for w in csv.DictReader(open(wp, encoding='utf-8')):
            wiki_nat[norm(w['nama'])] = w['negara']
            if w['jenis_kelamin'].strip().upper() == 'P':
                female_names.add(norm(w['nama']))
    report, skipped = [], []
    assistant_seen = set()
    managers_new = {}
    drop_contracts = set()

    for row in rows:
        if row['klub'] not in club_map:
            skipped.append((row['nama'], row['klub'], row['jabatan'], 'klub belum ada')); continue
        first_asst = row['jabatan'].strip().lower() == 'assistant coach' and row['klub'] not in assistant_seen
        job = job_of(row['jabatan'], first_asst)
        if job is None:
            skipped.append((row['nama'], row['klub'], row['jabatan'], 'jabatan tidak ada padanan di game')); continue
        if job == JOB_ASSISTANT:
            assistant_seen.add(row['klub'])
        ci, cuid = club_map[row['klub']]
        end = datetime.date.fromisoformat(row['kontrak_sampai']) if row['kontrak_sampai'] else datetime.date(2027, 5, 31)
        codes = [c for c in (row['negara'] or wiki_nat.get(norm(row['nama'])) or 'IDN').split('/') if c]
        nats = [team_nat.get(CODE_TO_TEAM.get(c, ''), -1) for c in codes]
        if nats[0] < 0:
            skipped.append((row['nama'], row['klub'], row['jabatan'], 'negara %s tidak dikenal' % row['negara'])); continue

        cand = name_idx.get(norm(row['nama']), [])
        cand = [i for i in cand if recs[i]['nation'] == nats[0] or recs[i]['club_index'] == ci]
        if len(cand) == 1:                                   # orang sudah ada: pindah klub + kontrak
            r = recs[cand[0]]
            r['club_index'] = ci; r['joined'] = day_year(START_DATE)
            for j in contracts_by_uid.get(r['uid'], []):
                c = bytearray(scs[j]); struct.pack_into('<I', c, 4, cuid)
                struct.pack_into('<HH', c, 20, *day_year(end)); scs[j] = bytes(c)
            if job == JOB_MANAGER:
                managers_new[ci] = r['uid']
            report.append({'aksi': 'perbarui', 'uid': r['uid'], 'nama': row['nama'], 'klub': row['klub'], 'jabatan': job})
            continue

        while next_uid in used_uids:
            next_uid += 1
        used_uids.add(next_uid)
        cand_t = pool[job]
        tp, tcon = cand_t[h(row['nama'] + '|tpl', len(cand_t))]
        r = dict(tp)
        nuid = struct.unpack_from('<I', FN.raw[tp['first']], 9)[0] if tp['first'] < len(FN.raw) else 113
        words = row['nama'].split()
        tF = FN.raw[tp['first']] if tp['first'] < len(FN.raw) else FN.raw[0]
        tS = SN.raw[tp['second']]
        tC = CN.raw[tp['common']] if tp['common'] >= 0 else CN.raw[0]
        if len(words) == 1:
            fi, si, co = 0xFFFFFFFF, SN.get_or_add(words[0], nuid, tS), CN.get_or_add(words[0], nuid, tC)
        else:
            fi, si, co = FN.get_or_add(words[0], nuid, tF), SN.get_or_add(' '.join(words[1:]), nuid, tS), -1
        age = int(row['umur']) if row['umur'].isdigit() else 45
        r.update({'uid': next_uid, 'first': fi, 'second': si, 'common': co,
                  'dob_day': h(row['nama'], 365), 'dob_year': 2026 - age, 'nation': nats[0],
                  'other_nations': [n for n in nats[1:] if n >= 0],
                  'intl_date': (1, 1900), 'caps': 0, 'intl_goals': 0, 'intl_x': b'\x00\x00',
                  'club_index': ci, 'joined': day_year(START_DATE),
                  'personality': bytes(8 + h(row['nama'] + str(k), 9) for k in range(8)),
                  'player_index': -1, 'non_player_index': -1, 'idx2': -1, 'idx3': -1, 'idx4': -1,
                  'languages': [], 'relations': []})
        if job in (JOB_MANAGER, JOB_ASSISTANT, JOB_COACH):
            x = bytearray(nps[tp['non_player_index']]); struct.pack_into('<I', x, 0, len(nps)); nps.append(bytes(x))
            r['non_player_index'] = len(nps) - 1
        rf = ROLE_FILE[job]
        if rf:
            t7 = roles[rf].used[tp[ROLE_IDX[rf]]]
            r[ROLE_IDX[rf]] = roles[rf].add(t7)
        if r['non_player_index'] < 0 and r['idx2'] < 0 and r['idx3'] < 0 and r['idx4'] < 0:
            r['staff_extra'] = None
        elif r['staff_extra'] is None:
            r['staff_extra'] = b'\x00\x01'
        # jenis kelamin (log 72): flags3 byte 0 = 1 perempuan (pola 374/399 orang klub wanita ori), staff_extra byte 0 = 1
        female = norm(row['nama']) in female_names or (row.get('jenis_kelamin') or '').strip().upper() in ('P', 'F', 'W')
        r['flags3'] = bytes([1 if female else 0]) + bytes(r['flags3'][1:])
        if r['staff_extra'] is not None:
            r['staff_extra'] = bytes([1 if female else 0]) + bytes(r['staff_extra'][1:])
        recs.append(r)
        c = bytearray(tcon)
        struct.pack_into('<II', c, 0, next_uid, cuid)
        struct.pack_into('<HH', c, 16, *day_year(START_DATE))
        struct.pack_into('<HH', c, 20, *day_year(end))
        struct.pack_into('<H', c, 24, job)
        scs.append(bytes(c))
        if job == JOB_MANAGER:
            managers_new[ci] = next_uid
        report.append({'aksi': 'baru', 'uid': next_uid, 'nama': row['nama'], 'klub': row['klub'], 'jabatan': job})
        next_uid += 1

    # manajer lama di klub yang dapat Head coach dari dataset: lepas dari klub
    released = []
    club_uid_of = {i: u for i, u in club_map.values()}
    for j, x in enumerate(scs):
        u, cu = struct.unpack_from('<II', x, 0)
        if x[24] == JOB_MANAGER and u in byuid:
            ci = next((i for i, uu in club_uid_of.items() if uu == cu), None)
            if ci in managers_new and managers_new[ci] != u:
                drop_contracts.add(j)
                recs[byuid[u]]['club_index'] = -1
                released.append(u)
    scs = [x for j, x in enumerate(scs) if j not in drop_contracts]

    # Jatah staf per klub (uji v7, log 59–62): melebihi jatah → SEMUA staf klub hilang dari halaman Staff.
    # Jatah dari fasilitas latihan (byte 1 blok misc club.dat): Kashima 15 → pelatih 4 / scout 3 / physio 3;
    # Persib 13 → 3/3/3; Persibo 5 → 2/1/1. Rentang lain belum terbukti → batas aman. Asisten tidak dihitung
    # sebagai pelatih — KOREKSI log 63: slot 0–3 club.dat berisi asisten + pelatih, jadi asisten ikut dihitung. Kelebihan dilepas jadi staf bebas (tanpa klub & kontrak).
    cdat = open(src + 'club.dat', 'rb').read()

    def slots(ci):
        # pelatih = slot 0–3 club.dat, asisten ikut dihitung (asisten biasanya di slot 0; rosters_v2710.py)
        tr = cdat[clubs[ci]['o_misc'] + 1]
        if tr >= 14:
            return {JOB_COACH: 4, JOB_SCOUT: 3, JOB_PHYSIO: 3}
        if tr >= 13:
            return {JOB_COACH: 3, JOB_SCOUT: 3, JOB_PHYSIO: 3}
        if tr >= 10:
            return {JOB_COACH: 2, JOB_SCOUT: 2, JOB_PHYSIO: 2}
        return {JOB_COACH: 2, JOB_SCOUT: 1, JOB_PHYSIO: 1}
    idn_ci = {i for i, _ in club_map.values()}
    seen, over = {}, set()
    for j, x in enumerate(scs):
        u, cu = struct.unpack_from('<II', x, 0)
        job = x[24]
        k = byuid.get(u)
        if k is None:
            k = next((i for i in range(len(byuid), len(recs)) if recs[i]['uid'] == u), None)
        if k is None or job not in (JOB_COACH, JOB_SCOUT, JOB_PHYSIO, JOB_ASSISTANT):
            continue
        ci = recs[k]['club_index']
        if ci not in idn_ci:
            continue
        kind = JOB_COACH if job == JOB_ASSISTANT else job
        n = seen.setdefault((ci, kind), 0) + 1
        seen[(ci, kind)] = n
        if n > slots(ci)[kind]:
            over.add(j)
            recs[k]['club_index'] = -1
    scs = [x for j, x in enumerate(scs) if j not in over]
    if verbose:
        print('jatah staf: %d staf dilepas jadi staf bebas' % len(over))

    os.makedirs(dst, exist_ok=True)
    open(dst + 'people.dat', 'wb').write(people.build_people(ph, recs))
    open(dst + 'non_players.dat', 'wb').write(people.join_fixed(nph, nps))
    for n, rfile in roles.items():
        open(dst + n + '.dat', 'wb').write(rfile.build())
    open(dst + 'starting_contracts.dat', 'wb').write(people.join_fixed(sch, scs))
    for n, nf in (('first', FN), ('second', SN), ('common', CN)):
        open(dst + n + '_names.dat', 'wb').write(nf.build())
    with open(dst + 'laporan_staf.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['aksi', 'uid', 'nama', 'klub', 'jabatan']); w.writeheader(); w.writerows(report)
    with open(dst + 'dilewati_staf.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['nama', 'klub', 'jabatan', 'alasan']); w.writerows(skipped)
    if verbose:
        print('staf baru %d, diperbarui %d, dilewati %d, manajer lama dilepas %d' % (
            sum(x['aksi'] == 'baru' for x in report), sum(x['aksi'] == 'perbarui' for x in report), len(skipped), len(released)))
    return report, skipped, released
