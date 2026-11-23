import { findEntry, listEntries, openFmfBytes, patchFmf, readEntry, splitInnerArchive, type FmfArchive, type FmfChange, type FmfOutput, materializeOutput } from '../fmf';
import { concatBytes } from '../binary/le';
import { cloneClubRecord, parseClubDat, serializeClubDat, withClubField, withClubNames, type ClubDat, type ClubFixedField, type ClubRecord } from '../formats/club/clubDat';
import { parseCompetitionDat, serializeCompetitionDat, withCompetitionField, withCompetitionNames, type CompetitionDat } from '../formats/competition/competitionDat';
import { appendStadium, parseStadiumDat, serializeStadiumDat, withStadium, type StadiumDat, type StadiumFields } from '../formats/stadium/stadiumDat';
import { appendRivalry, parseRivalryDat, serializeRivalryDat, withRivalry, type RivalryDat } from '../formats/rivalry/rivalryDat';
import { parseLngDat, serializeLngDat, type LngDat } from '../formats/lng/lngDat';
import { parseNationNames, withYouthRating, youthRatingOffset, type NationName } from '../formats/nation/nationNames';
import { addUids, parseUidList, removeUids, serializeUidList, type FmmListName, type UidList } from '../formats/fmmlists/fmmLists';
import { buildDbcEntry, bumpCompsTxt, parseDbcEntry, setAt, type DbcEntry, type DbcPath, type DbcValue } from '../formats/dbc/dbc';
import { editLogoConfig, LOGO_BASE, parseLogoConfig, type LogoKind, type LogoSize } from '../formats/logos/logoConfig';
import { History } from './history';

const td = new TextDecoder('utf-8', { fatal: false });
const te = new TextEncoder();

export const K = {
  club: 'db:club.dat',
  competition: 'db:competition.dat',
  stadium: 'db:stadium.dat',
  rivalries: 'db:rivalries.dat',
  nation: 'db:nation.dat',
  lng: 'db:lng',
  dbc: 'sc:dbc',
  logos: 'logo:items',
  list: (n: FmmListName) => `sc:list:${n}`,
} as const;

export interface LogoItem {
  kind: LogoKind;
  id: string;
  label: string;
  normal: Uint8Array;
  small: Uint8Array;
}

export interface ChangeLine {
  file: string;
  what: string;
  from?: string;
  to?: string;
}

/**
 * Ruang kerja editor: memegang arsip sumber (db, sicomps, logo) dan semua model yang diedit,
 * dengan urung/ulang gabungan (History). Model dimuat sesuai kebutuhan.
 */
export class Workspace {
  readonly h = new History();
  db?: FmfArchive;
  sicomps?: FmfArchive;
  logos?: FmfArchive;
  nations: NationName[] = [];
  private dbcInner?: { prefix: Uint8Array; arc: FmfArchive };
  private listInner = new Map<FmmListName, { prefix: Uint8Array; arc: FmfArchive; entryPath: string }>();
  private logoConfigs = new Map<string, string>();

  // ---------- memuat ----------
  private async dbEntry(name: string): Promise<Uint8Array> {
    if (!this.db) throw new Error('db_archive belum dibuka');
    const hit = findEntry(this.db.root, name);
    if (!hit) throw new Error(`${name} tidak ada di db_archive`);
    return readEntry(this.db, hit.entry);
  }

  async attachDb(arc: FmfArchive): Promise<void> {
    this.db = arc;
    const [club, comp, stad, riv, nat] = await Promise.all(['club.dat', 'competition.dat', 'stadium.dat', 'rivalries.dat', 'nation.dat'].map((n) => this.dbEntry(n)));
    this.h.register(K.club, parseClubDat(club!));
    this.h.register(K.competition, parseCompetitionDat(comp!));
    this.h.register(K.stadium, parseStadiumDat(stad!));
    this.h.register(K.rivalries, parseRivalryDat(riv!));
    this.h.register(K.nation, nat!);
    this.nations = parseNationNames(nat!);
  }

