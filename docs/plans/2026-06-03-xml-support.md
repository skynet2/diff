# XML Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add XML as a third document format (alongside JSON and YAML) — parse, serialize/format, semantic diff, and text-mode cursor→path.

**Architecture:** XML is converted to a plain JS object (fast-xml-parser, "simplified object-like" model) so the existing diff/merge engine works unchanged. Serialization back to XML uses fast-xml-parser's `XMLBuilder`. Text-mode cursor→path uses a position-aware XML AST (`@xml-tools/parser` + `@xml-tools/ast`) whose path output mirrors the object key conventions. The `Format` union grows from `'json'|'yaml'` to `'json'|'yaml'|'xml'`, threaded through the parser, the Monaco language input, and the toolbar.

**Tech Stack:** Angular 21, Vitest, fast-xml-parser, @xml-tools/parser, @xml-tools/ast.

**Design reference:** `docs/plans/2026-06-01-json-yaml-semantic-diff-design.md`.

---

## Conventions (LOCKED — both the parser and the path resolver MUST agree)

These fast-xml-parser options are the single source of truth. The text-mode path resolver (Task 6) replicates them exactly so tree-mode and text-mode produce identical paths.

```ts
const XML_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  commentPropName: '#comment',
  cdataPropName: '#cdata',
  preserveOrder: false,        // user chose simplified object-like
  parseAttributeValue: false,  // keep attrs as strings (stable diff)
  parseTagValue: false,        // keep text as strings
  trimValues: true,
  removeNSPrefix: false,       // preserve namespace prefixes as-is
  ignoreDeclaration: false,    // keep <?xml ...?> best-effort
  ignorePiTags: false,         // keep processing instructions best-effort
};
```

**Key conventions that the path resolver must mirror:**
- Attribute `id` → object key `@_id`. Path segment: `@_id`.
- Text content → key `#text`, **except** when an element has no attributes, no sub-elements, and a single text run: fast-xml-parser collapses it to the element's scalar value, so the text maps to the **element's own path** (no `#text` segment). This collapse rule is the one subtlety the resolver handles (Task 6).
- A child tag name that appears **2+ times** under the same parent becomes an **array**; its path segment is `name[k]` (k = 0-based position among same-named siblings). A tag appearing once is a plain key `name`.
- Comments → `#comment` (array if repeated). CDATA → `#cdata`.
- Namespace prefixes are kept verbatim: `ns:tag` stays `ns:tag`; `xmlns:ns` attr stays `@_xmlns:ns`.

---

## Conventions for tasks

- TDD: red → green → commit. Use superpowers:test-driven-development.
- Pure logic stays under `src/app/parse/` and `src/app/diff/` with **zero Angular imports**.
- Tests: bare globals (`describe`/`it`/`expect`), match `src/app/parse/parse.spec.ts`. Run with `npm test -- --watch=false`.
- Commits signed (`-S`). Branch: `main` (current). Dev server runs with `--no-hmr` (full reload on change).
- The diff engine, merge tree, DiffStateService, and tree view need **no changes** — XML enters the system as a parsed JS value, exactly like JSON/YAML.

---

## Task 1: Install dependencies

**Step 1:** Install:

```bash
npm install fast-xml-parser @xml-tools/parser @xml-tools/ast
```

**Step 2:** Verify build still passes:

```bash
npm run build
```

Expected: success.

**Step 3: Commit**

```bash
git add package.json package-lock.json && git commit -S -m "chore: add xml parser deps"
```

---

## Task 2: Parse XML → object

**Files:**
- Modify: `src/app/parse/parse.ts`
- Test: `src/app/parse/parse.spec.ts`

**Step 1: Write failing tests** (append to `parse.spec.ts`):

```ts
describe('parseContent xml (success)', () => {
  it('elements and text', () => {
    expect(parseContent('<a><b>hi</b></a>', 'xml')).toEqual({ value: { a: { b: 'hi' } } });
  });
  it('attributes use @_ prefix', () => {
    expect(parseContent('<a id="1">hi</a>', 'xml')).toEqual({
      value: { a: { '@_id': '1', '#text': 'hi' } },
    });
  });
  it('repeated tags become arrays', () => {
    expect(parseContent('<r><i>a</i><i>b</i></r>', 'xml')).toEqual({
      value: { r: { i: ['a', 'b'] } },
    });
  });
});

describe('parseContent xml (failure)', () => {
  it('malformed xml reports error', () => {
    const r = parseContent('<a><b></a>', 'xml');
    expect(r.value).toBeUndefined();
    expect(typeof r.error).toBe('string');
  });
});
```

