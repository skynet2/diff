import { Injectable, signal, computed } from '@angular/core';
import { diff } from './diff/diff';
import { mergeTree } from './diff/merge';
import { DiffResult, MergedNode } from './diff/diff.types';

@Injectable({ providedIn: 'root' })
export class DiffStateService {
  private readonly left = signal<unknown>(undefined);
  private readonly right = signal<unknown>(undefined);

  readonly result = computed<DiffResult>(() => {
    const l = this.left();
    const r = this.right();
    if (l === undefined || r === undefined) return { entries: [], byPath: new Map() };
    return diff(l, r);
  });

  readonly merged = computed<MergedNode[]>(() => {
    const l = this.left();
    const r = this.right();
    if (l === undefined || r === undefined) return [];
    return mergeTree(l, r);
  });

  setLeft(value: unknown): void {
    this.left.set(value);
  }

  setRight(value: unknown): void {
    this.right.set(value);
  }
}
