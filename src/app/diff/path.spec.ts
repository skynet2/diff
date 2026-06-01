import { pathKey, toJsonPath } from './path';

describe('toJsonPath (success)', () => {
  const cases: { name: string; path: (string | number)[]; want: string }[] = [
    { name: 'root', path: [], want: '$' },
    { name: 'single key', path: ['addr'], want: '$.addr' },
    { name: 'nested keys', path: ['addr', 'zip'], want: '$.addr.zip' },
    { name: 'array index', path: ['tags', 2], want: '$.tags[2]' },
    { name: 'non-identifier key uses bracket', path: ['a-b'], want: '$["a-b"]' },
    { name: 'mixed', path: ['items', 0, 'first name'], want: '$.items[0]["first name"]' },
  ];
  cases.forEach(({ name, path, want }) =>
    it(name, () => expect(toJsonPath(path)).toBe(want)),
  );
});

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
