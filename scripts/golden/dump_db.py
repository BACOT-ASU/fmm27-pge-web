"""Ringkasan competition.dat + club.dat dari db_archive_2706.fmf asli, dibaca dengan
scripts/comp.py dan scripts/club.py (acuan). Dipakai tests/samples.test.ts.

  python3 scripts/golden/dump_db.py <db_archive_2706.fmf>
"""
import json, os, struct, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import fmfio, comp, club  # noqa: E402

blob = open(sys.argv[1], 'rb').read()
flag, root, _ = fmfio.read(blob)
rows = {p.rsplit('/', 1)[-1]: r for p, r in fmfio.walk(root)}
tmpd = tempfile.mkdtemp()
def tmp(n):
    p = os.path.join(tmpd, n); open(p, 'wb').write(fmfio.get(rows[n])); return p, fmfio.get(rows[n])
cp, cb = tmp('competition.dat')
kp, kb = tmp('club.dat')
C, ce, cl = comp.parse(cp)
K, ke, kl = club.parse(kp, verbose=False)
out = {
    'competitionEnd': ce == cl, 'clubEnd': ke == kl,
    'competitions': [[c['idx'], c['uid'], c['long'], c['short'], c['lvl'], c['nat'], c['rep'], c['b11'], c['h12'], len(c['ent'])] for c in C],
    'clubs': [[r['uid'], r['long'], r['nat'], r['div'], r['rep'], r['flag'], len(r['squad']), r['len'],
               struct.unpack_from('<B', kb, r['o_misc'])[0],
               struct.unpack_from('<H', kb, r['o_div'] + 10 + (68 if r['flag'] else 0) + 4 + r['k'] + 1)[0]] for r in K],
}
print(json.dumps(out, ensure_ascii=False))
