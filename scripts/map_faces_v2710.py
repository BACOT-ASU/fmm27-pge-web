"""Peta wajah: config.xml wajah dari pictures_logos.fmf MODDER -> UID orang di build 27.1.0 kita.

Orang dicocokkan lewat identitas (nama lengkap/nama umum + tanggal lahir), BUKAN lewat UID, supaya
salah-peta di data modder dan UID pemain baru kita (2.100.000.001+) tertangani.
  1. UID modder -> orang di people.dat modder (nama, tgl lahir).
  2. Cari orang dengan nama + tgl lahir sama di people.dat kita. Kalau ada tepat satu -> pakai UID kita.
  3. Kalau tidak ketemu: nama sama + negara sama, dan kandidatnya TEPAT SATU di kedua sisi
     (tanggal lahir di dataset Indonesia banyak yang perkiraan) -> status 'cocok_nama_negara'.
  4. Tidak ketemu / ganda -> tidak dipetakan (dicatat).

Keluaran: CSV `from,to_uid,modder_uid,nama,status` (from = nama file PNG di arsip modder, mis. custom/3).

Pakai:
  python3 scripts/map_faces_v2710.py <faces_config.xml modder> <folder db modder> <folder db kita> <keluar.csv>
Folder db = berisi people.dat + first/second/common_names.dat.
"""
import csv
import datetime
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import people  # noqa: E402
from build_people_v2710 import NameFile  # noqa: E402

REC = re.compile(r'<record from="([^"]+)" to="graphics/pictures/person/(\d+)/portrait"/>')


def norm(s):
    s = unicodedata.normalize('NFKD', s.strip().lower())
    return ''.join(c for c in s if not unicodedata.combining(c))


def load(folder):
    folder = folder.rstrip('/') + '/'
    _, recs, _ = people.parse_people(open(folder + 'people.dat', 'rb').read())
    F, S, C = (NameFile(folder + n + '_names.dat') for n in ('first', 'second', 'common'))

    def nm(raw_list, i):
        return raw_list[i][20:].decode('utf-8', 'replace') if 0 <= i < len(raw_list) else ''
    out = []
    for r in recs:
        full = (nm(F.raw, r['first']) + ' ' + nm(S.raw, r['second'])).strip()
        common = nm(C.raw, r['common']) if r['common'] >= 0 else ''
        dob = datetime.date(r['dob_year'], 1, 1) + datetime.timedelta(days=r['dob_day'])
        out.append((r['uid'], full, common, dob, r['nation']))
    return out


def build_map(config_xml, mod_folder, our_folder):
    faces = REC.findall(open(config_xml, encoding='utf-8').read())
    mod = {u: (full, common, dob, nat) for u, full, common, dob, nat in load(mod_folder)}
    ours = load(our_folder)
    our_uids = {u for u, *_ in ours}
    idx = {}; idx_nat = {}; mod_nat = {}
    for u, full, common, dob, nat in ours:
        for k in {norm(full), norm(common)} - {''}:
            idx.setdefault((k, dob), set()).add(u)
            idx_nat.setdefault((k, nat), set()).add(u)
    for u, (full, common, dob, nat) in mod.items():
        for k in {norm(full), norm(common)} - {''}:
            mod_nat.setdefault((k, nat), set()).add(u)
    rows = []; stat = {}
    for frm, mu in faces:
        mu = int(mu)
        p = mod.get(mu)
        if p is None:
            st, tu, name = 'uid_modder_tanpa_orang', '', ''
        else:
            full, common, dob, nat = p
            name = common or full
            cand = set()
            for k in {norm(full), norm(common)} - {''}:
                cand |= idx.get((k, dob), set())
            if len(cand) == 1:
                tu = cand.pop()
                st = 'uid_sama' if tu == mu else 'uid_dipetakan_ulang'
            elif len(cand) > 1:
                st, tu = ('ganda_pakai_uid_sama', mu) if mu in cand else ('ganda', '')
            else:
                keys = {norm(full), norm(common)} - {''}
                c2 = set().union(*(idx_nat.get((k, nat), set()) for k in keys)) if keys else set()
                m2 = set().union(*(mod_nat.get((k, nat), set()) for k in keys)) if keys else set()
                if len(c2) == 1 and len(m2) == 1:
                    tu = c2.pop(); st = 'cocok_nama_negara'
                else:
                    st, tu = 'tidak_ada_di_build', ''
        stat[st] = stat.get(st, 0) + 1
        rows.append({'from': frm, 'to_uid': tu, 'modder_uid': mu, 'nama': name, 'status': st})
    return rows, stat, our_uids


if __name__ == '__main__':
    rows, stat, _ = build_map(sys.argv[1], sys.argv[2], sys.argv[3])
    with open(sys.argv[4], 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['from', 'to_uid', 'modder_uid', 'nama', 'status'])
        w.writeheader(); w.writerows(rows)
    print(len(rows), 'record wajah:', ', '.join('%s %d' % kv for kv in sorted(stat.items())))
