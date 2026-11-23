"""Tambal libgame.so 27.1.0 (52.515.648 byte) supaya Indonesia bisa dimainkan. Pola sama dengan B2c (27.0).

Alamat = offset file (research/format_specs/libgame_tables.md, bagian 27.1.0):
  0x647832  u16 negara playable   175 (Wales) -> 58 (Indonesia)       tabel 28 x u16 di 0x647800
  0x7cf650  u32 liga terdalam     29236871 (Cymru North/South) -> 41042746 (Liga Nusantara)   tabel di 0x7cf618..0x7cf688
Nilai lama dicek dulu; kalau tidak cocok skrip berhenti (file bukan 27.1.0 ori). HYPOTHESIS sampai diuji di game.

Pakai:  python3 scripts/patch_libgame_v2710.py <libgame.so ori> <keluar.so>
"""
import hashlib
import struct
import sys

ORI_SHA256 = '5a1eb90a97fdeb61537717355efdd4b072a662e0596d1999638cef4f9544a221'
PATCHES = [(0x647832, '<H', 175, 58), (0x7cf650, '<I', 29236871, 41042746)]


def patch(src, dst):
    d = bytearray(open(src, 'rb').read())
    if hashlib.sha256(d).hexdigest() != ORI_SHA256:
        raise SystemExit('libgame.so bukan 27.1.0 ori (hash beda)')
    for off, fmt, old, new in PATCHES:
        cur = struct.unpack_from(fmt, d, off)[0]
        if cur != old:
            raise SystemExit('0x%x: nilai %d, seharusnya %d' % (off, cur, old))
        struct.pack_into(fmt, d, off, new)
    assert struct.unpack_from('<I', d, 0x7cf688)[0] == 0xFFFFFFFF
    open(dst, 'wb').write(d)
    print('libgame.so ditambal (%d alamat), sha256 %s' % (len(PATCHES), hashlib.sha256(d).hexdigest()))


if __name__ == '__main__':
    patch(sys.argv[1], sys.argv[2])
