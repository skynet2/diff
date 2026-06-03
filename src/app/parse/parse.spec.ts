import { parseContent, pathAtOffset, serialize, suggestFormat } from './parse';

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

  const yaml = 'user:\n  name: alice\n  tags:\n    - a\n    - b\nage: 30\n';

  it('yaml: returns the path at a nested value', () => {
    const offset = yaml.indexOf('alice') + 1;
    expect(pathAtOffset(yaml, 'yaml', offset)).toEqual(['user', 'name']);
  });

  it('yaml: returns the path at an array element', () => {
    const offset = yaml.indexOf('- b') + 2;
    expect(pathAtOffset(yaml, 'yaml', offset)).toEqual(['user', 'tags', 1]);
  });

  it('yaml: returns the path at a top-level value', () => {
    const offset = yaml.indexOf('30') + 1;
    expect(pathAtOffset(yaml, 'yaml', offset)).toEqual(['age']);
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

describe('parseContent xml (success)', () => {
  it('elements and text', () => {
    expect(parseContent('<a><b>hi</b></a>', 'xml')).toEqual({ value: { a: { b: 'hi' } } });
  });
  it('attributes use @_ prefix', () => {
    expect(parseContent('<a id="1">hi</a>', 'xml')).toEqual({
      value: { a: { '@_id': '1', '#text': 'hi' } },
    });
  });
  it('repeated tags become arrays', () => {
    expect(parseContent('<r><i>a</i><i>b</i></r>', 'xml')).toEqual({
      value: { r: { i: ['a', 'b'] } },
    });
  });
});

describe('parseContent xml (failure)', () => {
  it('malformed xml reports error', () => {
    const r = parseContent('<a><b></a>', 'xml');
    expect(r.value).toBeUndefined();
    expect(typeof r.error).toBe('string');
  });
});

describe('serialize xml', () => {
  it('round-trips elements and attributes', () => {
    const value = { a: { '@_id': '1', b: 'hi' } };
    const xml = serialize(value, 'xml');
    expect(parseContent(xml, 'xml')).toEqual({ value });
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

describe('suggestFormat with xml', () => {
  it('suggests xml when current fails but xml parses', () => {
    expect(suggestFormat('<a>1</a>', 'json')).toBe('xml');
  });
  it('no suggestion when current (xml) parses', () => {
    expect(suggestFormat('<a>1</a>', 'xml')).toBeNull();
  });
});
