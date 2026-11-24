"""Logo klub Indonesia (data/logo_klub/<UID>_<nama>.png, gambar dari Bacad) ke pictures_logos.fmf 27.1.0.

Pola sama dengan src/core/formats/logos/logoConfig.ts (VERIFIED B6/B7b):
  pictures_logos/logos/{normal,small}/clubs/custom/<UID>.png  (normal 180x180, small 25x18; gambar dimuat utuh di tengah, latar transparan)
  config.xml: baris lama untuk UID itu dihapus, baris `<record from="custom/<UID>" to="graphics/pictures/club/<UID>/{logo,icon}"/>` ditambah.
Klon B7b yang di 27.1.0 sudah punya klub asli (Batavia FC, Persinab Nabire, Persikad) → UID klub asli. Kalau klub asli
sudah punya logo resmi di 27.1.0, logo resmi DIPERTAHANKAN (dicatat di laporan).
Wajah (logos/normal/people) ditambahkan terpisah lewat tab Wajah di aplikasi.

Pakai:
  python3 scripts/build_v2710_logos.py <pictures_logos.fmf ori 27.1.0> <folder db hasil build> <keluar.fmf> [folder logo tambahan ...]
Folder tambahan (mis. samples/logo_timnas dari scripts/fetch_logo_timnas.py) berisi <UID>_<nama>.png.
"""
import io
import json
import os
import re
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import club as clubmod  # noqa: E402
import comp as compmod  # noqa: E402
import fmfio            # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = 'pictures_logos/logos'
SIZES = {'normal': ((180, 180), 'logo'), 'small': ((25, 18), 'icon')}
CLONE_TO_NATIVE = {2000700004: 41023300, 2000700014: 41001027, 2000700019: 2000465973}


