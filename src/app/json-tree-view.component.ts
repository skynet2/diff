import { Component, input, output } from '@angular/core';
import { MergedCell, MergedNode, NodeStatus } from './diff/diff.types';
import { pathKey } from './diff/path';

const STATUS_CLASS: Record<NodeStatus, string> = {
  same: '',
  changed: 'diff-changed',
  added: 'diff-added',
  removed: 'diff-removed',
};

export function filterVisible(nodes: MergedNode[], hideSame: boolean): MergedNode[] {
  return hideSame ? nodes.filter((n) => n.status !== 'same') : nodes;
}

@Component({
  selector: 'app-json-tree-view',
  standalone: true,
  imports: [JsonTreeViewComponent],
  template: `
    @for (node of displayNodes(); track node.key) {
      @let cell = cellOf(node);
      @if (cell === undefined) {
        <div class="row filler"></div>
      } @else {
        @let key = pathKeyOf(node);
        @let open = expanded().has(key);
        <div
          class="row"
          [class]="statusClass(node)"
          [class.selected]="key === selected()"
          [attr.data-pathkey]="key"
          (click)="select.emit(childPath(node))"
        >
          @if (cell.hasChildren) {
            <button
              type="button"
              class="caret"
              (click)="toggle.emit(key); $event.stopPropagation()"
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
              [hideSame]="hideSame()"
              [selected]="selected()"
              [path]="childPath(node)"
              (toggle)="toggle.emit($event)"
              (select)="select.emit($event)"
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
        cursor: pointer;
      }
      .row.selected {
        outline: 1px solid #569cd6;
        outline-offset: -1px;
      }
      .row.filler {
        background: transparent;
      }
      .diff-changed {
        background: rgba(255, 213, 0, 0.16);
      }
      .diff-added {
        background: rgba(63, 185, 80, 0.2);
      }
      .diff-removed {
        background: rgba(248, 81, 73, 0.2);
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
        color: #999;
      }
      .key {
        color: #c586c0;
        margin-right: 6px;
      }
      .key::after {
        content: ':';
        color: #808080;
      }
      .value {
        color: #9cdcfe;
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
  readonly hideSame = input<boolean>(false);
  readonly selected = input<string>('');
  readonly path = input<(string | number)[]>([]);

  readonly toggle = output<string>();
  readonly select = output<(string | number)[]>();

  displayNodes(): MergedNode[] {
    return filterVisible(this.nodes(), this.hideSame());
  }

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
