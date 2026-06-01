export function pathKey(path: (string | number)[]): string {
  return path.map((p) => String(p).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
}

export function toJsonPath(path: (string | number)[]): string {
  if (path.length === 0) {
    return '$';
  }
  return (
    '$' +
    path
      .map((seg) => {
        if (typeof seg === 'number') {
          return '[' + seg + ']';
        }
        return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(seg) ? '.' + seg : '[' + JSON.stringify(seg) + ']';
      })
      .join('')
  );
}
