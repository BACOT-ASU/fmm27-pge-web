/** Pembaca berurutan little-endian dengan pesan galat yang menyebut posisi. */
const td = new TextDecoder('utf-8', { fatal: false });

export class FormatError extends Error {
  constructor(
    message: string,
    readonly offset: number,
  ) {
    super(`${message} (posisi ${offset})`);
    this.name = 'FormatError';
  }
}

export class Cursor {
  readonly dv: DataView;
  p: number;

  constructor(
    readonly b: Uint8Array,
    start = 0,
  ) {
    this.dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    this.p = start;
  }

  need(n: number): void {
    if (this.p + n > this.b.length) throw new FormatError(`Data terpotong: butuh ${n} byte`, this.p);
  }
  skip(n: number): void {
    this.need(n);
    this.p += n;
  }
  u8(): number {
    this.need(1);
    return this.b[this.p++]!;
  }
  u16(): number {
    this.need(2);
    const v = this.dv.getUint16(this.p, true);
    this.p += 2;
    return v;
  }
  i16(): number {
    this.need(2);
    const v = this.dv.getInt16(this.p, true);
    this.p += 2;
    return v;
  }
  u32(): number {
    this.need(4);
    const v = this.dv.getUint32(this.p, true);
    this.p += 4;
    return v;
  }
  i32(): number {
    this.need(4);
    const v = this.dv.getInt32(this.p, true);
    this.p += 4;
    return v;
  }
  bytes(n: number): Uint8Array {
    this.need(n);
    const v = this.b.subarray(this.p, this.p + n);
    this.p += n;
    return v;
  }
  /** Teks: u32 panjang + UTF-8. maxLen untuk mendeteksi salah baca. */
  str(maxLen = Number.MAX_SAFE_INTEGER): string {
    const at = this.p;
    const l = this.u32();
    if (l > maxLen) throw new FormatError(`Panjang teks ${l} melebihi batas ${maxLen}`, at);
    return td.decode(this.bytes(l));
  }
}

const te = new TextEncoder();

/** Penulis sederhana: kumpulkan potongan lalu gabungkan. */
export class Writer {
  private parts: Uint8Array[] = [];
  private len = 0;

  push(b: Uint8Array): this {
    this.parts.push(b);
    this.len += b.length;
    return this;
  }
  u8(v: number): this {
    return this.push(new Uint8Array([v & 0xff]));
  }
  u32(v: number): this {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, v, true);
    return this.push(b);
  }
  str(v: string): this {
    const b = te.encode(v);
    this.u32(b.length);
    return this.push(b);
  }
  get length(): number {
    return this.len;
  }
  finish(): Uint8Array {
    const out = new Uint8Array(this.len);
    let q = 0;
    for (const p of this.parts) {
      out.set(p, q);
      q += p.length;
    }
    return out;
  }
}