  /** Muat 16 file .lng (dibutuhkan untuk klon klub). */
  async loadLng(): Promise<void> {
    if (this.h.has(K.lng) || !this.db) return;
    const m = new Map<string, LngDat>();
    for (const { path, entry } of listEntries(this.db.root)) {
      if (entry.ext !== '.lng') continue;
      m.set(path, parseLngDat(await readEntry(this.db, entry)));
    }
    this.h.register(K.lng, m);
  }

  async attachSicomps(arc: FmfArchive): Promise<void> {
    this.sicomps = arc;
    const hit = findEntry(arc.root, 'comps.dbc');
    if (hit) {
      const parts = splitInnerArchive(await readEntry(arc, hit.entry));
      this.dbcInner = { prefix: parts.prefix.slice(), arc: await openFmfBytes(parts.archive.slice()) };
    }
    this.h.register(K.dbc, new Map<string, DbcEntry>());
  }

  /** Daftar entri (mis. IDN-0) di satu daftar muat. */
  async loadList(name: FmmListName): Promise<Map<string, UidList>> {
    if (this.h.has(K.list(name))) return this.h.get(K.list(name));
    if (!this.sicomps) throw new Error('sicomps.fmf belum dibuka');
    const hit = findEntry(this.sicomps.root, `${name}.dat`);
    if (!hit) throw new Error(`${name}.dat tidak ada di sicomps`);
    const parts = splitInnerArchive(await readEntry(this.sicomps, hit.entry));
    const arc = await openFmfBytes(parts.archive.slice());
    this.listInner.set(name, { prefix: parts.prefix.slice(), arc, entryPath: hit.path });
    const m = new Map<string, UidList>();
    for (const { entry } of listEntries(arc.root)) m.set(entry.name, parseUidList(await readEntry(arc, entry)));
    this.h.register(K.list(name), m);
    return m;
  }

  dbcEntryNames(): string[] {
    return this.dbcInner ? listEntries(this.dbcInner.arc.root).map((e) => e.entry.name + e.entry.ext) : [];
  }

  async dbcEntry(name: string): Promise<DbcEntry> {
    const edited = this.h.get<Map<string, DbcEntry>>(K.dbc).get(name);
    if (edited) return edited;
    if (!this.dbcInner) throw new Error('comps.dbc belum dimuat');
    const hit = findEntry(this.dbcInner.arc.root, name);
    if (!hit) throw new Error(`${name} tidak ada di comps.dbc`);
    return parseDbcEntry(await readEntry(this.dbcInner.arc, hit.entry));
  }

  async attachLogos(arc: FmfArchive): Promise<void> {
    this.logos = arc;
    for (const key of ['normal/clubs', 'small/clubs', 'normal/comps', 'small/comps']) {
      const hit = findEntry(arc.root, `${LOGO_BASE}/${key}/config.xml`);
      if (hit) this.logoConfigs.set(key, td.decode(await readEntry(arc, hit.entry)));
    }
    this.h.register(K.logos, [] as LogoItem[]);
  }

  hasLogo(kind: LogoKind, id: string): boolean {
    return parseLogoConfig(this.logoConfigs.get(`normal/${kind}`) ?? '').has(id);
  }

  // ---------- akses ----------
  get clubs(): ClubDat { return this.h.get(K.club); }
  get competitions(): CompetitionDat { return this.h.get(K.competition); }
  get stadiums(): StadiumDat { return this.h.get(K.stadium); }
  get rivalries(): RivalryDat { return this.h.get(K.rivalries); }
  get nationBytes(): Uint8Array { return this.h.get(K.nation); }

  // ---------- edit: klub ----------
  setClub(index: number, values: Partial<Record<ClubFixedField, number>>, names?: Partial<Pick<ClubRecord, 'longName' | 'shortName' | 'name6' | 'code4' | 'code3'>>): void {
    const dat = this.clubs;
    let r = dat.records[index]!;
    if (names && Object.values(names).some((v) => v !== undefined)) r = withClubNames(r, names);
    for (const [f, v] of Object.entries(values) as [ClubFixedField, number][]) if (v !== undefined && r[f] !== v) r = withClubField(r, f, v);
    if (r === dat.records[index]) return;
    const records = dat.records.slice();
    records[index] = r;
    const updates: [string, unknown][] = [[K.club, { ...dat, records }]];
    if (names && this.h.has(K.lng)) updates.push([K.lng, this.renameInLng(r.uid, names)]);
    this.h.apply(`Klub ${r.longName}`, updates);
  }

