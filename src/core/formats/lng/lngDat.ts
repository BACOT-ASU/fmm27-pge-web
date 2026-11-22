import { Cursor, FormatError, Writer } from '../../binary/cursor';

/**
 * File nama klub per bahasa (*.lng, 16 file). Acuan: scripts/build_b4_db.py, build_b6_db.py.
 * Status: VERIFIED (klub baru tampil di game). Header 8 + u32 jumlah (= jumlah klub di club.dat).
 * Entri: u32 UID klub, nama panjang (u32+teks+1 byte), nama pendek (u32+teks+1 byte), nama 6 huruf,
 * kode 4 huruf (u32+teks). Sisa byte setelah entri terakhir disimpan apa adanya.
 */
export interface LngEntry {
  uid: number;
  longName: string;
  gap1: number;
  shortName: string;
  gap2: number;
  name6: string;
  code4: string;
}

export interface LngDat {
  header: Uint8Array;
  entries: LngEntry[];
  tail: Uint8Array;
}

export function parseLngDat(bytes: Uint8Array): LngDat {
  const c = new Cursor(bytes);
  const header = c.bytes(8).slice();
  const n = c.u32();
  const entries: LngEntry[] = [];
  for (let i = 0; i < n; i++) {
    const uid = c.u32();
    const longName = c.str(400);
    const gap1 = c.u8();
    const shortName = c.str(400);
    const gap2 = c.u8();
    const name6 = c.str(400);
    const code4 = c.str(400);
    entries.push({ uid, longName, gap1, shortName, gap2, name6, code4 });
  }
  const tail = bytes.slice(c.p);
  if (n > 0 && entries.length !== n) throw new FormatError('jumlah entri .lng tidak cocok', c.p);
  return { header, entries, tail };
}

export function serializeLngDat(m: LngDat): Uint8Array {
  const w = new Writer().push(m.header).u32(m.entries.length);
  for (const e of m.entries) w.u32(e.uid).str(e.longName).u8(e.gap1).str(e.shortName).u8(e.gap2).str(e.name6).str(e.code4);
  return w.push(m.tail).finish();
}
