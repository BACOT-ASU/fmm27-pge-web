import { withClubField, type ClubDat, type ClubFixedField, type ClubRecord } from '../formats/club/clubDat';

/** Satu perubahan field (nilai asli dari file vs nilai sekarang). */
export interface ClubChange {
  index: number;
  uid: number;
  name: string;
  field: ClubFixedField;
  from: number;
  to: number;
}

interface Step {
  label: string;
  /** index klub → record sebelum langkah ini. */
  before: Map<number, ClubRecord>;
  after: Map<number, ClubRecord>;
}

/**
 * Sesi edit club.dat: menyimpan record asli dan record yang diubah, dengan undo/redo.
 * Record asli tidak pernah diubah; setiap edit menghasilkan record baru (withClubField).
 */
export class ClubEditSession {
  private current = new Map<number, ClubRecord>();
  private undoStack: Step[] = [];
  private redoStack: Step[] = [];

  constructor(readonly base: ClubDat) {}

  record(index: number): ClubRecord {
    const r = this.current.get(index) ?? this.base.records[index];
    if (!r) throw new RangeError(`Klub index ${index} tidak ada`);
    return r;
  }

  /** Ubah satu field satu klub (satu langkah undo). */
  set(index: number, field: ClubFixedField, value: number): void {
    this.apply(`${this.record(index).longName}: ${field} = ${value}`, [index], () => value, field);
  }

  /** Ubah beberapa field satu klub sekaligus (satu langkah undo). Field yang nilainya sama dilewati. */
  setMany(index: number, values: Partial<Record<ClubFixedField, number>>): number {
    const before = this.record(index);
    let r = before;
    for (const [f, v] of Object.entries(values) as [ClubFixedField, number][]) {
      if (v === undefined || r[f] === v) continue;
      r = withClubField(r, f, v);
    }
    if (r === before) return 0;
    this.current.set(index, r);
    this.undoStack.push({ label: `${before.longName}: ${Object.keys(values).join(', ')}`, before: new Map([[index, before]]), after: new Map([[index, r]]) });
    this.redoStack = [];
    return 1;
  }

  /**
   * Ubah satu field untuk banyak klub sekaligus (satu langkah undo).
   * mode 'set' = samakan; 'min' = naikkan hanya yang di bawah nilai; 'max' = turunkan hanya yang di atas nilai.
   */
  batch(indices: readonly number[], field: ClubFixedField, value: number, mode: 'set' | 'min' | 'max' = 'set'): number {
    const target = (r: ClubRecord) =>
      mode === 'set' ? value : mode === 'min' ? Math.max(r[field], value) : Math.min(r[field], value);
    return this.apply(`${indices.length} klub: ${field} ${mode} ${value}`, indices, target, field);
  }

  private apply(label: string, indices: readonly number[], target: (r: ClubRecord) => number, field: ClubFixedField): number {
    const before = new Map<number, ClubRecord>();
    const after = new Map<number, ClubRecord>();
    for (const i of indices) {
      const r = this.record(i);
      const v = target(r);
      if (r[field] === v) continue;
      const next = withClubField(r, field, v); // melempar RangeError kalau di luar rentang
      before.set(i, r);
      after.set(i, next);
    }
    if (after.size === 0) return 0;
    for (const [i, r] of after) this.current.set(i, r);
    this.undoStack.push({ label, before, after });
    this.redoStack = [];
    return after.size;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  get lastLabel(): string | undefined {
    return this.undoStack[this.undoStack.length - 1]?.label;
  }

  undo(): void {
    const s = this.undoStack.pop();
    if (!s) return;
    for (const [i, r] of s.before) this.restore(i, r);
    this.redoStack.push(s);
  }

  redo(): void {
    const s = this.redoStack.pop();
    if (!s) return;
    for (const [i, r] of s.after) this.restore(i, r);
    this.undoStack.push(s);
  }

  private restore(i: number, r: ClubRecord): void {
    if (r === this.base.records[i]) this.current.delete(i);
    else this.current.set(i, r);
  }

  /** Daftar perubahan bersih: hanya field yang nilainya beda dari file asli. */
  changes(): ClubChange[] {
    const FIELDS: ClubFixedField[] = [
      'nation', 'basedNation', 'status', 'trainingFacilities', 'youthFacilities', 'attendanceAvg', 'attendanceMin',
      'attendanceMax', 'division', 'division2', 'stadium', 'lastDivision', 'reputation',
    ];
    const out: ClubChange[] = [];
    for (const i of [...this.current.keys()].sort((a, b) => a - b)) {
      const orig = this.base.records[i]!;
      const now = this.current.get(i)!;
      for (const f of FIELDS) if (orig[f] !== now[f]) out.push({ index: i, uid: orig.uid, name: orig.longName, field: f, from: orig[f], to: now[f] });
    }
    return out;
  }

  get changedClubCount(): number {
    return new Set(this.changes().map((c) => c.index)).size;
  }

  /** club.dat baru (record yang tidak diubah tetap objek aslinya). */
  build(): ClubDat {
    return { header: this.base.header, records: this.base.records.map((r, i) => this.current.get(i) ?? r) };
  }
}