  batchClubs(indices: readonly number[], field: ClubFixedField, value: number, mode: 'set' | 'min' | 'max' = 'set'): number {
    const dat = this.clubs;
    const records = dat.records.slice();
    let n = 0;
    for (const i of indices) {
      const r = records[i]!;
      const v = mode === 'set' ? value : mode === 'min' ? Math.max(r[field], value) : Math.min(r[field], value);
      if (r[field] === v) continue;
      records[i] = withClubField(r, field, v);
      n++;
    }
    if (n) this.h.apply(`${n} klub: ${field} ${mode} ${value}`, [[K.club, { ...dat, records }]]);
    return n;
  }

  private renameInLng(uid: number, names: Partial<Pick<ClubRecord, 'longName' | 'shortName' | 'name6' | 'code4'>>): Map<string, LngDat> {
    const m = new Map<string, LngDat>();
    for (const [k, l] of this.h.get<Map<string, LngDat>>(K.lng)) {
      m.set(k, { ...l, entries: l.entries.map((e) => (e.uid === uid ? { ...e, longName: names.longName ?? e.longName, shortName: names.shortName ?? e.shortName, name6: names.name6 ?? e.name6, code4: names.code4 ?? e.code4 } : e)) });
    }
    return m;
  }

  nextClubUid(): number {
    let max = 2000700000;
    for (const r of this.clubs.records) if (r.uid > max && r.uid < 2000700200) max = r.uid;
    return max + 1;
  }

  /**
   * Klub baru (pola B6): klon record templat ke ujung club.dat dengan UID baru, skuad & staf kosong,
   * nama/negara/divisi baru; nama ditambah di ujung 16 file .lng; UID didaftarkan di fmm_clubs kalau
   * sicomps dibuka (entri daftar dipilih pemanggil, mis. IDN-0/1/2).
   */
  async cloneClub(templateIndex: number, o: { uid: number; longName: string; shortName: string; name6: string; code4: string; code3: string; nation: number; division: number; registerIn?: string[] }): Promise<number> {
    await this.loadLng();
    const dat = this.clubs;
    if (dat.records.some((r) => r.uid === o.uid)) throw new Error(`UID klub ${o.uid} sudah dipakai`);
    const tpl = dat.records[templateIndex]!;
    let r = cloneClubRecord(tpl, o.uid);
    r = withClubNames(r, { longName: o.longName, shortName: o.shortName, name6: o.name6, code4: o.code4, code3: o.code3 });
    for (const [f, v] of [['nation', o.nation], ['basedNation', o.nation], ['division', o.division], ['lastDivision', o.division]] as const) r = withClubField(r, f, v);
    const lng = new Map<string, LngDat>();
    for (const [k, l] of this.h.get<Map<string, LngDat>>(K.lng)) {
      if (l.entries.length !== dat.records.length) throw new Error(`${k}: jumlah entri ${l.entries.length} ≠ jumlah klub ${dat.records.length}`);
      const t = l.entries.find((e) => e.uid === tpl.uid) ?? l.entries[templateIndex]!;
      lng.set(k, { ...l, entries: [...l.entries, { uid: o.uid, longName: o.longName, gap1: t.gap1, shortName: o.shortName, gap2: t.gap2, name6: o.name6, code4: o.code4 }] });
    }
    const updates: [string, unknown][] = [[K.club, { ...dat, records: [...dat.records, r] }], [K.lng, lng]];
    if (o.registerIn?.length && this.sicomps) updates.push([K.list('fmm_clubs'), this.withListAdd(await this.loadList('fmm_clubs'), o.registerIn, [o.uid])]);
    this.h.apply(`Klub baru ${o.longName}`, updates);
    return dat.records.length;
  }

