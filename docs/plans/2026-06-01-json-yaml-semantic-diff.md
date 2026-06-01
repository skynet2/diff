# JSON/YAML Semantic Diff Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a minimal two-panel Angular app that edits JSON/YAML and shows a semantic (structural) diff in an aligned tree view.

**Architecture:** Standalone Angular components + signals. A pure, framework-free diff engine compares two parsed values and emits both a flat diff list and an aligned merged-tree. Monaco powers text mode; a recursive custom component renders the merged tree with color highlights. Diff is a `computed()` over both parsed models.

**Tech Stack:** Angular (standalone, signals), TypeScript, Monaco Editor, js-yaml, Jest (or Karma/Jasmine if scaffold default), Chrome for e2e verification.

**Design reference:** `docs/plans/2026-06-01-json-yaml-semantic-diff-design.md`

---

## Conventions

- **TDD always.** Red → green → commit. Use superpowers:test-driven-development.
- **Diff engine is pure.** No Angular imports in `src/app/diff/`. It is the correctness core — most tests live here.
- **Tests: zero branching.** Table-driven, success and failure/edge cases in *separate* tables.
- Commit after every green step. Conventional Commits. Signed (`git commit -S`).
- Exact paths below assume the Angular CLI default `src/app/` layout.

---

## Task 1: Scaffold Angular app

**Files:**
- Create: project scaffold via Angular CLI in repo root.

**Step 1:** Scaffold (routing off, SCSS, standalone is default in modern CLI):

```bash
npx -y @angular/cli@latest new diff-app --directory . --style=scss --routing=false --skip-git --ssr=false --package-manager=npm
```

Expected: `src/app/app.component.ts`, `angular.json`, `package.json` created. (CLI may prompt for analytics — answer no / use `--no-interactive` if available.)

**Step 2:** Verify it builds and serves:

```bash
npm run build
```

Expected: build succeeds, `dist/` produced.

**Step 3:** Verify the test runner works:

```bash
npm test -- --watch=false
```

Expected: default `app.component.spec.ts` passes (or note the runner so later tasks match it).

**Step 4: Commit**

```bash
git add -A && git commit -S -m "chore: scaffold angular app"
```

---

## Task 2: Install dependencies

**Step 1:** Install runtime + types:

```bash
npm install monaco-editor js-yaml
npm install -D @types/js-yaml
```

**Step 2:** Wire Monaco assets in `angular.json` — add to `architect.build.options.assets`:

```json
{ "glob": "**/*", "input": "node_modules/monaco-editor/min/vs", "output": "/assets/monaco/vs" }
```

**Step 3:** Verify build still passes:

```bash
npm run build
```

Expected: success.

**Step 4: Commit**

```bash
git add -A && git commit -S -m "chore: add monaco and js-yaml deps"
```

---

## Task 3: Diff engine — types + path helper

**Files:**
- Create: `src/app/diff/diff.types.ts`
- Create: `src/app/diff/path.ts`
- Test: `src/app/diff/path.spec.ts`

**Step 1: Write the failing test** (`path.spec.ts`):

```ts
import { pathKey } from './path';

describe('pathKey (success)', () => {
  const cases: { name: string; path: (string | number)[]; want: string }[] = [
    { name: 'empty root', path: [], want: '' },
    { name: 'single key', path: ['addr'], want: 'addr' },
    { name: 'nested key', path: ['addr', 'zip'], want: 'addr/zip' },
    { name: 'array index', path: ['tags', 1], want: 'tags/1' },
    { name: 'key with slash escaped', path: ['a/b', 'c'], want: 'a~1b/c' },
  ];
  cases.forEach(({ name, path, want }) =>
    it(name, () => expect(pathKey(path)).toBe(want)),
  );
});
```

**Step 2: Run, verify it fails**

```bash
npm test -- --watch=false --testPathPattern=path.spec
```

Expected: FAIL — `pathKey` not defined.

**Step 3: Implement** (`diff.types.ts`):

```ts
export type DiffType = 'added' | 'removed' | 'changed';

export interface DiffEntry {
  path: (string | number)[];
  type: DiffType;
  leftVal?: unknown;
  rightVal?: unknown;
}

export interface DiffResult {
  entries: DiffEntry[];
  byPath: Map<string, DiffType>;
}

export type NodeStatus = 'same' | 'changed' | 'added' | 'removed';

export interface MergedCell {
  value: unknown;
  hasChildren: boolean;
}

export interface MergedNode {
  key: string | number;
  status: NodeStatus;
  left?: MergedCell;
  right?: MergedCell;
  children?: MergedNode[];
}
```

