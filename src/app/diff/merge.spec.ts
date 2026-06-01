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
});
