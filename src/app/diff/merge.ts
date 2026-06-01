import { MergedNode, NodeStatus, MergedCell } from './diff.types';

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function kind(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function hasChildren(v: unknown): boolean {
  return isObject(v) ? Object.keys(v).length > 0 : Array.isArray(v) ? v.length > 0 : false;
}

function cell(v: unknown): MergedCell {
  return { value: v, hasChildren: hasChildren(v) };
}

function scalarEqual(a: unknown, b: unknown): boolean {
  return kind(a) === kind(b) && (a === b || (Number.isNaN(a as number) && Number.isNaN(b as number)));
}

interface Merged {
  nodes: MergedNode[];
  changed: boolean;
}

function mergePair(a: unknown, b: unknown, key: string | number): MergedNode {
  if (kind(a) === kind(b) && isObject(a) && isObject(b)) {
    const r = mergeChildrenObj(a, b);
    return { key, status: r.changed ? 'changed' : 'same', left: cell(a), right: cell(b), children: r.nodes };
  }
  if (kind(a) === kind(b) && Array.isArray(a) && Array.isArray(b)) {
    const r = mergeChildrenArr(a, b);
    return { key, status: r.changed ? 'changed' : 'same', left: cell(a), right: cell(b), children: r.nodes };
  }
  const status: NodeStatus = scalarEqual(a, b) ? 'same' : 'changed';
  return { key, status, left: cell(a), right: cell(b) };
}

function mergeChildrenObj(a: Record<string, unknown>, b: Record<string, unknown>): Merged {
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  const nodes: MergedNode[] = [];
  let changed = false;
  for (const k of keys) {
    const inA = k in a, inB = k in b;
    if (inA && !inB) { nodes.push({ key: k, status: 'removed', left: cell(a[k]) }); changed = true; }
    else if (!inA && inB) { nodes.push({ key: k, status: 'added', right: cell(b[k]) }); changed = true; }
    else {
      const node = mergePair(a[k], b[k], k);
      if (node.status !== 'same') changed = true;
      nodes.push(node);
    }
  }
  return { nodes, changed };
}

function mergeChildrenArr(a: unknown[], b: unknown[]): Merged {
  const n = Math.max(a.length, b.length);
  const nodes: MergedNode[] = [];
  let changed = false;
  for (let i = 0; i < n; i++) {
    if (i >= a.length) { nodes.push({ key: i, status: 'added', right: cell(b[i]) }); changed = true; }
    else if (i >= b.length) { nodes.push({ key: i, status: 'removed', left: cell(a[i]) }); changed = true; }
    else {
      const node = mergePair(a[i], b[i], i);
      if (node.status !== 'same') changed = true;
      nodes.push(node);
    }
  }
  return { nodes, changed };
}

export function mergeTree(a: unknown, b: unknown): MergedNode[] {
  if (isObject(a) && isObject(b)) return mergeChildrenObj(a, b).nodes;
  if (Array.isArray(a) && Array.isArray(b)) return mergeChildrenArr(a, b).nodes;
  return [mergePair(a, b, '')];
}