`path.ts`:

```ts
export function pathKey(path: (string | number)[]): string {
  return path.map((p) => String(p).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
}
```

**Step 4: Run, verify pass**

```bash
npm test -- --watch=false --testPathPattern=path.spec
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/diff && git commit -S -m "feat(diff): add diff types and path key helper"
```

---

## Task 4: Diff engine — scalar + type comparison

**Files:**
- Create: `src/app/diff/diff.ts`
- Test: `src/app/diff/diff.spec.ts`

**Step 1: Write the failing test** (success table — no diffs):

```ts
import { diff } from './diff';

describe('diff scalars (no difference)', () => {
  const cases: { name: string; a: unknown; b: unknown }[] = [
    { name: 'equal numbers', a: 30, b: 30 },
    { name: 'equal strings', a: 'x', b: 'x' },
    { name: 'equal booleans', a: true, b: true },
    { name: 'both null', a: null, b: null },
  ];
  cases.forEach(({ name, a, b }) =>
    it(name, () => expect(diff(a, b).entries).toEqual([])),
  );
});

describe('diff scalars (changed)', () => {
  const cases: { name: string; a: unknown; b: unknown }[] = [
    { name: 'number changed', a: 30, b: 31 },
    { name: 'string changed', a: 'a', b: 'b' },
    { name: 'type mismatch number vs string', a: 30, b: '30' },
    { name: 'null vs value', a: null, b: 1 },
  ];
  cases.forEach(({ name, a, b }) =>
    it(name, () => {
      const r = diff(a, b);
      expect(r.entries).toEqual([{ path: [], type: 'changed', leftVal: a, rightVal: b }]);
      expect(r.byPath.get('')).toBe('changed');
    }),
  );
});
```

**Step 2: Run, verify fail.**

**Step 3: Implement** (`diff.ts`) — start with scalar/type handling, an internal recursive walker pushing into `entries`, then build `byPath` from entries:

```ts
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
  // containers handled in later tasks; scalars here:
  if (!isObject(a) && !Array.isArray(a)) {
    if (a !== b) out.push({ path, type: 'changed', leftVal: a, rightVal: b });
  }
}

export function diff(a: unknown, b: unknown): DiffResult {
  const entries: DiffEntry[] = [];
  walk(a, b, [], entries);
  const byPath = new Map<string, DiffType>();
  for (const e of entries) byPath.set(pathKey(e.path), e.type);
  return { entries, byPath };
}
```

**Step 4: Run, verify pass.**

**Step 5: Commit** `feat(diff): scalar and type comparison`.

---

## Task 5: Diff engine — object comparison

**Files:** Modify `src/app/diff/diff.ts`; extend `diff.spec.ts`.

**Step 1: Failing tests** (separate add/remove/changed, key-order independence):

```ts
describe('diff objects (no difference)', () => {
  const cases = [
    { name: 'same keys same values', a: { x: 1, y: 2 }, b: { x: 1, y: 2 } },
    { name: 'key order ignored', a: { x: 1, y: 2 }, b: { y: 2, x: 1 } },
  ];
  cases.forEach(({ name, a, b }) =>
    it(name, () => expect(diff(a, b).entries).toEqual([])),
  );
});

describe('diff objects (differences)', () => {
  it('added key', () => {
    const r = diff({ x: 1 }, { x: 1, y: 2 });
    expect(r.entries).toEqual([{ path: ['y'], type: 'added', rightVal: 2 }]);
  });
  it('removed key', () => {
    const r = diff({ x: 1, y: 2 }, { x: 1 });
    expect(r.entries).toEqual([{ path: ['y'], type: 'removed', leftVal: 2 }]);
  });
  it('changed nested leaf only', () => {
    const r = diff({ addr: { city: 'NY', zip: '1' } }, { addr: { city: 'NY', zip: '2' } });
    expect(r.entries).toEqual([
      { path: ['addr', 'zip'], type: 'changed', leftVal: '1', rightVal: '2' },
    ]);
  });
  it('null vs missing is removed, not changed', () => {
    const r = diff({ x: null }, {});
    expect(r.entries).toEqual([{ path: ['x'], type: 'removed', leftVal: null }]);
  });
});
```

