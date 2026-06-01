import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MonacoEditorComponent } from './monaco-editor.component';
import { JsonTreeViewComponent } from './json-tree-view.component';
import { PanelToolbarComponent } from './panel-toolbar.component';
import { DiffStateService } from './diff-state.service';
import { ScrollSyncService } from './scroll-sync.service';
import { parseContent, serialize, suggestFormat } from './parse/parse';

@Component({
  selector: 'app-editor-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MonacoEditorComponent, JsonTreeViewComponent, PanelToolbarComponent],
  template: `
    <app-panel-toolbar
      [viewMode]="viewMode()"
      [format]="format()"
      [suggestion]="suggestion()"
      (viewModeChange)="viewMode.set($event)"
      (formatChange)="onFormat($event)"
      (acceptSuggestion)="onFormat(suggestion() ?? format())"
      (dismissSuggestion)="dismissed.set(true)"
    />

    <div #body class="body" (scroll)="onBodyScroll()">
      @if (viewMode() === 'text') {
        <app-monaco-editor
          [value]="rawText()"
          [language]="format()"
          (valueChange)="onText($event)"
          (scrolled)="onMonacoScroll($event)"
        />
      } @else {
        @if (error()) {
          <div class="parse-error">{{ error() }}</div>
        } @else {
          <app-json-tree-view
            [nodes]="svc.merged()"
            [side]="side()"
            [expanded]="expanded()"
            [hideSame]="hideSame()"
            [selected]="selected()"
            (toggle)="toggleExpand.emit($event)"
            (select)="select.emit($event)"
          />
        }
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #1e1e1e;
      }
      .body {
        flex: 1;
        min-height: 0;
        overflow: auto;
      }
      .parse-error {
        padding: 8px 10px;
        color: #f48771;
        background: #3a1d1d;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
        white-space: pre-wrap;
      }
    `,
  ],
})
export class EditorPanelComponent {
  readonly side = input.required<'left' | 'right'>();
  readonly expanded = input.required<Set<string>>();
  readonly hideSame = input<boolean>(false);
  readonly selected = input<string>('');
  readonly toggleExpand = output<string>();
  readonly select = output<(string | number)[]>();

  protected readonly svc = inject(DiffStateService);
  private readonly scroll = inject(ScrollSyncService);

  private readonly bodyRef = viewChild<ElementRef<HTMLElement>>('body');
  private readonly monacoCmp = viewChild(MonacoEditorComponent);
  private applying = false;

  protected readonly rawText = signal('');
  protected readonly format = signal<'json' | 'yaml'>('json');
  protected readonly viewMode = signal<'text' | 'tree'>('text');
  protected readonly dismissed = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly suggestion = computed(() =>
    this.dismissed() ? null : suggestFormat(this.rawText(), this.format()),
  );

  constructor() {
    effect(() => {
      const top = this.scroll.top();
      const left = this.scroll.left();
      this.applyScroll(top, left);
    });
  }

  onText(text: string): void {
    this.rawText.set(text);
    this.dismissed.set(false);
    this.reparse();
  }

  onFormat(format: 'json' | 'yaml'): void {
    this.format.set(format);
    this.reparse();
  }

  reformat(): void {
    if (this.rawText().trim() === '') {
      return;
    }
    const r = parseContent(this.rawText(), this.format());
    if (r.error !== undefined) {
      return;
    }
    this.rawText.set(serialize(r.value, this.format()));
    this.reparse();
  }

  onBodyScroll(): void {
    if (this.applying) {
      return;
    }
    const el = this.bodyRef()?.nativeElement;
    if (el) {
      this.scroll.report(el.scrollTop, el.scrollLeft);
    }
  }

  onMonacoScroll(e: { top: number; left: number }): void {
    if (this.applying) {
      return;
    }
    this.scroll.report(e.top, e.left);
  }

  private applyScroll(top: number, left: number): void {
    this.applying = true;
    if (this.viewMode() === 'text') {
      this.monacoCmp()?.setScroll(top, left);
    } else {
      const el = this.bodyRef()?.nativeElement;
      if (el) {
        el.scrollTop = top;
        el.scrollLeft = left;
      }
    }
    setTimeout(() => {
      this.applying = false;
    }, 0);
  }

  private push(value: unknown): void {
    if (this.side() === 'left') {
      this.svc.setLeft(value);
    } else {
      this.svc.setRight(value);
    }
  }

  private reparse(): void {
    if (this.rawText().trim() === '') {
      this.error.set(null);
      this.push(undefined);
      return;
    }
    const r = parseContent(this.rawText(), this.format());
    if (r.error === undefined) {
      this.error.set(null);
      this.push(r.value);
      return;
    }
    this.error.set(r.error);
    this.push(undefined);
  }
}
