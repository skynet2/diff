# JSON/YAML Semantic Diff — Design

**Date:** 2026-06-01
**Status:** Validated design, pre-implementation

A minimal two-panel JSON/YAML editor with semantic (structural) diff, inspired by
jsoneditoronline.org but stripped to the essentials: two editors, view-mode
switching, and a tree-mode semantic diff. No open/save/copy/transform/table.

## Scope

In scope:
- Two editor panels, left + right.
- Per panel: **text mode** (Monaco) and **tree mode** (custom renderer). No table mode.
- Per panel: manual **JSON ⇄ YAML** format toggle (diff is format-agnostic — left
  JSON vs right YAML works).
- **Semantic diff** computed on parsed values, rendered inline in tree mode with
  aligned rows (filler-row alignment) and color highlights.
- Diff counter + ▲▼ navigation between differences.
- Suggest-only format hint when content parses better as the other format.

Out of scope (YAGNI): table mode, open/save/load, copy left↔right, transform
(filter/sort/project), object/array creation helpers, persistence, backend,
multi-document YAML, accounts.

## Decisions (locked)

| # | Decision | Choice |
|---|----------|--------|
| Q1 | Diff meaning | **Structural / semantic** — compare parsed values by path, ignore formatting & key order |
| Q2 | View modes | **text + tree** only (no table) |
| Q3 | Format selection | **Per-panel** JSON⇄YAML toggle |
| Q4 | Text editor | **Monaco** (text mode only; its built-in DiffEditor is NOT used) |
| Q5 | Auto format-detect | **Suggest-only** — dismissible hint, never auto-flips |
| Q6 | Array diff | **Positional / index-based** |
| Align | Tree diff layout | **Aligned (filler rows)** via a merged tree |

## Architecture

Single-direction data flow, no backend, in-memory only.

```
raw text (Monaco)  ──parse──►  JS value (model)  ──merge+diff──►  merged tree
     ▲ format toggle               │                                 │
     └── manual JSON/YAML          └── DiffService(left, right) ──────┘
                                        (pure, format-agnostic)
```

Each panel owns signals: `rawText`, `format` (json|yaml), `parsed`
(value | parseError), `viewMode` (text|tree).

### Component tree

```
AppComponent
├── EditorPanelComponent  (×2, left + right)
│   ├── PanelToolbar       (text/tree toggle, json/yaml toggle, format hint)
│   ├── MonacoEditor       (text mode)
│   └── JsonTreeView       (tree mode — recursive, renders merged node cells)
└── DiffControls           (center: "N differences", ▲▼ nav)
```

### Services (root-injected signals)

- **DiffService** — pure. Given left value + right value, produces a `DiffResult`
  (flat entry list + `byPath` map) and a `MergedNode[]` aligned tree. No Angular
  deps.
- **DiffStateService** — holds both panels' parsed values as signals; a
  `computed()` re-runs DiffService whenever either side changes. Editor input is
  debounced ~300ms upstream.

Diff is a `computed()` over both parsed models — editing either side recomputes
and re-highlights automatically.

## Diff engine

Pure recursive function over two parsed JS values.

```
diff(left, right, path):
  type(left) ≠ type(right) (incl. array vs object) → CHANGED (whole node)
  both scalars:   equal ? nothing : CHANGED {leftVal, rightVal}
  both objects:   for key in union(leftKeys, rightKeys):   // order-independent
                     left-only  → REMOVED
                     right-only → ADDED
                     both       → recurse(path + key)
  both arrays:    for i in 0..max(lenL, lenR):             // positional
                     i ≥ lenL → ADDED ; i ≥ lenR → REMOVED ; else recurse(path + i)
```

### Output

```ts
type DiffType = 'added' | 'removed' | 'changed';

interface DiffEntry {
  path: (string | number)[];
  type: DiffType;
  leftVal?: unknown;
  rightVal?: unknown;
}

interface DiffResult {
  entries: DiffEntry[];          // document order; drives counter + nav
  byPath: Map<string, DiffType>; // "addr/zip" → 'changed'; O(1) per node
}
```

### Rules

- Object key order ignored (true semantic).
- Type mismatch (`30` number vs `"30"` string) → CHANGED.
- `null` vs missing key → REMOVED/ADDED, not CHANGED.
- Nested container change → recurse and mark only **leaf** diffs; parent carries a
  subtle "contains-changes" marker for collapsed state.
- Counter = `entries.length`. ▲▼ walks `entries` in order, scrolls the path into
  view in both trees.

## Merged tree (aligned rendering)

Tree mode renders a single merged structure, not two independent trees.

```ts
interface MergedNode {
  key: string | number;
  status: 'same' | 'changed' | 'added' | 'removed';
  left?:  { value: unknown; hasChildren: boolean };  // absent → blank filler on left
  right?: { value: unknown; hasChildren: boolean };  // absent → blank filler on right
  children?: MergedNode[];                             // union order, recursive
}
```

Both panels render the **same** `MergedNode[]`; the left panel reads `.left`, the
right reads `.right`. A missing cell renders an empty row of equal height → rows
stay level. Expand/collapse state is shared across both sides.

Consequence: in **tree mode** the two panels are synced views of one merged diff
(matches the site). In **text mode** they remain fully independent Monaco editors.

### Highlight colors

- `changed` → amber (both sides, the differing leaf)
- `added` → green (side that has it)
- `removed` → red (side that has it)

## Text mode, format toggle, hints

- **Monaco:** one instance per panel, `language` = `json|yaml` from the toggle.
  `onDidChangeModelContent` → debounce 300ms → parse → update `parsed` signal.
  Parse error → Monaco markers (squiggly + message).
- **Format toggle:** manual JSON⇄YAML. Re-parses the same raw text with the other
  parser and swaps Monaco's language. No text auto-conversion — toggling just
  reinterprets.
- **Suggest-only hint:** on parse failure, try the other format; if it parses,
  show a dismissible bar ("Looks like YAML — switch?"). Click sets the toggle.
  Never automatic.
- **Parsers:** native `JSON.parse`; `js-yaml` `load`/`dump` for YAML.

## Error handling

- Parse failure → panel holds `{ error, line, col }` instead of a value. Tree mode
  renders an error placeholder; diff suppressed; DiffControls shows "left/right
  side invalid".
- Empty panel → empty / no diff, not an error.
- YAML: single document only. Multi-doc `---` → error "single document only".

## Testing

- **Diff engine (primary coverage, unit, pure, no Angular):** table-driven,
  success and edge cases in separate tables — scalars equal/changed, type
  mismatch, object add/remove/recurse, array positional add/remove/change,
  nested leaf-only marking, null-vs-missing, key-order independence, merged-tree
  filler placement.
- **Parsers / format-detect (unit):** JSON↔YAML round-trip, suggest-hint
  heuristic (invalid JSON that is valid YAML → suggests).
- **Components (light):** tree renders correct left/right cell, highlight class
  from status.
- Runner: Angular default (Karma/Jasmine or Jest — match the scaffold).

## Verification (Chrome, manual e2e)

After `ng serve`, drive the real app in Chrome and reproduce the jsoneditoronline
scenario:

- left `{"name":"alice","age":30,"tags":["a","b"],"addr":{"city":"NY","zip":"100"}}`
- right `{"name":"alicia","age":31,"tags":["a","c","d"],"addr":{"city":"NY"}}`

Confirm with screenshots: 5 differences; amber on name/age/tags[1]; green on
tags[2] (added); red on addr/zip (removed); aligned filler rows; ▲▼ navigation;
JSON⇄YAML toggle; suggest-hint on a YAML paste into a JSON panel.