  // ---------- edit: kompetisi ----------
  setCompetition(index: number, o: { longName?: string; shortName?: string; abbr?: string; reputation?: number }): void {
    const dat = this.competitions;
    let r = dat.records[index]!;
    if (o.longName !== undefined || o.shortName !== undefined || o.abbr !== undefined) r = withCompetitionNames(r, { longName: o.longName, shortName: o.shortName, abbr: o.abbr });
    if (o.reputation !== undefined && o.reputation !== r.reputation) r = withCompetitionField(r, 'reputation', o.reputation);
    if (r === dat.records[index]) return;
    const records = dat.records.slice();
    records[index] = r;
    this.h.apply(`Kompetisi ${r.longName}`, [[K.competition, { ...dat, records }]]);
  }

  // ---------- edit: stadion ----------
  setStadium(index: number, patch: Partial<Omit<StadiumFields, 'uid'>>): void {
    const dat = this.stadiums;
    const r = withStadium(dat.records[index]!, patch);
    const records = dat.records.slice();
    records[index] = r;
    this.h.apply(`Stadion ${r.name}`, [[K.stadium, { ...dat, records }]]);
  }

  async addStadium(f: StadiumFields, templateIndex: number, o: { registerIn?: string[]; assignToClub?: number } = {}): Promise<number> {
    const dat = this.stadiums;
    const next = appendStadium(dat, f, dat.records[templateIndex]!);
    const idx = next.records.length - 1;
    const updates: [string, unknown][] = [[K.stadium, next]];
    if (o.registerIn?.length && this.sicomps) updates.push([K.list('fmm_stadiums'), this.withListAdd(await this.loadList('fmm_stadiums'), o.registerIn, [f.uid])]);
    if (o.assignToClub !== undefined) {
      const cd = this.clubs;
      const records = cd.records.slice();
      records[o.assignToClub] = withClubField(records[o.assignToClub]!, 'stadium', idx);
      updates.push([K.club, { ...cd, records }]);
    }
    this.h.apply(`Stadion baru ${f.name}`, updates);
    return idx;
  }

  // ---------- edit: rivalitas ----------
  setRivalry(index: number, patch: { intensity?: number; name?: string }): void {
    const dat = this.rivalries;
    const records = dat.records.slice();
    records[index] = withRivalry(records[index]!, patch);
    this.h.apply(`Rivalitas ${records[index]!.name}`, [[K.rivalries, { ...dat, records }]]);
  }

  addRivalry(f: { name: string; clubA: number; clubB: number; intensity: number }): void {
    const dat = this.rivalries;
    if (!dat.records[0]) throw new Error('rivalries.dat kosong; tidak ada templat');
    this.h.apply(`Rivalitas baru ${f.name}`, [[K.rivalries, appendRivalry(dat, f, dat.records[0])]]);
  }

  // ---------- edit: negara ----------
  youthRating(nationIndex: number): number | null {
    const n = this.nations[nationIndex];
    if (!n) return null;
    const o = youthRatingOffset(this.nationBytes, n);
    return o < 0 ? null : (this.nationBytes[o] ?? null);
  }

  setYouthRating(nationIndex: number, value: number): void {
    const n = this.nations[nationIndex];
    if (!n) throw new Error('negara tidak ada');
    this.h.apply(`Youth rating ${n.name} = ${value}`, [[K.nation, withYouthRating(this.nationBytes, n, value)]]);
  }

  // ---------- edit: daftar muat ----------
  private withListAdd(lists: Map<string, UidList>, entries: readonly string[], uids: readonly number[]): Map<string, UidList> {
    const m = new Map(lists);
    for (const e of entries) {
      const l = m.get(e);
      if (!l) throw new Error(`Daftar ${e} tidak ada`);
      m.set(e, addUids(l, uids));
    }
    return m;
  }

  async listAdd(name: FmmListName, entries: readonly string[], uids: readonly number[]): Promise<void> {
    this.h.apply(`${name}: tambah ${uids.length} UID`, [[K.list(name), this.withListAdd(await this.loadList(name), entries, uids)]]);
  }

  async listRemove(name: FmmListName, entry: string, uids: readonly number[]): Promise<void> {
    const m = new Map(await this.loadList(name));
    const l = m.get(entry);
    if (!l) throw new Error(`Daftar ${entry} tidak ada`);
    m.set(entry, removeUids(l, uids));
    this.h.apply(`${name}/${entry}: hapus ${uids.length} UID`, [[K.list(name), m]]);
  }

