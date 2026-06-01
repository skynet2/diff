import { parseContent, pathAtOffset, suggestFormat } from './parse';

describe('pathAtOffset', () => {
  const json = '{\n  "user": {\n    "name": "alice"\n  },\n  "age": 30\n}';

  it('returns the path at a nested value offset', () => {
    const offset = json.indexOf('alice') + 1;
    expect(pathAtOffset(json, 'json', offset)).toEqual(['user', 'name']);
  });

  it('returns the path at a top-level value offset', () => {
    const offset = json.indexOf('30') + 1;
    expect(pathAtOffset(json, 'json', offset)).toEqual(['age']);
  });

  it('returns null at the root', () => {
    expect(pathAtOffset(json, 'json', 0)).toBeNull();
  });

  it('returns null for yaml (unsupported in text mode)', () => {
    expect(pathAtOffset('a: 1', 'yaml', 2)).toBeNull();
  });
});

describe('parseContent (success)', () => {
  it('json', () => expect(parseContent('{"x":1}', 'json')).toEqual({ value: { x: 1 } }));
  it('yaml', () => expect(parseContent('x: 1', 'yaml')).toEqual({ value: { x: 1 } }));
});

describe('parseContent (failure)', () => {
  it('bad json reports error', () => {
    const r = parseContent('{x:1', 'json');
    expect(r.value).toBeUndefined();
    expect(typeof r.error).toBe('string');
  });
  it('multi-doc yaml rejected', () => {
    const r = parseContent('a: 1\n---\nb: 2', 'yaml');
    expect(r.error).toContain('single document');
  });
});

describe('suggestFormat', () => {
  it('suggests yaml when json fails but yaml parses', () => {
    expect(suggestFormat('x: 1', 'json')).toBe('yaml');
  });
  it('no suggestion when current parses', () => {
    expect(suggestFormat('{"x":1}', 'json')).toBeNull();
  });
  it('no suggestion when neither parses', () => {
    expect(suggestFormat('{x:', 'json')).toBeNull();
  });
  it('no suggestion for empty content', () => {
    expect(suggestFormat('', 'json')).toBeNull();
  });
  it('no suggestion for whitespace-only content', () => {
    expect(suggestFormat('   \n  ', 'json')).toBeNull();
  });
});