**Step 2: Run, verify fail.**

**Step 3: Implement** — add to `walk`, after the kind check, before scalar branch:

```ts
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
```

**Step 4: Run, verify pass.**

**Step 5: Commit** `feat(diff): object comparison, order-independent`.

---

## Task 6: Diff engine — array comparison (positional)

**Files:** Modify `diff.ts`; extend `diff.spec.ts`.

**Step 1: Failing tests:**

```ts
describe('diff arrays (no difference)', () => {
  it('equal arrays', () => expect(diff([1, 2], [1, 2]).entries).toEqual([]));
});

describe('diff arrays (positional)', () => {
  it('element changed', () => {
    const r = diff(['a', 'b'], ['a', 'c']);
    expect(r.entries).toEqual([{ path: [1], type: 'changed', leftVal: 'b', rightVal: 'c' }]);
  });
  it('element added at end', () => {
    const r = diff(['a'], ['a', 'b']);
    expect(r.entries).toEqual([{ path: [1], type: 'added', rightVal: 'b' }]);
  });
  it('element removed from end', () => {
    const r = diff(['a', 'b'], ['a']);
    expect(r.entries).toEqual([{ path: [1], type: 'removed', leftVal: 'b' }]);
  });
  it('combined change and add (site scenario tags)', () => {
    const r = diff(['a', 'b'], ['a', 'c', 'd']);
    expect(r.entries).toEqual([
      { path: [1], type: 'changed', leftVal: 'b', rightVal: 'c' },
      { path: [2], type: 'added', rightVal: 'd' },
    ]);
  });
});
```

**Step 2: Run, verify fail.**

**Step 3: Implement** — add array branch in `walk`:

```ts
  if (Array.isArray(a) && Array.isArray(b)) {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      if (i >= a.length) out.push({ path: [...path, i], type: 'added', rightVal: b[i] });
      else if (i >= b.length) out.push({ path: [...path, i], type: 'removed', leftVal: a[i] });
      else walk(a[i], b[i], [...path, i], out);
    }
    return;
  }
```

**Step 4: Run, verify pass.**

**Step 5: Commit** `feat(diff): positional array comparison`.

---

## Task 7: Merged tree builder (aligned rendering)

**Files:**
- Create: `src/app/diff/merge.ts`
- Test: `src/app/diff/merge.spec.ts`

**Step 1: Failing tests** — build `MergedNode[]` from two values. Cover same / changed / added (left cell absent) / removed (right cell absent) / nested:

```ts
import { mergeTree } from './merge';
import { MergedNode } from './diff.types';

describe('mergeTree (success)', () => {
  it('changed scalar field', () => {
    const nodes = mergeTree({ age: 30 }, { age: 31 });
    expect(nodes).toEqual<MergedNode[]>([
      { key: 'age', status: 'changed',
        left: { value: 30, hasChildren: false },
        right: { value: 31, hasChildren: false } },
    ]);
  });

  it('added key has no left cell', () => {
    const nodes = mergeTree({}, { y: 1 });
    expect(nodes).toEqual<MergedNode[]>([
      { key: 'y', status: 'added', right: { value: 1, hasChildren: false } },
    ]);
  });

  it('removed key has no right cell', () => {
    const nodes = mergeTree({ y: 1 }, {});
    expect(nodes).toEqual<MergedNode[]>([
      { key: 'y', status: 'removed', left: { value: 1, hasChildren: false } },
    ]);
  });

  it('nested object recurses with both cells as containers', () => {
    const nodes = mergeTree({ addr: { zip: '1' } }, { addr: { zip: '2' } });
    expect(nodes[0].key).toBe('addr');
    expect(nodes[0].status).toBe('changed');
    expect(nodes[0].left).toEqual({ value: { zip: '1' }, hasChildren: true });
    expect(nodes[0].children).toEqual<MergedNode[]>([
      { key: 'zip', status: 'changed',
        left: { value: '1', hasChildren: false },
        right: { value: '2', hasChildren: false } },
    ]);
  });
});
```

**Step 2: Run, verify fail.**

**Step 3: Implement** (`merge.ts`) — independent recursion that returns union-ordered merged nodes. Status of a container = `changed` if any descendant differs (computed during recursion):

```ts
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
  const status: NodeStatus = a === b && kind(a) === kind(b) ? 'same' : 'changed';
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
```

**Step 4: Run, verify pass.**

