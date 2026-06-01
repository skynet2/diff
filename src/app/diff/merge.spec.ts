import { mergeTree } from './merge';
import { MergedNode } from './diff.types';

describe('mergeTree (success)', () => {
  it('changed scalar field', () => {
    const nodes = mergeTree({ age: 30 }, { age: 31 });
    expect(nodes).toEqual<MergedNode[]>([
      { key: 'age', status: 'changed',
        left: { value: 30, hasChildren: false },
        right: { value: 31, hasChildren: false } },
    ]);
  });

  it('added key has no left cell', () => {
    const nodes = mergeTree({}, { y: 1 });
    expect(nodes).toEqual<MergedNode[]>([
      { key: 'y', status: 'added', right: { value: 1, hasChildren: false } },
    ]);
  });

  it('removed key has no right cell', () => {
    const nodes = mergeTree({ y: 1 }, {});
    expect(nodes).toEqual<MergedNode[]>([
      { key: 'y', status: 'removed', left: { value: 1, hasChildren: false } },
    ]);
  });

  it('nested object recurses with both cells as containers', () => {
    const nodes = mergeTree({ addr: { zip: '1' } }, { addr: { zip: '2' } });
    expect(nodes[0].key).toBe('addr');
    expect(nodes[0].status).toBe('changed');
    expect(nodes[0].left).toEqual({ value: { zip: '1' }, hasChildren: true });
    expect(nodes[0].children).toEqual<MergedNode[]>([
      { key: 'zip', status: 'changed',
        left: { value: '1', hasChildren: false },
        right: { value: '2', hasChildren: false } },
    ]);
  });

  it('no difference yields same status with both cells', () => {
    const nodes = mergeTree({ x: 1 }, { x: 1 });
    expect(nodes).toEqual<MergedNode[]>([
      { key: 'x', status: 'same',
        left: { value: 1, hasChildren: false },
        right: { value: 1, hasChildren: false } },
    ]);
  });

  it('NaN vs NaN is same', () => {
    expect(mergeTree({ s: NaN }, { s: NaN })[0].status).toBe('same');
  });

  it('added container builds one-sided children for expansion', () => {
    const nodes = mergeTree({}, { addr: { city: 'NY' } });
    expect(nodes[0].key).toBe('addr');
    expect(nodes[0].status).toBe('added');
    expect(nodes[0].left).toBeUndefined();
    expect(nodes[0].right).toEqual({ value: { city: 'NY' }, hasChildren: true });
    expect(nodes[0].children).toEqual<MergedNode[]>([
      { key: 'city', status: 'added', right: { value: 'NY', hasChildren: false } },
    ]);
  });

  it('removed container builds one-sided children for expansion', () => {
    const nodes = mergeTree({ tags: ['a', 'b'] }, {});
    expect(nodes[0].status).toBe('removed');
    expect(nodes[0].right).toBeUndefined();
    expect(nodes[0].children).toEqual<MergedNode[]>([
      { key: 0, status: 'removed', left: { value: 'a', hasChildren: false } },
      { key: 1, status: 'removed', left: { value: 'b', hasChildren: false } },
    ]);
  });

  it('added container recurses into nested containers', () => {
    const nodes = mergeTree({}, { a: { b: { c: 1 } } });
    const child = nodes[0].children![0];
    expect(child.key).toBe('b');
    expect(child.status).toBe('added');
    expect(child.children).toEqual<MergedNode[]>([
      { key: 'c', status: 'added', right: { value: 1, hasChildren: false } },
    ]);
  });
});
