# diff

A minimal, two-panel **semantic diff** editor for **JSON, YAML, and XML**, built with Angular.

**Live:** https://skynet2.github.io/diff/

## What it does

- **Two editors side by side**, each independently switchable between **Text** (Monaco) and **Tree** view.
- **Per-panel format**: JSON ⇄ YAML ⇄ XML. The two sides can even use different formats — the diff compares the parsed data, not the text.
- **Semantic diff** in tree mode: differences are computed structurally (key/path based, order-independent for object keys), then rendered as aligned rows with colour highlights — amber = changed, green = added, red = removed.
- **Navigation**: a difference counter with ▲▼ to jump between changes.
- **Hide same**: collapse the tree to only the differences.
- **Format**: pretty-print both documents.
- **Path on click**: click a node (tree) or place the cursor in the text — the status bar shows its path, e.g. `$.user.tags[1]` or `$.catalog.book[0]["@_id"]`.
- **Dark theme**, lockstep scrolling between panels, and a content-based "looks like YAML/XML — switch?" hint.

## How it works

The diff engine is pure and framework-free: each format is parsed into a plain JavaScript value (JSON natively, YAML via `js-yaml`, XML via `fast-xml-parser`), and a single structural diff/merge compares the two values. The UI is Angular standalone components with signals; Monaco powers text editing; cursor→path resolution uses `jsonc-parser` (JSON), `yaml` (YAML), and `@xml-tools` (XML).

## Development

```bash
npm install
npm start                   # dev server at http://localhost:4200/
npm test -- --watch=false   # unit tests (Vitest)
npm run build               # production build -> dist/diff-app/browser
```

## License

MIT
