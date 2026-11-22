/**
 * Riwayat edit lintas file: setiap kunci (mis. "db:club.dat") menyimpan satu model tak-berubah.
 * Setiap langkah menyimpan model sebelum/sesudah untuk kunci yang disentuh → urung/ulang gabungan.
 */
export interface Step {
  label: string;
  before: Map<string, unknown>;
  after: Map<string, unknown>;
}

export class History {
  private readonly base = new Map<string, unknown>();
  private readonly cur = new Map<string, unknown>();
  private undoStack: Step[] = [];
  private redoStack: Step[] = [];

  /** Daftarkan model asli untuk sebuah kunci (sekali, saat file dimuat). */
  register(key: string, model: unknown): void {
    if (!this.base.has(key)) this.base.set(key, model);
  }

  has(key: string): boolean {
    return this.base.has(key);
  }

  get<T>(key: string): T {
    if (this.cur.has(key)) return this.cur.get(key) as T;
    if (!this.base.has(key)) throw new Error(`Model ${key} belum dimuat`);
    return this.base.get(key) as T;
  }

  original<T>(key: string): T {
    return this.base.get(key) as T;
  }

  apply(label: string, updates: ReadonlyArray<[string, unknown]>): void {
    const before = new Map<string, unknown>();
    const after = new Map<string, unknown>();
    for (const [k, v] of updates) {
      const old = this.get(k);
      if (old === v) continue;
      before.set(k, old);
      after.set(k, v);
    }
    if (after.size === 0) return;
    for (const [k, v] of after) this.set(k, v);
    this.undoStack.push({ label, before, after });
    this.redoStack = [];
  }

  private set(k: string, v: unknown): void {
    if (v === this.base.get(k)) this.cur.delete(k);
    else this.cur.set(k, v);
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  get lastLabel(): string | undefined {
    return this.undoStack.at(-1)?.label;
  }

  undo(): void {
    const s = this.undoStack.pop();
    if (!s) return;
    for (const [k, v] of s.before) this.set(k, v);
    this.redoStack.push(s);
  }

  redo(): void {
    const s = this.redoStack.pop();
    if (!s) return;
    for (const [k, v] of s.after) this.set(k, v);
    this.undoStack.push(s);
  }

  /** Kunci yang modelnya beda dari aslinya. */
  dirtyKeys(): string[] {
    return [...this.cur.keys()];
  }
}
