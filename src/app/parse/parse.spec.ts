import { parseContent, suggestFormat } from './parse';

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
});
