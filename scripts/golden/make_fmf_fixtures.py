"""Buat arsip .fmf SINTETIS (bukan data game) dengan fmfio.py sebagai acuan.

Hasil:
  tests/fixtures/fmf/synthetic_flag0.fmf.bin   (isi mentah, TOC zstd level 19)
  tests/fixtures/fmf/synthetic_flag3.fmf.bin   (tiap entri frame zstd)
  tests/fixtures/fmf/expected.json             (jalur, ukuran, offset, waktu, SHA-256 isi)

Jalankan:  python3 scripts/golden/make_fmf_fixtures.py   (butuh: pip install zstandard)
Deterministik: isi dan waktu tetap, jadi hasilnya selalu sama.
"""
import hashlib, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import fmfio  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'tests', 'fixtures', 'fmf')
T1, T2 = 1_763_800_000, 1_763_800_001


def payload(seed: int, n: int) -> bytes:
    # pola semu-acak yang bisa dikompresi sebagian
    x = seed & 0xFFFFFFFF
    out = bytearray()
    for i in range(n):
        x = (x * 1103515245 + 12345) & 0x7FFFFFFF
        out.append((x >> 16) & 0x3F if i % 7 else 0x41 + (i // 7) % 26)
    return bytes(out)


def build(flag: int):
    root = fmfio.Folder(b'synthetic')
    root.files.append([b'readme', b'.txt', 'Arsip sintetis untuk tes. Bukan data game.\n'.encode(), T1, T2])
    root.files.append([b'kosong', b'.bin', b'', T1, T2])
    data = fmfio.Folder(b'data')
    data.files.append([b'club', b'.dat', payload(1, 5000), T1, T2])
    data.files.append([b'besar', b'.dat', payload(2, 140_000), T1, T2])  # > 128 KiB
    data.files.append(['nama_unicode_é'.encode(), b'.lng', 'Gresik United — Persija'.encode(), T1, T2])
    sub = fmfio.Folder(b'sub')
    sub.files.append([b'a', b'.xml', b'<record/>', T1, T2])
    data.subs.append(sub)
    root.subs.append(data)
    root.subs.append(fmfio.Folder(b'folder_kosong'))
    out, _toc = fmfio.write(flag, root)
    return out


def describe(blob: bytes):
    flag, root, _ = fmfio.read(blob)
    rows = []
    for path, row in fmfio.walk(root):
        content = fmfio.get(row)
        stored = row[2] if flag == 0 else row[5]
        rows.append({'path': path, 'offset': row[7], 'storedSize': len(stored), 'rawSize': row[6],
                     'time1': row[3], 'time2': row[4], 'sha256': hashlib.sha256(content).hexdigest()})
    return flag, rows


def main():
    os.makedirs(OUT, exist_ok=True)
    expected = {}
    for flag in (0, 3):
        blob = build(flag)
        # fmfio sendiri harus round-trip identik
        f2, root2, _ = fmfio.read(blob)
        again, _ = fmfio.write(f2, root2)
        assert again == blob, 'fmfio tidak round-trip identik'
        name = f'synthetic_flag{flag}.fmf.bin'
        open(os.path.join(OUT, name), 'wb').write(blob)
        fl, rows = describe(blob)
        expected[name] = {'flag': fl, 'size': len(blob), 'sha256': hashlib.sha256(blob).hexdigest(), 'entries': rows}
        print(name, len(blob), 'byte,', len(rows), 'entri')
    with open(os.path.join(OUT, 'expected.json'), 'w', encoding='utf-8') as fh:
        json.dump(expected, fh, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    main()