  // ---------- edit: aturan comps.dbc ----------
  async setDbcValue(entryName: string, path: DbcPath, value: DbcValue): Promise<void> {
    const e = await this.dbcEntry(entryName);
    const m = new Map(this.h.get<Map<string, DbcEntry>>(K.dbc));
    m.set(entryName, setAt(e, path, value));
    this.h.apply(`${entryName}: ubah nilai`, [[K.dbc, m]]);
  }

  // ---------- edit: logo ----------
  addLogo(item: LogoItem): void {
    const items = this.h.get<LogoItem[]>(K.logos).filter((x) => !(x.kind === item.kind && x.id === item.id));
    this.h.apply(`Logo ${item.label}`, [[K.logos, [...items, item]]]);
  }

  // ---------- perubahan ----------
  dirty(prefix: 'db:' | 'sc:' | 'logo:'): string[] {
    return this.h.dirtyKeys().filter((k) => k.startsWith(prefix));
  }

  changes(): ChangeLine[] {
    const out: ChangeLine[] = [];
    const keys = new Set(this.h.dirtyKeys());
    if (keys.has(K.club)) {
      const a = this.h.original<ClubDat>(K.club).records;
      const b = this.clubs.records;
      const F: ClubFixedField[] = ['nation', 'basedNation', 'status', 'trainingFacilities', 'youthFacilities', 'attendanceAvg', 'attendanceMin', 'attendanceMax', 'division', 'division2', 'stadium', 'lastDivision', 'reputation'];
      b.forEach((r, i) => {
        const o = a[i];
        if (!o) return void out.push({ file: 'club.dat', what: `klub baru #${i} ${r.longName} (UID ${r.uid})` });
        if (o === r) return;
        if (o.longName !== r.longName || o.shortName !== r.shortName || o.code3 !== r.code3) out.push({ file: 'club.dat', what: `${o.longName}: nama`, from: `${o.longName} / ${o.shortName} / ${o.code3}`, to: `${r.longName} / ${r.shortName} / ${r.code3}` });
        for (const f of F) if (o[f] !== r[f]) out.push({ file: 'club.dat', what: `${r.longName}: ${f}`, from: String(o[f]), to: String(r[f]) });
      });
    }
    if (keys.has(K.competition)) {
      const a = this.h.original<CompetitionDat>(K.competition).records;
      this.competitions.records.forEach((r, i) => {
        const o = a[i]!;
        if (o === r) return;
        if (o.longName !== r.longName) out.push({ file: 'competition.dat', what: `${o.longName}: nama panjang`, from: o.longName, to: r.longName });
        if (o.shortName !== r.shortName) out.push({ file: 'competition.dat', what: `${o.longName}: nama pendek`, from: o.shortName, to: r.shortName });
        if (o.abbr !== r.abbr) out.push({ file: 'competition.dat', what: `${o.longName}: singkatan`, from: o.abbr, to: r.abbr });
        if (o.reputation !== r.reputation) out.push({ file: 'competition.dat', what: `${r.longName}: reputasi`, from: String(o.reputation), to: String(r.reputation) });
      });
    }
    if (keys.has(K.stadium)) {
      const a = this.h.original<StadiumDat>(K.stadium).records;
      this.stadiums.records.forEach((r, i) => {
        const o = a[i];
        if (!o) return void out.push({ file: 'stadium.dat', what: `stadion baru #${i} ${r.name} (UID ${r.uid}, kapasitas ${r.capacity})` });
        if (o === r) return;
        for (const f of ['name', 'altName', 'capacity', 'maxCapacity', 'city'] as const) if (o[f] !== r[f]) out.push({ file: 'stadium.dat', what: `${o.name}: ${f}`, from: String(o[f]), to: String(r[f]) });
      });
    }
    if (keys.has(K.rivalries)) {
      const a = this.h.original<RivalryDat>(K.rivalries).records;
      this.rivalries.records.forEach((r, i) => {
        const o = a[i];
        if (!o) return void out.push({ file: 'rivalries.dat', what: `rivalitas baru ${r.name} (klub #${r.clubA} vs #${r.clubB}, intensitas ${r.intensity})` });
        if (o === r) return;
        if (o.intensity !== r.intensity) out.push({ file: 'rivalries.dat', what: `${r.name}: intensitas`, from: String(o.intensity), to: String(r.intensity) });
        if (o.name !== r.name) out.push({ file: 'rivalries.dat', what: 'nama rivalitas', from: o.name, to: r.name });
      });
    }
    if (keys.has(K.nation)) {
      const a = this.h.original<Uint8Array>(K.nation);
      for (const n of this.nations) {
        const off = youthRatingOffset(a, n);
        if (off >= 0 && a[off] !== this.nationBytes[off]) out.push({ file: 'nation.dat', what: `${n.name}: youth rating (HYPOTHESIS)`, from: String(a[off]), to: String(this.nationBytes[off]) });
      }
    }
    if (keys.has(K.lng)) out.push({ file: '*.lng (16 bahasa)', what: 'nama klub ditambah/diubah' });
    for (const k of keys) {
      if (!k.startsWith('sc:list:')) continue;
      const name = k.slice(8);
      const a = this.h.original<Map<string, UidList>>(k);
      for (const [e, l] of this.h.get<Map<string, UidList>>(k)) {
        const o = a.get(e)!;
        if (o === l) continue;
        const os = new Set(o.uids);
        const ns = new Set(l.uids);
        const add = l.uids.filter((u) => !os.has(u));
        const rem = o.uids.filter((u) => !ns.has(u));
        out.push({ file: `${name}.dat/${e}`, what: `${add.length ? `tambah ${add.join(', ')}` : ''}${add.length && rem.length ? '; ' : ''}${rem.length ? `hapus ${rem.join(', ')}` : ''}` });
      }
    }
    if (keys.has(K.dbc)) for (const n of this.h.get<Map<string, DbcEntry>>(K.dbc).keys()) out.push({ file: 'comps.dbc', what: `${n} diubah (versi di comps.txt dinaikkan)` });
    if (keys.has(K.logos)) for (const it of this.h.get<LogoItem[]>(K.logos)) out.push({ file: 'pictures_logos.fmf', what: `logo ${it.kind === 'clubs' ? 'klub' : 'kompetisi'} ${it.label} (ID ${it.id})` });
    return out;
  }