def fit_png(img, w, h):
    im = img.convert('RGBA')
    im.thumbnail((w, h), Image.LANCZOS)
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    canvas.paste(im, ((w - im.width) // 2, (h - im.height) // 2), im)
    buf = io.BytesIO(); canvas.save(buf, 'PNG', optimize=True)
    return buf.getvalue()


def edit_config(text, uid, suffix, kind='club'):
    to = 'graphics/pictures/%s/%d/%s' % (kind, uid, suffix)
    text = re.sub(r'[ \t]*<record from="[^"]*" to="%s"/>\r?\n' % re.escape(to), '', text)
    nl = '\r\n' if '\r\n' in text else '\n'
    i = text.rindex('</list>'); ls = text.rindex('\n', 0, i) + 1
    return text[:ls] + '\t\t<record from="custom/%d" to="%s"/>%s' % (uid, to, nl) + text[ls:]


def build(ori_path, dbdir, out_path, extra_dirs=(), verbose=True):
    flag, root, _ = fmfio.read(open(ori_path, 'rb').read())
    rows = dict(fmfio.walk(root))
    clubs, _, _ = clubmod.parse(os.path.join(dbdir, 'club.dat'), verbose=False)
    club_uids = {c['uid'] for c in clubs}
    cfg = {k: fmfio.get(rows['%s/%s/clubs/config.xml' % (BASE, k)]).decode('utf-8-sig') for k in SIZES}
    has_bom = fmfio.get(rows['%s/normal/clubs/config.xml' % BASE]).startswith(b'\xef\xbb\xbf')
    existing = {int(m) for m in re.findall(r'to="graphics/pictures/club/(\d+)/logo"', cfg['normal'])}

    def folder(path):
        parts = path.split('/'); f = root
        for n in parts[1:]:
            nx = next((s for s in f.subs if s.name.decode() == n), None)
            if nx is None:
                nx = fmfio.Folder(n.encode()); f.subs.append(nx)
            f = nx
        return f
    ref = rows['%s/normal/clubs/config.xml' % BASE]
    done, kept_official, missing_club = [], [], []
    files = [(os.path.join(REPO, 'data/logo_klub'), fn) for fn in sorted(os.listdir(os.path.join(REPO, 'data/logo_klub')))]
    for d in extra_dirs:                       # mis. logo timnas (log 63): <UID>_<nama>.png, timnas = klub di club.dat
        files += [(d, fn) for fn in sorted(os.listdir(d))]
    for src_dir, fn in files:
        if not fn.lower().endswith('.png'):
            continue
        uid = int(fn.split('_')[0])
        uid = CLONE_TO_NATIVE.get(uid, uid)
        if uid not in club_uids:
            missing_club.append(fn); continue
        if uid in CLONE_TO_NATIVE.values() and uid in existing:
            kept_official.append((fn, uid)); continue
        img = Image.open(os.path.join(src_dir, fn))
        for k, ((w, h), sfx) in SIZES.items():
            png = fit_png(img, w, h)
            fo = folder('%s/%s/clubs/custom' % (BASE, k))
            name = str(uid).encode()
            row = next((x for x in fo.files if x[0] == name and x[1] == b'.png'), None)
            if row is None:
                fo.files.append([name, b'.png', png, ref[3], ref[4], None, len(png), None])
            else:
                row[2] = png; row[5] = None
            cfg[k] = edit_config(cfg[k], uid, sfx)
            if src_dir != files[0][0]:
                # logo timnas: config logo modder lain (R7, pola FM) memetakan timnas ke graphics/pictures/team/<UID>/…
                # (bukan club/). Dipasang dua-duanya ke file PNG yang sama (log 77).
                cfg[k] = edit_config(cfg[k], uid, sfx, 'team')
        done.append((fn, uid))
    for k in SIZES:
        r = rows['%s/%s/clubs/config.xml' % (BASE, k)]
        r[2] = (b'\xef\xbb\xbf' if has_bom else b'') + cfg[k].encode('utf-8'); r[5] = None
    # logo kompetisi (data/logo_kompetisi/<UID>_<nama>.png, gambar dari Bacad; log 75): pola sama, folder comps
    comp_dir = os.path.join(REPO, 'data/logo_kompetisi')
    comp_uids = {c['uid'] for c in compmod.parse(os.path.join(dbdir, 'competition.dat'))[0]}
    ccfg = {k: fmfio.get(rows['%s/%s/comps/config.xml' % (BASE, k)]).decode('utf-8-sig') for k in SIZES}
    cbom = {k: fmfio.get(rows['%s/%s/comps/config.xml' % (BASE, k)]).startswith(b'\xef\xbb\xbf') for k in SIZES}
    comps_done = []
    for fn in sorted(os.listdir(comp_dir)) if os.path.isdir(comp_dir) else []:
        if not fn.lower().endswith('.png'):
            continue
        uid = int(fn.split('_')[0])
        if uid not in comp_uids:
            missing_club.append(fn); continue
        img = Image.open(os.path.join(comp_dir, fn))
        for k, ((w, h), sfx) in SIZES.items():
            png = fit_png(img, w, h)
            fo = folder('%s/%s/comps/custom' % (BASE, k))
            name = str(uid).encode()
            row = next((x for x in fo.files if x[0] == name and x[1] == b'.png'), None)
            if row is None:
                fo.files.append([name, b'.png', png, ref[3], ref[4], None, len(png), None])
            else:
                row[2] = png; row[5] = None
            ccfg[k] = edit_config(ccfg[k], uid, sfx, 'comp')
        comps_done.append((fn, uid))
    for k in SIZES:
        r = rows['%s/%s/comps/config.xml' % (BASE, k)]
        r[2] = (b'\xef\xbb\xbf' if cbom[k] else b'') + ccfg[k].encode('utf-8'); r[5] = None
    out, _ = fmfio.write(flag, root)
    open(out_path, 'wb').write(out)
    _, r2, _ = fmfio.read(out)
    back = dict(fmfio.walk(r2))
    for _, uid in done:
        for k in SIZES:
            assert '%s/%s/clubs/custom/%d.png' % (BASE, k, uid) in back
    rep = {'logo_kompetisi': comps_done, 'logo_dimasukkan': done, 'logo_resmi_dipertahankan': kept_official, 'klub_tidak_ada': missing_club, 'ukuran': len(out)}
    json.dump(rep, open(os.path.splitext(out_path)[0] + '_laporan.json', 'w'), indent=1, ensure_ascii=False)
    if verbose:
        print('logo %d, resmi dipertahankan %d, klub tidak ada %d, pictures_logos.fmf %d byte' % (
            len(done), len(kept_official), len(missing_club), len(out)))
    return rep


if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:])