**Step 5: Commit** `feat(diff): merged-tree builder for aligned rendering`.

---

## Task 8: Parsers + format suggestion

**Files:**
- Create: `src/app/parse/parse.ts`
- Test: `src/app/parse/parse.spec.ts`

**Step 1: Failing tests** — `parseContent(text, format)` returns `{ value }` or `{ error }`; `suggestFormat(text, current)` returns the other format only when current fails and other parses:

```ts
import { parseContent, suggestFormat } from './parse';

describe('parseContent (success)', () => {
  it('json', () => expect(parseContent('{"x":1}', 'json')).toEqual({ value: { x: 1 } }));
  it('yaml', () => expect(parseContent('x: 1', 'yaml')).toEqual({ value: { x: 1 } }));
});

describe('parseContent (failure)', () => {
  it('bad json reports error', () => {
    const r = parseContent('{x:1', 'json');
    expect(r.value).toBeUndefined();
    expect(typeof r.error).toBe('string');
  });
  it('multi-doc yaml rejected', () => {
    const r = parseContent('a: 1\n---\nb: 2', 'yaml');
    expect(r.error).toContain('single document');
  });
});

describe('suggestFormat', () => {
  it('suggests yaml when json fails but yaml parses', () => {
    expect(suggestFormat('x: 1', 'json')).toBe('yaml');
  });
  it('no suggestion when current parses', () => {
    expect(suggestFormat('{"x":1}', 'json')).toBeNull();
  });
  it('no suggestion when neither parses', () => {
    expect(suggestFormat('{x:', 'json')).toBeNull();
  });
});
```

**Step 2: Run, verify fail.**

**Step 3: Implement** (`parse.ts`):

```ts
import { load, loadAll } from 'js-yaml';

export type Format = 'json' | 'yaml';
export interface ParseOk { value: unknown; error?: undefined; }
export interface ParseErr { value?: undefined; error: string; }
export type ParseResult = ParseOk | ParseErr;

function parseYaml(text: string): ParseResult {
  const docs: unknown[] = [];
  loadAll(text, (d) => docs.push(d));
  if (docs.length > 1) return { error: 'YAML: single document only' };
  return { value: docs.length === 0 ? undefined : load(text) };
}

export function parseContent(text: string, format: Format): ParseResult {
  try {
    if (format === 'json') return { value: JSON.parse(text) };
    return parseYaml(text);
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export function suggestFormat(text: string, current: Format): Format | null {
  if (!('error' in parseContent(text, current)) || parseContent(text, current).error === undefined) return null;
  const other: Format = current === 'json' ? 'yaml' : 'json';
  return parseContent(text, other).error === undefined ? other : null;
}
```

(Simplify the `suggestFormat` guard during implementation; intent: suggest only when current fails and other succeeds.)

**Step 4: Run, verify pass.**

**Step 5: Commit** `feat(parse): json/yaml parsing and format suggestion`.

---

## Task 9: Diff state service

**Files:**
- Create: `src/app/diff-state.service.ts`
- Test: `src/app/diff-state.service.spec.ts`

**Step 1: Failing test** — service holds left/right parsed values as signals; exposes `merged` and `result` computed; recomputes on change. Diff suppressed if either side has no value.

```ts
import { TestBed } from '@angular/core/testing';
import { DiffStateService } from './diff-state.service';

describe('DiffStateService (diff present)', () => {
  it('computes entries and merged tree', () => {
    const svc = TestBed.inject(DiffStateService);
    svc.setLeft({ age: 30 });
    svc.setRight({ age: 31 });
    expect(svc.result().entries.length).toBe(1);
    expect(svc.merged()[0].status).toBe('changed');
  });
});

describe('DiffStateService (suppressed)', () => {
  it('no diff when a side is undefined', () => {
    const svc = TestBed.inject(DiffStateService);
    svc.setLeft({ age: 30 });
    svc.setRight(undefined);
    expect(svc.result().entries.length).toBe(0);
    expect(svc.merged().length).toBe(0);
  });
});
```

**Step 2: Run, verify fail.**

**Step 3: Implement** with signals/computed wrapping `diff()` and `mergeTree()`; when either value is `undefined`, return empty result + empty merged.

**Step 4: Run, verify pass.**

**Step 5: Commit** `feat: diff state service over both parsed models`.

---

## Task 10: Monaco wrapper component

**Files:**
- Create: `src/app/monaco-editor.component.ts`

