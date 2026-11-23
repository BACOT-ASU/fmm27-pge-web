"""Unduh logo (lambang federasi) semua timnas dari Wikipedia bahasa Inggris untuk pictures_logos (keputusan Bacad, log 63).

Modder tidak punya logo timnas (config logo modder tanpa timnas, log 57/58). Timnas = klub di club.dat dengan nama = nama
negara (pria & wanita, mis. Indonesia UID 113 dan 2000169491); logo yang sama dipakai untuk keduanya.

Langkah:
  1. Daftar timnas dari club.dat + nation.dat build kita.
  2. Wikitext halaman "<Negara> national football team" (judul khusus di SPECIAL) → isian infobox `Badge`.
  3. Berkas itu → thumbnail PNG 360 px (API imageinfo), lalu diunduh dari upload.wikimedia.org.
  4. Simpan <UID>_<Negara>.png untuk setiap UID timnas negara itu di folder keluar (samples/, tidak di-commit).
Jeda antar permintaan + coba ulang saat 429 (batas Wikipedia). Cache JSON di folder keluar supaya bisa dilanjutkan.

Pakai:  python3 scripts/fetch_logo_timnas.py <folder db build> <folder keluar>
Lalu:   python3 scripts/build_v2710_logos.py <pictures_logos ori> <folder db> <keluar.fmf> <folder keluar>
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import club as clubmod  # noqa: E402

UA = {'User-Agent': 'fmm-mod-logo-fetch/1.0 (personal, low volume)'}
SPECIAL = {
    'United States': "United States men's national soccer team", 'Australia': "Australia men's national soccer team",
    'Canada': "Canada men's national soccer team", 'New Zealand': "New Zealand men's national football team",
    'Ireland': 'Republic of Ireland national football team', 'Burma': 'Myanmar national football team',
    'Chinese Taipei (China PR)': 'Chinese Taipei national football team', 'Hong Kong (China PR)': 'Hong Kong national football team',
    'Macau (China PR)': 'Macau national football team', 'Czechia': 'Czech Republic national football team',
    'Micronesia': 'Federated States of Micronesia national football team',
}
BADGE = re.compile(r'\|\s*(?:Badge|badge|Logo|logo)\s*=\s*(?:\[\[(?:File|Image):)?([^\n|\]]+\.(?:svg|png|jpg|jpeg|gif))', re.I)


def nation_names(nation_dat):
    d = open(nation_dat, 'rb').read()
    out = set()
    for m in re.finditer(rb'([\x01-\x40])\x00\x00\x00([A-Za-z][^\x00-\x1f\xff]{1,40})\xff', d):
        if len(m.group(2)) == m.group(1)[0]:
            out.add(m.group(2).decode('utf-8', 'replace'))
    return out


def get(url, binary=False):
    for a in range(8):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                b = r.read()
            return b if binary else json.loads(b)
        except Exception as e:  # noqa: BLE001
            print('  coba ulang %d: %s' % (a + 1, e), file=sys.stderr)
            time.sleep(15 * (a + 1))
    raise RuntimeError('gagal: ' + url)


def api(params):
    return get('https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode(dict(params, format='json', formatversion='2')))


def main(dbdir, out):
    os.makedirs(out, exist_ok=True)
    cache_p = os.path.join(out, 'cache.json')
    cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
    names = nation_names(os.path.join(dbdir, 'nation.dat'))
    clubs, _, _ = clubmod.parse(os.path.join(dbdir, 'club.dat'), verbose=False)
    teams = {}
    for c in clubs:
        if c['long'] in names:
            teams.setdefault(c['long'], []).append(c['uid'])
    todo = sorted(n for n in teams if 'badge' not in cache.get(n, {}))
    for i in range(0, len(todo), 10):
        chunk = todo[i:i + 10]
        tl = [SPECIAL.get(n, '%s national football team' % n) for n in chunk]
        r = api({'action': 'query', 'titles': '|'.join(tl), 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main', 'redirects': '1'})
        norm = {x['from']: x['to'] for x in r['query'].get('normalized', [])}
        red = {x['from']: x['to'] for x in r['query'].get('redirects', [])}
        pages = {p['title']: p for p in r['query']['pages']}
        for n, t in zip(chunk, tl):
            t2 = norm.get(t, t); t3 = red.get(t2, t2); p = pages.get(t3, {})
            txt = p['revisions'][0]['slots']['main']['content'] if p.get('revisions') else ''
            m = BADGE.search(txt)
            cache[n] = {'title': t3, 'badge': m.group(1).strip() if m else None}
        json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=0)
        time.sleep(4)
    files = sorted({v['badge'] for v in cache.values() if v.get('badge') and 'thumb' not in v})
    thumbs = {}
    for i in range(0, len(files), 40):
        chunk = files[i:i + 40]
        r = api({'action': 'query', 'titles': '|'.join('File:' + f for f in chunk), 'prop': 'imageinfo', 'iiprop': 'url', 'iiurlwidth': '360'})
        norm = {x['to']: x['from'] for x in r['query'].get('normalized', [])}
        for p in r['query']['pages']:
            ii = p.get('imageinfo')
            if ii:
                thumbs[norm.get(p['title'], p['title'])[5:]] = ii[0].get('thumburl') or ii[0]['url']
        time.sleep(4)
    for n, v in cache.items():
        if v.get('badge') and v['badge'] in thumbs:
            v['thumb'] = thumbs[v['badge']]
    json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=0)
    ok, miss = 0, []
    for n in sorted(teams):
        v = cache.get(n, {})
        if not v.get('thumb'):
            miss.append(n); continue
        safe = re.sub(r'[^A-Za-z0-9]+', '_', n).strip('_')
        paths = [os.path.join(out, '%d_%s.png' % (u, safe)) for u in teams[n]]
        if all(os.path.exists(p) for p in paths):
            ok += 1; continue
        try:
            png = get(v['thumb'], binary=True)
        except RuntimeError:
            miss.append(n + ' (unduh gagal, jalankan ulang)'); continue
        for p in paths:
            open(p, 'wb').write(png)
        ok += 1
        time.sleep(3)
    json.dump({'ada_logo': ok, 'tanpa_logo': miss}, open(os.path.join(out, 'laporan.json'), 'w'), ensure_ascii=False, indent=1)
    print('timnas %d, logo %d, tanpa logo %d: %s' % (len(teams), ok, len(miss), ', '.join(miss)))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
