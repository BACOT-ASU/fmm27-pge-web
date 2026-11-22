/**
 * Peta logo pictures_logos.fmf. Port dari legacy/app/fmmcore.js. Status: VERIFIED (B6, B7b).
 * config.xml di pictures_logos/logos/{normal,small}/{clubs,comps}/ berisi
 * <record from="custom/<ID>" to="graphics/pictures/<club|comp>/<ID>/<logo|icon>"/>.
 */
export const LOGO_BASE = 'pictures_logos/logos';
export type LogoKind = 'clubs' | 'comps';
export type LogoSize = 'normal' | 'small';
export const LOGO_PIXELS: Record<LogoSize, [number, number]> = { normal: [180, 180], small: [25, 18] };

export function logoSuffix(size: LogoSize): 'logo' | 'icon' {
  return size === 'normal' ? 'logo' : 'icon';
}

/** ID → nilai "from" (mis. "custom/2000700017"). */
export function parseLogoConfig(text: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /<record from="([^"]*)" to="graphics\/pictures\/(?:club|comp)\/(\d+)\/(?:icon|logo)"\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) map.set(m[2]!, m[1]!);
  return map;
}

/** Ganti/tambah peta untuk ID: hapus baris lama yang menuju ID itu, tambah baris custom/<ID> sebelum </list>. */
export function editLogoConfig(text: string, kind: LogoKind, ids: readonly string[], size: LogoSize): string {
  const t = kind === 'clubs' ? 'club' : 'comp';
  for (const id of ids) {
    const to = `graphics/pictures/${t}/${id}/${logoSuffix(size)}`;
    const esc = to.replace(/[/.]/g, (c) => `\\${c}`);
    text = text.replace(new RegExp(`[ \\t]*<record from="[^"]*" to="${esc}"\\/>\\r?\\n`, 'g'), '');
    const nl = text.includes('\r\n') ? '\r\n' : '\n';
    const line = `\t\t<record from="custom/${id}" to="${to}"/>${nl}`;
    const i = text.lastIndexOf('</list>');
    if (i < 0) throw new Error('config.xml logo tidak dikenali (tidak ada </list>)');
    const ls = text.lastIndexOf('\n', i) + 1;
    text = text.slice(0, ls) + line + text.slice(ls);
  }
  return text;
}

/** config.xml untuk folder Documents (logo). Status: LIKELY (dibuat editor logo lama; bukti uji belum dicatat). */
export function documentsLogoConfig(items: readonly { kind: LogoKind; id: string }[]): string {
  const lines: string[] = [];
  for (const it of items) {
    const t = it.kind === 'clubs' ? 'club' : 'comp';
    for (const sfx of ['logo', 'icon']) lines.push(`    <record from="${t}_${it.id}" to="graphics/pictures/${t}/${it.id}/${sfx}"/>`);
  }
  return `<?xml version='1.0' encoding='utf-8'?>\n<record>\n  <boolean id="preload" value="false"/>\n  <!--logo mappings-->\n  <list id="maps">\n${lines.join('\n')}\n  </list>\n</record>\n`;
}
