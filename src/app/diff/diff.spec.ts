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
