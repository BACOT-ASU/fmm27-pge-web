/**
 * Ubah gambar jadi PNG ukuran tetap (logo 180×180 dan 25×18), proporsional, di tengah, latar transparan.
 * Mengikuti editor logo lama (legacy/app/ui.html: fit()).
 */
async function loadBitmap(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

export async function fitPng(bmp: ImageBitmap, w: number, h: number): Promise<Uint8Array> {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  if (!x) throw new Error('Canvas tidak tersedia');
  const s = Math.min(w / bmp.width, h / bmp.height);
  const dw = Math.max(1, Math.round(bmp.width * s));
  const dh = Math.max(1, Math.round(bmp.height * s));
  x.imageSmoothingQuality = 'high';
  x.drawImage(bmp, Math.round((w - dw) / 2), Math.round((h - dh) / 2), dw, dh);
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
  if (!blob) throw new Error('Gagal membuat PNG');
  return new Uint8Array(await blob.arrayBuffer());
}

export async function makeLogoPngs(file: Blob): Promise<{ normal: Uint8Array; small: Uint8Array }> {
  const bmp = await loadBitmap(file);
  const [normal, small] = await Promise.all([fitPng(bmp, 180, 180), fitPng(bmp, 25, 18)]);
  bmp.close();
  return { normal, small };
}

export function pngUrl(bytes: Uint8Array): string {
  return URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/png' }));
}
