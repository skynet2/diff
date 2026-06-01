export type DiffType = 'added' | 'removed' | 'changed';

export interface DiffEntry {
  path: (string | number)[];
  type: DiffType;
  leftVal?: unknown;
  rightVal?: unknown;
}

export interface DiffResult {
  entries: DiffEntry[];
  byPath: Map<string, DiffType>;
}

export type NodeStatus = 'same' | 'changed' | 'added' | 'removed';

export interface MergedCell {
  value: unknown;
  hasChildren: boolean;
}

export interface MergedNode {
  key: string | number;
  status: NodeStatus;
  left?: MergedCell;
  right?: MergedCell;
  children?: MergedNode[];
}
