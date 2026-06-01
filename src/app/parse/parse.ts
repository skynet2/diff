import { load, loadAll, dump } from 'js-yaml';

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

export function serialize(value: unknown, format: Format): string {
  return format === 'json' ? JSON.stringify(value, null, 2) : dump(value);
}

export function suggestFormat(text: string, current: Format): Format | null {
  if (text.trim() === '') return null;
  if (isOk(parseContent(text, current))) return null;
  const other: Format = current === 'json' ? 'yaml' : 'json';
  return isOk(parseContent(text, other)) ? other : null;
}
