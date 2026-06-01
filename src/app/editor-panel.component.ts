import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MonacoEditorComponent } from './monaco-editor.component';
import { JsonTreeViewComponent } from './json-tree-view.component';
import { PanelToolbarComponent } from './panel-toolbar.component';
import { DiffStateService } from './diff-state.service';
import { parseContent, suggestFormat } from './parse/parse';

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

    <div class="body">
      @if (viewMode() === 'text') {
        <app-monaco-editor
          [value]="rawText()"
          [language]="format()"
          (valueChange)="onText($event)"
        />
      } @else {
        @if (error()) {
          <div class="parse-error">{{ error() }}</div>
        } @else {
          <app-json-tree-view
            [nodes]="svc.merged()"
            [side]="side()"
            [expanded]="expanded()"
            (toggle)="toggleExpand.emit($event)"
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
      }
      .body {
        flex: 1;
        min-height: 0;
        overflow: auto;
      }
      .parse-error {
        padding: 8px 10px;
        color: #842029;
        background: #f8d7da;
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
  readonly toggleExpand = output<string>();

  protected readonly svc = inject(DiffStateService);

  protected readonly rawText = signal('');
  protected readonly format = signal<'json' | 'yaml'>('json');
  protected readonly viewMode = signal<'text' | 'tree'>('text');
  protected readonly dismissed = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly suggestion = computed(() =>
    this.dismissed() ? null : suggestFormat(this.rawText(), this.format()),
  );

  onText(text: string): void {
    this.rawText.set(text);
    this.dismissed.set(false);
    this.reparse();
  }

  onFormat(format: 'json' | 'yaml'): void {
    this.format.set(format);
    this.reparse();
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
