import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '..');
export const FIXTURES = join(ROOT, 'tests', 'fixtures');
export const SAMPLES = join(ROOT, 'samples');

export function sha256(b: Uint8Array): string {
  return createHash('sha256').update(b).digest('hex');
}

export function readFixture(...parts: string[]): Uint8Array {
  return new Uint8Array(readFileSync(join(FIXTURES, ...parts)));
}

/** Apakah python3 + zstandard tersedia (untuk golden test terhadap skrip Python). */
export const pythonAvailable: boolean = (() => {
  try {
    execFileSync('python3', ['-c', 'import zstandard'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

export function runPythonJson<T>(script: string, args: string[]): T {
  const out = execFileSync('python3', [join(ROOT, 'scripts', 'golden', script), ...args], {
    encoding: 'utf-8',
    maxBuffer: 512 * 1024 * 1024,
  });
  return JSON.parse(out) as T;
}

export function samplePath(name: string): string | null {
  const p = join(SAMPLES, name);
  return existsSync(p) ? p : null;
}
