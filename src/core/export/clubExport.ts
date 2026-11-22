import { patchFmf, findEntry, type FmfArchive, type FmfOutput } from '../fmf';
import type { ClubChange } from '../edit/clubEditSession';
import { CLUB_STATUS } from '../formats/club/clubDat';
import { makeZip } from '../zip/zip';

export const DB_FOLDER = 'db_archive_2706';

/**
 * config.xml untuk folder Documents/db_archive_2706/ (TERBUKTI 16 Nov 2026, lihat
 * Project claude/cara-pasang-database-editan-fmm27-terbukti.md): from = nama file di sebelah
 * config, to = nama internal game. Hanya file yang ada di folder yang dipetakan.
 */
export function documentsConfigXml(entryNames: readonly string[]): string {
  const lines = entryNames.map((n) => `    <record from="${n}" to="${DB_FOLDER}/${n}"/>`);
  return `<?xml version='1.0' encoding='utf-8'?>\n<record>\n  <boolean id="preload" value="false"/>\n  <!--logo mappings-->\n  <list id="maps">\n${lines.join('\n')}\n  </list>\n</record>\n`;
}

const FIELD_LABEL: Record<string, string> = {
  nation: 'negara liga',
  basedNation: 'negara asal',
  status: 'status',
  trainingFacilities: 'fasilitas latihan',
  youthFacilities: 'fasilitas akademi',
  attendanceAvg: 'penonton rata-rata (×10)',
  attendanceMin: 'penonton minimum (×10)',
  attendanceMax: 'penonton maksimum (×10)',
  division: 'divisi',
  division2: 'divisi kedua',
  stadium: 'stadion',
  lastDivision: 'divisi musim lalu',
  reputation: 'reputasi',
};

function show(field: string, v: number): string {
  return field === 'status' ? `${v} (${CLUB_STATUS[v] ?? '?'})` : String(v);
}

export interface ReportContext {
  sourceName: string;
  sourceSize: number;
  sourceSha256?: string;
  createdAt: Date;
  appVersion?: string;
}

export function changeReportText(changes: readonly ClubChange[], ctx: ReportContext): string {
  const clubs = new Set(changes.map((c) => c.index)).size;
  const lines = [
    'LAPORAN PERUBAHAN — FMM27 Pre-Game Editor',
    `Dibuat      : ${ctx.createdAt.toISOString()}`,
    `File sumber : ${ctx.sourceName} (${ctx.sourceSize} byte)${ctx.sourceSha256 ? `\nSHA-256     : ${ctx.sourceSha256}` : ''}`,
    `Perubahan   : ${changes.length} field di ${clubs} klub (club.dat)`,
    '',
    'PENTING',
    '- Perubahan database terlihat di KARIER BARU.',
    '- Kalau dimasukkan ke APK: pakai Level "Store" (tanpa kompresi), lalu sign ulang.',
    '- Jalur Documents: kalau daftar negara jadi kosong, HAPUS DATA aplikasi (bukan cache). Cadangkan save dulu.',
    '',
    'RINCIAN (index | UID | klub | field: lama -> baru)',
    ...changes.map((c) => `${c.index} | ${c.uid} | ${c.name} | ${FIELD_LABEL[c.field] ?? c.field}: ${show(c.field, c.from)} -> ${show(c.field, c.to)}`),
    '',
  ];
  return lines.join('\n');
}

const te = new TextEncoder();

/** Zip untuk folder Documents: db_archive_2706/club.dat + config.xml + laporan di luar folder. */
export function buildDocumentsZip(clubDat: Uint8Array, report: string): Uint8Array {
  return makeZip([
    { name: `${DB_FOLDER}/club.dat`, data: clubDat },
    { name: `${DB_FOLDER}/config.xml`, data: te.encode(documentsConfigXml(['club'])) },
    { name: 'LAPORAN_PERUBAHAN.txt', data: te.encode(report) },
  ]);
}

/** db_archive_2706.fmf baru: club.dat diganti lewat tambal di ujung. */
export function buildPatchedDbArchive(arc: FmfArchive, clubDat: Uint8Array): FmfOutput {
  const hit = findEntry(arc.root, 'club.dat');
  if (!hit) throw new Error('club.dat tidak ada di arsip');
  const folder = hit.path.slice(0, hit.path.lastIndexOf('/'));
  return patchFmf(arc, [{ folder, name: hit.entry.name, ext: hit.entry.ext, data: clubDat }]);
}

/**
 * Zip Documents untuk banyak file db sekaligus. from = nama file tanpa ekstensi (pola club → club.dat,
 * TERBUKTI untuk club). Untuk file lain pola yang sama dipakai (LIKELY); .lng belum pernah diuji lewat Documents.
 */
export function buildDbDocumentsZip(entries: readonly { name: string; ext: string; data: Uint8Array }[], report: string): Uint8Array {
  return makeZip([
    ...entries.map((e) => ({ name: `${DB_FOLDER}/${e.name}${e.ext}`, data: e.data })),
    { name: `${DB_FOLDER}/config.xml`, data: te.encode(documentsConfigXml(entries.map((e) => e.name))) },
    { name: 'LAPORAN_PERUBAHAN.txt', data: te.encode(report) },
  ]);
}

export function workspaceReportText(lines: readonly { file: string; what: string; from?: string; to?: string }[], ctx: { sources: string[]; createdAt: Date }): string {
  return [
    'LAPORAN PERUBAHAN — FMM27 Pre-Game Editor',
    `Dibuat      : ${ctx.createdAt.toISOString()}`,
    `File sumber : ${ctx.sources.join(', ')}`,
    `Perubahan   : ${lines.length}`,
    '',
    'PENTING',
    '- Perubahan database dan aturan terlihat di KARIER BARU.',
    '- Kalau dimasukkan ke APK: pakai Level "Store" (tanpa kompresi), lalu sign ulang.',
    '- Jalur Documents: kalau daftar negara jadi kosong, HAPUS DATA aplikasi (bukan cache). Cadangkan save dulu.',
    '- Stadion/klub baru harus terdaftar di sicomps 2700/fmm_*.dat (IDN-0/1/2) supaya ikut dimuat.',
    '',
    'RINCIAN',
    ...lines.map((l) => `[${l.file}] ${l.what}${l.from !== undefined || l.to !== undefined ? `: ${l.from ?? ''} -> ${l.to ?? ''}` : ''}`),
    '',
  ].join('\n');
}
