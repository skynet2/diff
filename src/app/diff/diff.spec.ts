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