**Step 1:** Implement a standalone component: input `value`, `language` ('json'|'yaml'); output `valueChange` (debounced 300ms). Loads Monaco from `/assets/monaco/vs`. No unit test (DOM/3rd-party heavy) — verified in Chrome later. Note this exemption in the commit body.

**Step 2:** Build passes:

```bash
npm run build
```

**Step 3: Commit** `feat(ui): monaco editor wrapper component`.

---

## Task 11: JsonTreeView component (merged-tree rendering)

**Files:**
- Create: `src/app/json-tree-view.component.ts`
- Test: `src/app/json-tree-view.component.spec.ts`

**Step 1: Failing test** — given `MergedNode[]` and `side`, renders the side's cell value; applies the status CSS class; renders a blank filler when the side's cell is absent.

```ts
// renders left cell value for a changed node; right side of an 'added' node shows value,
// left side of an 'added' node shows filler (empty). Assert text content + class list.
```

**Step 2: Run, verify fail.**

**Step 3: Implement** recursive standalone component. Input `nodes: MergedNode[]`, `side: 'left'|'right'`, `expanded` shared `Set`. Row = `key : value` with status class (`diff-changed`/`diff-added`/`diff-removed`/none). Absent cell → render an empty row of matching height (filler). Expand caret for `hasChildren`.

**Step 4: Run, verify pass.**

**Step 5: Commit** `feat(ui): merged-tree view with diff highlights`.

---

## Task 12: PanelToolbar + EditorPanel

**Files:**
- Create: `src/app/panel-toolbar.component.ts`
- Create: `src/app/editor-panel.component.ts`

**Step 1:** PanelToolbar — text/tree toggle, json/yaml toggle, dismissible suggest-hint bar (driven by `suggestFormat`). Light spec asserting toggle emits.

**Step 2:** EditorPanel — owns `rawText`, `format`, `viewMode` signals; parses on input (debounced); pushes parsed value to `DiffStateService` (left or right by `@Input side`); shows Monaco in text mode, JsonTreeView in tree mode; error placeholder on parse error.

**Step 3:** Build + existing tests pass.

**Step 4: Commit** `feat(ui): editor panel and toolbar`.

---

## Task 13: DiffControls + AppComponent wiring

**Files:**
- Create: `src/app/diff-controls.component.ts`
- Modify: `src/app/app.component.ts`, `.html`, `.scss`

**Step 1:** DiffControls — shows `result().entries.length` differences; ▲▼ navigation that scrolls the current entry's path into view in both trees (shared current-index signal). Light spec on counter text.

**Step 2:** AppComponent — left EditorPanel, DiffControls, right EditorPanel, side-by-side layout. Provide `DiffStateService` at root.

**Step 3:** Build + tests pass:

```bash
npm run build && npm test -- --watch=false
```

**Step 4: Commit** `feat(ui): diff controls and app layout`.

---

## Task 14: Chrome e2e verification

**Step 1:** Serve:

```bash
npm start
```

(Run in background; note the localhost port.)

**Step 2:** In Chrome, drive the app and reproduce the design scenario:
- left text mode: `{"name":"alice","age":30,"tags":["a","b"],"addr":{"city":"NY","zip":"100"}}`
- right text mode: `{"name":"alicia","age":31,"tags":["a","c","d"],"addr":{"city":"NY"}}`
- switch both to tree mode.

**Step 3:** Confirm (screenshot each):
- "5 differences" counter.
- amber on `name`, `age`, `tags[1]`.
- green on `tags[2]` (added, right side; left filler row).
- red on `addr/zip` (removed, left side; right filler row).
- aligned rows (filler keeps levels).
- ▲▼ navigation cycles the 5 diffs.
- JSON⇄YAML toggle re-parses correctly.
- paste YAML (`name: alice`) into a JSON panel → suggest-hint appears.

**Step 4:** Use superpowers:verification-before-completion — record evidence (screenshots, counts) before claiming done.

**Step 5: Commit** any fixes found during verification.

---

## Done criteria

- [ ] Diff engine unit tests green (scalars, objects, arrays, nested, null-vs-missing, key-order, merge alignment).
- [ ] Parser + suggest tests green.
- [ ] `npm run build` clean.
- [ ] Chrome scenario reproduced with screenshot evidence.
- [ ] All commits signed, on `feat/json-yaml-semantic-diff`.