**Step 2: Run, verify fail.**

**Step 3: Implement** — in `parse.ts`:

```ts
import { XMLParser, XMLValidator } from 'fast-xml-parser';

export type Format = 'json' | 'yaml' | 'xml';

const XML_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  commentPropName: '#comment',
  cdataPropName: '#cdata',
  preserveOrder: false,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  removeNSPrefix: false,
};

function parseXml(text: string): ParseResult {
  const valid = XMLValidator.validate(text, { allowBooleanAttributes: true });
  if (valid !== true) {
    return { error: 'XML: ' + valid.err.msg + ' (line ' + valid.err.line + ')' };
  }
  return { value: new XMLParser(XML_OPTIONS).parse(text) };
}
```

Then add an `xml` branch to `parseContent`:

```ts
export function parseContent(text: string, format: Format): ParseResult {
  try {
    if (format === 'json') return { value: JSON.parse(text) };
    if (format === 'xml') return parseXml(text);
    return parseYaml(text);
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
```

**Step 4: Run, verify pass.**

**Step 5: Commit** `feat(parse): parse XML into object model`.

---

## Task 3: Serialize object → XML (Format button)

**Files:** Modify `src/app/parse/parse.ts`; extend `parse.spec.ts`.

**Step 1: Failing tests:**

```ts
describe('serialize xml', () => {
  it('round-trips elements and attributes', () => {
    const value = { a: { '@_id': '1', b: 'hi' } };
    const xml = serialize(value, 'xml');
    expect(parseContent(xml, 'xml')).toEqual({ value });
  });
});
```

**Step 2: Run, verify fail.**

**Step 3: Implement** — add `XMLBuilder` and an `xml` branch to `serialize`:

```ts
import { XMLBuilder } from 'fast-xml-parser';

export function serialize(value: unknown, format: Format): string {
  if (format === 'json') return JSON.stringify(value, null, 2);
  if (format === 'xml') {
    return new XMLBuilder({ ...XML_OPTIONS, format: true, indentBy: '  ' }).build(value);
  }
  return dump(value);
}
```

**Step 4: Run, verify pass.**

**Step 5: Commit** `feat(parse): serialize object model back to XML`.

---

## Task 4: Format suggestion includes XML

**Files:** Modify `src/app/parse/parse.ts`; extend `parse.spec.ts`.

**Step 1: Failing tests:**

```ts
describe('suggestFormat with xml', () => {
  it('suggests xml when current fails but xml parses', () => {
    expect(suggestFormat('<a>1</a>', 'json')).toBe('xml');
  });
  it('no suggestion when current (xml) parses', () => {
    expect(suggestFormat('<a>1</a>', 'xml')).toBeNull();
  });
});
```

**Step 2: Run, verify fail.**

**Step 3: Implement** — generalize `suggestFormat` to try the other two formats in a fixed order and return the first that parses:

```ts
export function suggestFormat(text: string, current: Format): Format | null {
  if (text.trim() === '') return null;
  if (isOk(parseContent(text, current))) return null;
  const order: Format[] = ['json', 'yaml', 'xml'];
  for (const other of order) {
    if (other !== current && isOk(parseContent(text, other))) return other;
  }
  return null;
}
```

