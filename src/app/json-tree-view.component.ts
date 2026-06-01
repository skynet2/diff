import { Component, input, output } from '@angular/core';
import { MergedCell, MergedNode, NodeStatus } from './diff/diff.types';
import { pathKey } from './diff/path';

const STATUS_CLASS: Record<NodeStatus, string> = {
  same: '',
  changed: 'diff-changed',
  added: 'diff-added',
  removed: 'diff-removed',
};

@Component({
  selector: 'app-json-tree-view',
  standalone: true,
  imports: [JsonTreeViewComponent],
  template: `
    @for (node of nodes(); track node.key) {
      @let cell = cellOf(node);
      @if (cell === undefined) {
        <div class="row filler"></div>
      } @else {
        @let key = pathKeyOf(node);
        @let open = expanded().has(key);
        <div class="row" [class]="statusClass(node)">
          @if (cell.hasChildren) {
            <button
              type="button"
              class="caret"
              (click)="toggle.emit(key)"
              [attr.aria-expanded]="open"
            >{{ open ? '▾' : '▸' }}</button>
          } @else {
            <span class="caret-spacer"></span>
          }
          <span class="key">{{ node.key }}</span>
          <span class="value">{{ format(cell) }}</span>
        </div>
        @if (cell.hasChildren && open && node.children) {
          <div class="children">
            <app-json-tree-view
              [nodes]="node.children"
              [side]="side()"
              [expanded]="expanded()"
              [path]="childPath(node)"
              (toggle)="toggle.emit($event)"
            />
          </div>
        }
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 13px;
        line-height: 1.4;
      }
      .row {
        display: flex;
        align-items: center;
        height: 22px;
        box-sizing: border-box;
        padding: 0 4px;
        white-space: nowrap;
      }
      .row.filler {
        background: transparent;
      }
      .diff-changed {
        background: #fff3cd;
      }
      .diff-added {
        background: #d4edda;
      }
      .diff-removed {
        background: #f8d7da;
      }
      .caret,
      .caret-spacer {
        width: 14px;
        flex: 0 0 14px;
        text-align: center;
      }
      .caret {
        border: 0;
        background: transparent;
        cursor: pointer;
        padding: 0;
        font: inherit;
        color: #555;
      }
      .key {
        color: #905;
        margin-right: 6px;
      }
      .key::after {
        content: ':';
        color: #888;
      }
      .value {
        color: #07a;
      }
      .children {
        padding-left: 14px;
      }
    `,
  ],
})
export class JsonTreeViewComponent {
  readonly nodes = input.required<MergedNode[]>();
  readonly side = input.required<'left' | 'right'>();
  readonly expanded = input.required<Set<string>>();
  readonly path = input<(string | number)[]>([]);

  readonly toggle = output<string>();

  cellOf(node: MergedNode): MergedCell | undefined {
    return this.side() === 'left' ? node.left : node.right;
  }

  pathKeyOf(node: MergedNode): string {
    return pathKey([...this.path(), node.key]);
  }

  childPath(node: MergedNode): (string | number)[] {
    return [...this.path(), node.key];
  }

  statusClass(node: MergedNode): string {
    return STATUS_CLASS[node.status];
  }

  format(cell: MergedCell): string {
    if (cell.hasChildren) {
      const isArray = Array.isArray(cell.value);
      const empty =
        (isArray && (cell.value as unknown[]).length === 0) ||
        (!isArray && Object.keys(cell.value as object).length === 0);
      if (isArray) {
        return empty ? '[]' : '[…]';
      }
      return empty ? '{}' : '{…}';
    }
    if (cell.value === null) {
      return 'null';
    }
    return String(cell.value);
  }
}
