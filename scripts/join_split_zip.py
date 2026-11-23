"""Gabungkan zip terbagi (nama.z01, nama.z02, ..., nama.zip; dibuat Bacad dengan MT Manager) lalu keluarkan isinya.

`zip -s 0` gagal untuk arsip ini (CRC salah / "overlapped components"), jadi skrip ini
menyambung semua bagian mentah, membaca setiap local header berurutan, dan mengambil datanya
(stored atau deflate). CRC32 setiap file dicek; galat kalau tidak cocok.

Pakai:
  python3 scripts/join_split_zip.py <folder_keluar> <bagian1> <bagian2> ... <bagian_terakhir.zip>
Urutan bagian: .z01, .z02, ..., lalu .zip (skrip mengurutkan sendiri menurut akhiran).
"""
import os
import re
import struct
import sys
import zlib


def part_order(path):
    m = re.search(r'\.z(\d+)$', path, re.I)
    return int(m.group(1)) if m else 10 ** 6   # .zip paling akhir


def join_and_extract(out_dir, parts):
    parts = sorted(parts, key=part_order)
    d = b''.join(open(p, 'rb').read() for p in parts)
    p = 4 if d[:4] == b'PK\x07\x08' else 0     # penanda arsip terbagi
    os.makedirs(out_dir, exist_ok=True)
    done = []
    while d[p:p + 4] == b'PK\x03\x04':
        _sig, _ver, flag, meth, _t, _dt, crc, cs, us, nl, el = struct.unpack_from('<IHHHHHIIIHH', d, p)
        name = d[p + 30:p + 30 + nl].decode('utf-8', 'replace')
        st = p + 30 + nl + el
        if flag & 8:
            raise SystemExit('%s: data descriptor (flag 8) belum didukung' % name)
        if meth == 0:
            data = d[st:st + cs]
        elif meth == 8:
            data = zlib.decompress(d[st:st + cs], -15)
        else:
            raise SystemExit('%s: metode kompresi %d belum didukung' % (name, meth))
        if zlib.crc32(data) != crc or len(data) != us:
            raise SystemExit('%s: CRC/ukuran tidak cocok (bagian rusak?)' % name)
        target = os.path.join(out_dir, os.path.basename(name))
        open(target, 'wb').write(data)
        done.append((target, len(data)))
        p = st + cs
    if not done:
        raise SystemExit('tidak ada file di dalam arsip')
    return done


if __name__ == '__main__':
    for path, n in join_and_extract(sys.argv[1], sys.argv[2:]):
        print('%s  %d byte  CRC OK' % (path, n))
