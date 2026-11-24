"""Kebangsaan staf dataset yang kolom `negara`-nya kosong (214 orang, sumber Wikipedia) — log 72.

Bug uji Bacad 24 Nov: staf asing (mis. Shin Sang-gyu, Kim Dong-ki di Persija) jadi berkebangsaan Indonesia karena
negara kosong → default IDN. Skrip ini membaca wikitext halaman klub di en.wikipedia.org dan mencari baris staf berbentuk
`{{flagicon|KOR}} [[Shin Sang-gyu]]` (atau `{{flag|...}}`). Hanya nama yang cocok persis (setelah normalisasi) dipakai.

Keluaran: data/staf_negara_wikipedia.csv (nama, klub, negara, judul_halaman). Cache: samples/staf_wiki_cache.json.
Pakai:  python3 scripts/fetch_staf_negara.py
"""
import csv
import json
import os
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {'User-Agent': 'fmm-mod-staff-fetch/1.0 (personal, low volume)'}
CACHE = os.path.join(REPO, 'samples', 'staf_wiki_cache.json')
TITLE = {'Bali United FC': 'Bali United F.C.', 'Borneo FC Samarinda': 'Borneo Samarinda F.C.', 'Dewa United Banten FC': 'Dewa United Banten F.C.',
         'Madura United FC': 'Madura United F.C.', 'Bhayangkara Presisi Lampung FC': 'Bhayangkara Presisi Lampung F.C.',
         'Arema FC': 'Arema F.C.', 'Semen Padang FC': 'Semen Padang F.C.', 'PS Barito Putera': 'PS Barito Putera',
         'Persik Kediri': 'Persik Kediri', 'Java United FC': 'Malut United F.C.', 'Garudayaksa FC': 'Garudayaksa F.C.',
         'Isenmulang Kalteng FC': 'Adhyaksa F.C.'}


def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z ]', ' ', s).split()


def wikitext(title):
    q = urllib.parse.urlencode({'action': 'parse', 'page': title, 'prop': 'wikitext', 'format': 'json', 'formatversion': '2', 'redirects': '1'})
    for a in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request('https://en.wikipedia.org/w/api.php?' + q, headers=UA), timeout=60) as r:
                d = json.loads(r.read())
            return d.get('parse', {}).get('wikitext', '')
        except Exception as e:  # noqa: BLE001
            print('  coba ulang %d %s: %s' % (a + 1, title, e), file=sys.stderr)
            time.sleep(20 * (a + 1))
    return None


def main():
    rows = list(csv.DictReader(open(os.path.join(REPO, 'data/staf_indonesia_v2.csv'), encoding='utf-8')))
    todo = [r for r in rows if not r['negara'].strip()]
    clubs = sorted({r['klub'] for r in todo})
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    for c in clubs:
        if c in cache and cache[c] is not None:
            continue
        cache[c] = wikitext(TITLE.get(c, c))
        json.dump(cache, open(CACHE, 'w'))
        time.sleep(5)
    flag = re.compile(r'\{\{\s*(?:flagicon|flag|fb|flagathlete)\s*\|\s*([A-Z]{3})[^}]*\}\}\s*(?:\[\[)?([^\]|\n}{]+)')
    out = []
    for r in todo:
        t = cache.get(r['klub']) or ''
        want = norm(r['nama'])
        hit = None
        for m in flag.finditer(t):
            if norm(m.group(2)) == want:
                hit = m.group(1); break
        if hit:
            out.append({'nama': r['nama'], 'klub': r['klub'], 'negara': hit, 'judul_halaman': TITLE.get(r['klub'], r['klub'])})
    with open(os.path.join(REPO, 'data/staf_negara_wikipedia.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['nama', 'klub', 'negara', 'judul_halaman']); w.writeheader(); w.writerows(out)
    print('staf tanpa negara %d, ketemu %d, halaman gagal %d' % (len(todo), len(out), sum(1 for c in clubs if not cache.get(c))))


if __name__ == '__main__':
    main()
