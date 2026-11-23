"""Daftar skuad & slot staf di club.dat mengikuti people.dat hasil build (log 63).

Temuan 23 Nov (dibuktikan dari db ori 27.1.0):
- Record club.dat punya `u16 N + N × i32` = daftar SKUAD dan `12 × i32` = SLOT STAF. Isinya NOMOR URUT orang di
  people.dat (bukan UID): Persib skuad[0] = 31418 = Thom Haye; slot staf Bali = 322 = pelatih UID 7410.
- Slot staf (pola 5.800 klub ori): 0–3 pelatih (asisten biasanya di slot 0), 4 selalu kosong, 5–7 scout,
  8–10 physio, 11 = bukan daftar staf (isinya campur pemain/manajer/kosong) → tidak disentuh.
- Penyebab bug uji v7: pemain/staf baru tidak ada di daftar ini → pemain baru ke tim cadangan, halaman Staff kosong.

Aturan:
- Skuad tiap klub = skuad lama tanpa pemain yang club_index-nya sudah pindah oleh build kita, ditambah pemain
  yang sekarang club_index = klub itu tapi belum ada di daftar (urutan lama dipertahankan).
- Slot staf diisi ulang hanya untuk klub yang staf/kontraknya diubah build kita: slot 0–3 asisten lalu pelatih,
  5–7 scout, 8–10 physio (berdasarkan jabatan di starting_contracts byte 24); slot 4 dan 11 tetap.

Pakai (dipanggil build_v2710_db.py):  apply(dbdir, people_ori_path) → laporan
"""
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import club as clubmod   # noqa: E402
import people            # noqa: E402

JOB_COACH, JOB_ASSISTANT, JOB_SCOUT, JOB_PHYSIO = 2, 20, 14, 12
SLOT_COACH, SLOT_SCOUT, SLOT_PHYSIO = range(0, 4), range(5, 8), range(8, 11)


def apply(dbdir, people_ori_path, verbose=True):
    dbdir = dbdir.rstrip('/') + '/'
    d = open(dbdir + 'club.dat', 'rb').read()
    clubs, end, total = clubmod.parse(dbdir + 'club.dat', verbose=False)
    assert end == total
    _, recs, _ = people.parse_people(open(dbdir + 'people.dat', 'rb').read())
    _, orig, _ = people.parse_people(open(people_ori_path, 'rb').read())
    orig_club = {r['uid']: r['club_index'] for r in orig}
    _, scs = people.split_fixed(open(dbdir + 'starting_contracts.dat', 'rb').read(), 54, 'contracts')
    job = {}
    for x in scs:
        u, _cu = struct.unpack_from('<II', x, 0)
        job.setdefault(u, x[24])

    players_at, staff_at, touched_staff = {}, {}, set()
    moved = set()
    for i, r in enumerate(recs):
        ci = r['club_index']
        if orig_club.get(r['uid'], 'baru') != ci:
            moved.add(i)
            if r['player_index'] < 0:
                touched_staff.add(ci)
                if r['uid'] in orig_club and orig_club[r['uid']] >= 0:
                    touched_staff.add(orig_club[r['uid']])
        if ci < 0:
            continue
        if r['player_index'] >= 0:
            players_at.setdefault(ci, []).append(i)
        elif job.get(r['uid']) in (JOB_COACH, JOB_ASSISTANT, JOB_SCOUT, JOB_PHYSIO):
            staff_at.setdefault(ci, []).append(i)

    out = [d[:12]]
    pos = 12
    n_sq = n_st = 0
    for ci, c in enumerate(clubs):
        assert c['off'] == pos
        rec = d[c['off']:c['off'] + c['len']]
        o = c['o_squad'] - c['off']
        m = struct.unpack_from('<H', rec, o)[0]
        squad = list(struct.unpack_from('<%di' % m, rec, o + 2))
        staff = list(struct.unpack_from('<12i', rec, o + 2 + 4 * m))
        new_squad = [x for x in squad if not (x in moved and recs[x]['club_index'] != ci)] if squad else []
        have = set(new_squad)
        new_squad += [x for x in players_at.get(ci, []) if x not in have]
        new_staff = list(staff)
        if ci in touched_staff:
            lst = staff_at.get(ci, [])
            coach = [x for x in lst if job[recs[x]['uid']] == JOB_ASSISTANT] + [x for x in lst if job[recs[x]['uid']] == JOB_COACH]
            scout = [x for x in lst if job[recs[x]['uid']] == JOB_SCOUT]
            phys = [x for x in lst if job[recs[x]['uid']] == JOB_PHYSIO]
            for slots, people_ in ((SLOT_COACH, coach), (SLOT_SCOUT, scout), (SLOT_PHYSIO, phys)):
                for k, s in enumerate(slots):
                    new_staff[s] = people_[k] if k < len(people_) else -1
        if new_squad != squad or new_staff != staff:
            n_sq += new_squad != squad
            n_st += new_staff != staff
            rec = (rec[:o] + struct.pack('<H', len(new_squad)) + struct.pack('<%di' % len(new_squad), *new_squad)
                   + struct.pack('<12i', *new_staff) + rec[o + 2 + 4 * m + 48:])
        out.append(rec)
        pos += c['len']
    out.append(d[pos:])
    nd = b''.join(out)
    open(dbdir + 'club.dat', 'wb').write(nd)
    c2, e2, t2 = clubmod.parse(dbdir + 'club.dat', verbose=False)
    assert e2 == t2 and len(c2) == len(clubs)
    if verbose:
        print('club.dat: skuad diperbarui %d klub, slot staf diperbarui %d klub' % (n_sq, n_st))
    return {'skuad_diperbarui': n_sq, 'slot_staf_diperbarui': n_st}
