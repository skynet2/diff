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
