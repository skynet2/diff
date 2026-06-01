import { DiffEntry, DiffResult, DiffType } from './diff.types';
import { pathKey } from './path';

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function kind(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function walk(a: unknown, b: unknown, path: (string | number)[], out: DiffEntry[]): void {
  if (kind(a) !== kind(b)) {
    out.push({ path, type: 'changed', leftVal: a, rightVal: b });
    return;
  }
  if (isObject(a) && isObject(b)) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    for (const k of keys) {
      const inA = k in a, inB = k in b;
      if (inA && !inB) out.push({ path: [...path, k], type: 'removed', leftVal: a[k] });
      else if (!inA && inB) out.push({ path: [...path, k], type: 'added', rightVal: b[k] });
      else walk(a[k], b[k], [...path, k], out);
    }
    return;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      if (i >= a.length) out.push({ path: [...path, i], type: 'added', rightVal: b[i] });
      else if (i >= b.length) out.push({ path: [...path, i], type: 'removed', leftVal: a[i] });
      else walk(a[i], b[i], [...path, i], out);
    }
    return;
  }
  if (!isObject(a) && !Array.isArray(a)) {
    const equal = a === b || (Number.isNaN(a as number) && Number.isNaN(b as number));
    if (!equal) out.push({ path, type: 'changed', leftVal: a, rightVal: b });
  }
}

export function diff(a: unknown, b: unknown): DiffResult {
  const entries: DiffEntry[] = [];
  walk(a, b, [], entries);
  const byPath = new Map<string, DiffType>();
  for (const e of entries) byPath.set(pathKey(e.path), e.type);
  return { entries, byPath };
}