Note: `'<a>1</a>'` is not valid JSON nor valid YAML-as-a-mapping, so `xml` is the first that parses. Keep the `['json','yaml','xml']` order so JSON wins ties (it's the strictest).

**Step 4: Run, verify pass.**

**Step 5: Commit** `feat(parse): include xml in format suggestion`.

---

## Task 5: Thread `'xml'` through the format type + toolbar + Monaco

**Files:**
- Modify: `src/app/monaco-editor.component.ts` (the `language` input type)
- Modify: `src/app/editor-panel.component.ts` (the `format` signal type, `onFormat` param type)
- Modify: `src/app/panel-toolbar.component.ts` (add an XML toggle button; widen `format` input + `formatChange` output types)

**Step 1: Monaco** — change the language input type to accept `'xml'` (Monaco has a built-in `xml` language, no extra setup):

```ts
readonly language = input<'json' | 'yaml' | 'xml'>('json');
```

**Step 2: EditorPanel** — widen the signal and handler types:

```ts
protected readonly format = signal<'json' | 'yaml' | 'xml'>('json');
onFormat(format: 'json' | 'yaml' | 'xml'): void { ... }
```

(The `suggestion` computed and `reparse`/`reformat` already call `parseContent`/`serialize`/`suggestFormat`, which now accept `'xml'`.)

**Step 3: PanelToolbar** — widen types and add a third button next to JSON/YAML:

```ts
readonly format = input.required<'json' | 'yaml' | 'xml'>();
readonly formatChange = output<'json' | 'yaml' | 'xml'>();
```

In the template, after the YAML button, add:

```html
<button
  type="button"
  data-test="format-xml"
  [class.active]="format() === 'xml'"
  (click)="formatChange.emit('xml')"
>XML</button>
```

**Step 4:** Verify build + existing tests:

```bash
npm run build && npm test -- --watch=false
```

Expected: green (the toolbar's light spec still passes; add a one-line spec asserting clicking XML emits `formatChange('xml')` if convenient).

**Step 5: Commit** `feat(ui): add XML to the per-panel format toggle`.

---

## Task 6: XML text-mode path resolver

**Files:**
- Create: `src/app/parse/xml-path.ts`
- Test: `src/app/parse/xml-path.spec.ts`

This resolves a character offset in XML text to the same path the diff tree uses. It walks the `@xml-tools` AST and applies the LOCKED conventions.

**Step 1: Failing tests** (`xml-path.spec.ts`):

```ts
import { xmlPathAtOffset } from './xml-path';

describe('xmlPathAtOffset (success)', () => {
  const xml = '<r>\n  <user id="1">\n    <name>alice</name>\n  </user>\n  <item>a</item>\n  <item>b</item>\n</r>';

  it('text of a simple element collapses to the element path', () => {
    const offset = xml.indexOf('alice') + 1;
    expect(xmlPathAtOffset(xml, offset)).toEqual(['r', 'user', 'name']);
  });

  it('attribute resolves to @_ key', () => {
    const offset = xml.indexOf('id="1"') + 1;
    expect(xmlPathAtOffset(xml, offset)).toEqual(['r', 'user', '@_id']);
  });

  it('repeated element gets an array index', () => {
    const offset = xml.indexOf('<item>b') + 4;
    expect(xmlPathAtOffset(xml, offset)).toEqual(['r', 'item', 1]);
  });

  it('returns null outside any element', () => {
    expect(xmlPathAtOffset('<r></r>', 0)).toBeNull();
  });
});
```

**Step 2: Run, verify fail.**

**Step 3: Implement** (`xml-path.ts`). Build the AST, descend to the deepest element whose position contains the offset, accumulating the path; apply the array-index and `@_`/`#text`/collapse rules.

```ts
import { parse } from '@xml-tools/parser';
import { buildAst, XMLElement, XMLDocument } from '@xml-tools/ast';

function contains(pos: { startOffset: number; endOffset: number } | undefined, offset: number): boolean {
  return !!pos && offset >= pos.startOffset && offset <= pos.endOffset + 1;
}

function indexAmongSiblings(parent: XMLElement, el: XMLElement): number | null {
  const same = parent.subElements.filter((s) => s.name === el.name);
  if (same.length < 2) return null;
  return same.indexOf(el);
}

function isCollapsedTextElement(el: XMLElement): boolean {
  // fast-xml-parser collapses <b>text</b> (no attrs, no sub-elements) to a scalar
  return el.attributes.length === 0 && el.subElements.length === 0;
}

export function xmlPathAtOffset(text: string, offset: number): (string | number)[] | null {
  let doc: XMLDocument;
  try {
    const { cst, tokenVector } = parse(text);
    doc = buildAst(cst, tokenVector);
  } catch {
    return null;
  }
  let el = doc.rootElement;
  if (!el || !contains(el.position, offset)) return null;

  const path: (string | number)[] = [];
  let parent: XMLElement | null = null;

  while (el) {
    let segment: (string | number)[] = [el.name as string];
    if (parent) {
      const idx = indexAmongSiblings(parent, el);
      segment = idx === null ? [el.name as string] : [el.name as string, idx];
    }
    path.push(...segment);

    // attribute hit?
    const attr = el.attributes.find((a) => contains(a.position, offset));
    if (attr && attr.key) {
      path.push('@_' + attr.key);
      return path;
    }

    // descend into a child element if the offset is inside one
    const child = el.subElements.find((c) => contains(c.position, offset));
    if (child) {
      parent = el;
      el = child;
      continue;
    }

    // offset is in this element's own content (text)
    if (!isCollapsedTextElement(el)) {
      path.push('#text');
    }
    return path;
  }
  return path.length ? path : null;
}
```

Notes for the implementer:
- `@xml-tools/ast` node positions are `{ startOffset, endOffset, ... }`; `endOffset` is inclusive, hence the `+ 1` in `contains`.
- If the `@xml-tools` AST API differs slightly (property names), inspect a parsed sample in a scratch test and adjust — the algorithm (descend by range, count same-named siblings, map attrs/text) is the contract; keep the tests green.
- Root with attributes/text behaves the same — the loop handles it.

**Step 4: Run, verify pass.** Iterate the `contains`/position handling until all four tests pass.

**Step 5: Commit** `feat(parse): XML cursor-to-path resolver`.

---

## Task 7: Hook XML into `pathAtOffset`

**Files:** Modify `src/app/parse/parse.ts`; extend `parse.spec.ts`.

**Step 1: Failing test:**

```ts
it('xml: returns the path at a nested value', () => {
  const xml = '<r><user><name>alice</name></user></r>';
  const offset = xml.indexOf('alice') + 1;
  expect(pathAtOffset(xml, 'xml', offset)).toEqual(['r', 'user', 'name']);
});
```

**Step 2: Run, verify fail.**

**Step 3: Implement** — add the `xml` branch to `pathAtOffset`:

```ts
import { xmlPathAtOffset } from './xml-path';

export function pathAtOffset(text: string, format: Format, offset: number): (string | number)[] | null {
  if (format === 'json') {
    const path = getLocation(text, offset).path;
    return path.length > 0 ? path : null;
  }
  if (format === 'xml') {
    return xmlPathAtOffset(text, offset);
  }
  return yamlPathAtOffset(text, offset);
}
```

(`editor-panel.onCaret` already calls `pathAtOffset(e.text, this.format(), e.offset)` and emits `selectPath` — no UI change needed.)

**Step 4: Run, verify pass.**

**Step 5: Commit** `feat(parse): wire XML into text-mode path`.

---

## Task 8: Chrome verification

**Step 1:** Ensure the dev server is running (`npm start -- --no-hmr --live-reload`); note `http://localhost:4200/`.

**Step 2:** In Chrome, drive the app:
- Left panel: switch format to **XML**, set:
  `<catalog><book id="1"><title>A</title></book><book id="2"><title>B</title></book></catalog>`
- Right panel: switch to **XML**, set the same but change `B` → `C` and add `id="3"` on the second book.

**Step 3:** Confirm (screenshots):
- Tree mode shows the XML object: `catalog → book[0], book[1]`, attributes as `@_id`, titles; amber on the changed title, etc.
- Diff counter + ▲▼ navigation work.
- **Format** button pretty-prints both XML documents.
- **Text mode**, click inside a value (e.g. a `<title>` text or an `id` attribute) → status bar shows the JSONPath (e.g. `$.catalog.book[1].title` or `$.catalog.book[0]["@_id"]`).
- **Suggest hint**: paste XML into a panel set to JSON → "Looks like XML — switch?" appears.

**Step 4:** Use superpowers:verification-before-completion — record evidence before claiming done.

**Step 5:** Commit any fixes found.

---

## Done criteria

- [ ] XML parse/serialize/suggest unit tests green.
- [ ] XML cursor→path resolver tests green (element text, attribute, array index, collapse rule).
- [ ] `npm run build` clean; full suite green.
- [ ] Chrome: XML diff in tree mode, Format button, text-mode path, suggest hint — all verified with screenshots.
- [ ] No changes were needed to the diff/merge engine (XML enters as a parsed JS value).
- [ ] All commits signed, on `main`.

## Known tradeoffs (accepted)

- **Simplified object-like model**: element order among differently-named siblings is not preserved; reordering repeated elements shows as positional changes; round-trip via Format normalizes formatting. (User-chosen over the order-preserving model.)
- **PI/DOCTYPE**: preserved best-effort by fast-xml-parser; exotic constructs may normalize. Flag in `log`/docs if a fixture is dropped.