  // ---------- ekspor ----------
  /** File db yang berubah: nama entri (dengan ekstensi) → isi baru + jalur folder di arsip. */
  dbChangedEntries(): { name: string; ext: string; folder: string; data: Uint8Array }[] {
    if (!this.db) return [];
    const out: { name: string; ext: string; folder: string; data: Uint8Array }[] = [];
    const keys = new Set(this.dirty('db:'));
    const put = (file: string, data: Uint8Array) => {
      const hit = findEntry(this.db!.root, file);
      if (!hit) throw new Error(`${file} tidak ada di db_archive`);
      out.push({ name: hit.entry.name, ext: hit.entry.ext, folder: hit.path.slice(0, hit.path.lastIndexOf('/')), data });
    };
    if (keys.has(K.club)) put('club.dat', serializeClubDat(this.clubs));
    if (keys.has(K.competition)) put('competition.dat', serializeCompetitionDat(this.competitions));
    if (keys.has(K.stadium)) put('stadium.dat', serializeStadiumDat(this.stadiums));
    if (keys.has(K.rivalries)) put('rivalries.dat', serializeRivalryDat(this.rivalries));
    if (keys.has(K.nation)) put('nation.dat', this.nationBytes);
    if (keys.has(K.lng)) {
      const orig = this.h.original<Map<string, LngDat>>(K.lng);
      for (const [path, l] of this.h.get<Map<string, LngDat>>(K.lng)) if (orig.get(path) !== l) put(path, serializeLngDat(l));
    }
    return out;
  }

  buildDbFmf(): FmfOutput {
    if (!this.db) throw new Error('db_archive belum dibuka');
    return patchFmf(this.db, this.dbChangedEntries().map((e) => ({ folder: e.folder, name: e.name, ext: e.ext, data: e.data })));
  }

