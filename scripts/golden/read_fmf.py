"""Baca arsip .fmf dengan fmfio.py dan cetak ringkasan JSON (dipakai golden test TS).

  python3 scripts/golden/read_fmf.py <file>
Keluaran: {"flag", "entries": [{"path","storedSize","rawSize","sha256"}]}
Catatan: fmfio.read hanya menerima TOC flag 0 berisi SATU frame.
"""
import hashlib, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import fmfio  # noqa: E402

blob = open(sys.argv[1], 'rb').read()
flag, root, _ = fmfio.read(blob)
rows = []
for path, row in fmfio.walk(root):
    stored = row[2] if flag == 0 else row[5]
    rows.append({'path': path, 'storedSize': len(stored), 'rawSize': row[6],
                 'sha256': hashlib.sha256(fmfio.get(row)).hexdigest()})
print(json.dumps({'flag': flag, 'entries': rows}, ensure_ascii=False))
