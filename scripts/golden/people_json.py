"""Golden untuk tes TS people.dat dkk: ringkasan per record dari scripts/people.py (folder db)."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import people  # noqa: E402

f = sys.argv[1].rstrip('/') + '/'
_, recs, _ = people.parse_people(open(f + 'people.dat', 'rb').read())
_, pl = people.split_fixed(open(f + 'players.dat', 'rb').read(), 82, 'players')
step = max(1, len(recs) // 2000)
out = {'n': len(recs), 'sample': []}
for i in range(0, len(recs), step):
    r = recs[i]
    s = {'i': i, 'uid': r['uid'], 'club': r['club_index'], 'player': r['player_index'], 'np': r['non_player_index'],
         'nation': r['nation'], 'dob': [r['dob_day'], r['dob_year']], 'pers': list(r['personality'])}
    if r['player_index'] >= 0:
        pf = people.player_fields(pl[r['player_index']])
        s['ca'] = pf['ca']; s['pa'] = pf['pa']; s['crossing'] = pf['crossing']; s['pace'] = pf['pace']
    out['sample'].append(s)
print(json.dumps(out))
