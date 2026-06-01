export function pathKey(path: (string | number)[]): string {
  return path.map((p) => String(p).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
}
