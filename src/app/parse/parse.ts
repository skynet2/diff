import { load, loadAll, dump } from 'js-yaml';
import { getLocation } from 'jsonc-parser';
import { parseDocument, isMap, isSeq, isScalar } from 'yaml';

export type Format = 'json' | 'yaml';
export interface ParseOk { value: unknown; error?: undefined; }
export interface ParseErr { value?: undefined; error: string; }
export type ParseResult = ParseOk | ParseErr;

function isOk(r: ParseResult): r is ParseOk {
  return r.error === undefined;
}

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

interface RangedNode {
  range?: [number, number, number];
  value?: unknown;
}

function spanOf(node: RangedNode | null | undefined): [number, number] | null {
  if (!node || !node.range) {
    return null;
  }
  return [node.range[0], node.range[2] ?? node.range[1]];
}

function yamlPathAtOffset(text: string, offset: number): (string | number)[] | null {
  let node: unknown;
  try {
    node = parseDocument(text).contents;
  } catch {
    return null;
  }
  const path: (string | number)[] = [];
  while (node) {
    if (isMap(node)) {
      const pair = node.items.find((p) => {
        const start = spanOf(p.key as RangedNode)?.[0] ?? spanOf(p.value as RangedNode)?.[0];
        const end = spanOf(p.value as RangedNode)?.[1] ?? spanOf(p.key as RangedNode)?.[1];
        return start != null && end != null && offset >= start && offset <= end;
      });
      if (!pair) {
        break;
      }
      path.push(isScalar(pair.key) ? (pair.key.value as string | number) : String(pair.key));
      node = pair.value;
    } else if (isSeq(node)) {
      const index = node.items.findIndex((item) => {
        const span = spanOf(item as RangedNode);
        return span != null && offset >= span[0] && offset <= span[1];
      });
      if (index < 0) {
        break;
      }
      path.push(index);
      node = node.items[index];
    } else {
      break;
    }
  }
  return path.length > 0 ? path : null;
}

export function pathAtOffset(
  text: string,
  format: Format,
  offset: number,
): (string | number)[] | null {
  if (format === 'json') {
    const path = getLocation(text, offset).path;
    return path.length > 0 ? path : null;
  }
  return yamlPathAtOffset(text, offset);
}

export function serialize(value: unknown, format: Format): string {
  return format === 'json' ? JSON.stringify(value, null, 2) : dump(value);
}

export function suggestFormat(text: string, current: Format): Format | null {
  if (text.trim() === '') return null;
  if (isOk(parseContent(text, current))) return null;
  const other: Format = current === 'json' ? 'yaml' : 'json';
  return isOk(parseContent(text, other)) ? other : null;
}
