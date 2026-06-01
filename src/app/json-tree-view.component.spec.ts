import { TestBed } from '@angular/core/testing';
import { JsonTreeViewComponent, filterVisible } from './json-tree-view.component';
import { MergedNode } from './diff/diff.types';

describe('filterVisible', () => {
  const nodes: MergedNode[] = [
    { key: 'a', status: 'same', left: { value: 1, hasChildren: false }, right: { value: 1, hasChildren: false } },
    { key: 'b', status: 'changed', left: { value: 1, hasChildren: false }, right: { value: 2, hasChildren: false } },
    { key: 'c', status: 'added', right: { value: 3, hasChildren: false } },
  ];

  it('returns all nodes when hideSame is false', () => {
    expect(filterVisible(nodes, false)).toBe(nodes);
  });

  it('drops same nodes when hideSame is true', () => {
    expect(filterVisible(nodes, true).map((n) => n.key)).toEqual(['b', 'c']);
  });
});

function render(nodes: MergedNode[], side: 'left' | 'right'): HTMLElement {
  const fixture = TestBed.createComponent(JsonTreeViewComponent);
  fixture.componentRef.setInput('nodes', nodes);
  fixture.componentRef.setInput('side', side);
  fixture.componentRef.setInput('expanded', new Set<string>());
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('JsonTreeViewComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JsonTreeViewComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const el = render([], 'left');
    expect(el).toBeTruthy();
  });

  describe('rendering (success)', () => {
    it('renders a changed scalar left value with diff-changed class', () => {
      const nodes: MergedNode[] = [
        {
          key: 'name',
          status: 'changed',
          left: { value: 'alice', hasChildren: false },
          right: { value: 'bob', hasChildren: false },
        },
      ];
      const el = render(nodes, 'left');
      const row = el.querySelector('.row');
      expect(row?.classList.contains('diff-changed')).toBe(true);
      expect(el.textContent).toContain('alice');
      expect(el.textContent).not.toContain('bob');
    });

    it('added node on left renders a filler, on right renders value with diff-added', () => {
      const nodes: MergedNode[] = [
        {
          key: 'age',
          status: 'added',
          right: { value: 30, hasChildren: false },
        },
      ];

      const left = render(nodes, 'left');
      const leftRow = left.querySelector('.row');
      expect(leftRow?.classList.contains('filler')).toBe(true);
      expect(left.textContent).not.toContain('30');

      const right = render(nodes, 'right');
      const rightRow = right.querySelector('.row');
      expect(rightRow?.classList.contains('diff-added')).toBe(true);
      expect(rightRow?.classList.contains('filler')).toBe(false);
      expect(right.textContent).toContain('30');
    });

    it('removed node on right renders a filler, on left renders value with diff-removed', () => {
      const nodes: MergedNode[] = [
        {
          key: 'legacy',
          status: 'removed',
          left: { value: 'old', hasChildren: false },
        },
      ];

      const right = render(nodes, 'right');
      const rightRow = right.querySelector('.row');
      expect(rightRow?.classList.contains('filler')).toBe(true);
      expect(right.textContent).not.toContain('old');

      const left = render(nodes, 'left');
      const leftRow = left.querySelector('.row');
      expect(leftRow?.classList.contains('diff-removed')).toBe(true);
      expect(left.textContent).toContain('old');
    });
  });
});