  async buildSicompsFmf(): Promise<FmfOutput> {
    if (!this.sicomps) throw new Error('sicomps.fmf belum dibuka');
    const sc = this.sicomps;
    const changes: FmfChange[] = [];
    const where = (path: string) => ({ folder: path.slice(0, path.lastIndexOf('/')), file: path.slice(path.lastIndexOf('/') + 1) });
    const split = (file: string) => ({ name: file.slice(0, file.lastIndexOf('.')), ext: file.slice(file.lastIndexOf('.')) });
    // daftar muat
    for (const k of this.dirty('sc:')) {
      if (!k.startsWith('sc:list:')) continue;
      const name = k.slice(8) as FmmListName;
      const inner = this.listInner.get(name)!;
      const orig = this.h.original<Map<string, UidList>>(k);
      const ch: FmfChange[] = [];
      for (const [e, l] of this.h.get<Map<string, UidList>>(k)) {
        if (orig.get(e) === l) continue;
        const hit = listEntries(inner.arc.root).find((x) => x.entry.name === e)!;
        ch.push({ folder: hit.path.slice(0, hit.path.lastIndexOf('/')), name: hit.entry.name, ext: hit.entry.ext, data: serializeUidList(l) });
      }
      const bytes = concatBytes([inner.prefix, await materializeOutput(inner.arc, patchFmf(inner.arc, ch))]);
      const w = where(inner.entryPath);
      changes.push({ folder: w.folder, ...split(w.file), data: bytes });
    }
    // aturan
    const edited = this.h.get<Map<string, DbcEntry>>(K.dbc);
    if (edited.size && this.dbcInner) {
      const inner = this.dbcInner;
      const ch: FmfChange[] = [];
      for (const [n, e] of edited) {
        const hit = findEntry(inner.arc.root, n)!;
        ch.push({ folder: hit.path.slice(0, hit.path.lastIndexOf('/')), name: hit.entry.name, ext: hit.entry.ext, data: buildDbcEntry(e) });
      }
      const dbcHit = findEntry(sc.root, 'comps.dbc')!;
      const w = where(dbcHit.path);
      changes.push({ folder: w.folder, ...split(w.file), data: concatBytes([inner.prefix, await materializeOutput(inner.arc, patchFmf(inner.arc, ch))]) });
      const txtHit = findEntry(sc.root, 'comps.txt');
      if (txtHit) {
        let text = td.decode(await readEntry(sc, txtHit.entry));
        for (const n of edited.keys()) text = bumpCompsTxt(text, n).text;
        const tw = where(txtHit.path);
        changes.push({ folder: tw.folder, ...split(tw.file), data: te.encode(text) });
      }
    }
    return patchFmf(sc, changes);
  }

  buildLogosFmf(): FmfOutput {
    if (!this.logos) throw new Error('pictures_logos.fmf belum dibuka');
    const items = this.h.get<LogoItem[]>(K.logos);
    const changes: FmfChange[] = [];
    const byKey = new Map<string, string[]>();
    for (const it of items) {
      for (const sz of ['normal', 'small'] as LogoSize[]) {
        const key = `${sz}/${it.kind}`;
        byKey.set(key, [...(byKey.get(key) ?? []), it.id]);
        changes.push({ folder: `${LOGO_BASE}/${key}/custom`, name: it.id, ext: '.png', data: sz === 'normal' ? it.normal : it.small });
      }
    }
    for (const [key, ids] of byKey) {
      const cfg = this.logoConfigs.get(key);
      if (!cfg) throw new Error(`config.xml untuk ${key} tidak ada`);
      const [sz, kind] = key.split('/') as [LogoSize, LogoKind];
      changes.push({ folder: `${LOGO_BASE}/${key}`, name: 'config', ext: '.xml', data: te.encode(editLogoConfig(cfg, kind, ids, sz)) });
    }
    return patchFmf(this.logos, changes);
  }

  logoItems(): LogoItem[] {
    return this.h.has(K.logos) ? this.h.get<LogoItem[]>(K.logos) : [];
  }
}
