import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { type Format } from './parse/parse';

@Component({
  selector: 'app-panel-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UpperCasePipe],
  template: `
    <div class="toolbar">
      <div class="group">
        <button
          type="button"
          data-test="view-text"
          [class.active]="viewMode() === 'text'"
          (click)="viewModeChange.emit('text')"
        >Text</button>
        <button
          type="button"
          data-test="view-tree"
          [class.active]="viewMode() === 'tree'"
          (click)="viewModeChange.emit('tree')"
        >Tree</button>
      </div>

      <div class="group">
        <button
          type="button"
          data-test="format-json"
          [class.active]="format() === 'json'"
          (click)="formatChange.emit('json')"
        >JSON</button>
        <button
          type="button"
          data-test="format-yaml"
          [class.active]="format() === 'yaml'"
          (click)="formatChange.emit('yaml')"
        >YAML</button>
        <button
          type="button"
          data-test="format-xml"
          [class.active]="format() === 'xml'"
          (click)="formatChange.emit('xml')"
        >XML</button>
      </div>

      @if (suggestion(); as s) {
        <div class="hint" data-test="suggestion">
          <span>Looks like {{ s | uppercase }} — switch?</span>
          <button
            type="button"
            class="switch"
            data-test="suggestion-switch"
            (click)="acceptSuggestion.emit()"
          >Switch</button>
          <button
            type="button"
            class="dismiss"
            data-test="suggestion-dismiss"
            aria-label="Dismiss"
            (click)="dismissSuggestion.emit()"
          >×</button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 6px;
        background: #252526;
        border-bottom: 1px solid #3a3a3a;
        font-size: 12px;
      }
      .group {
        display: inline-flex;
        border: 1px solid #3a3a3a;
        border-radius: 4px;
        overflow: hidden;
      }
      .group button {
        border: 0;
        background: #333336;
        padding: 2px 10px;
        cursor: pointer;
        font: inherit;
        color: #d4d4d4;
      }
      .group button + button {
        border-left: 1px solid #3a3a3a;
      }
      .group button.active {
        background: #0e639c;
        color: #fff;
      }
      .hint {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
        padding: 2px 6px;
        background: #3a3320;
        border: 1px solid #5c4d1a;
        border-radius: 4px;
        color: #e0c87a;
      }
      .hint .switch {
        border: 0;
        background: #0e639c;
        color: #fff;
        border-radius: 3px;
        padding: 1px 8px;
        cursor: pointer;
        font: inherit;
      }
      .hint .dismiss {
        border: 0;
        background: transparent;
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        color: #e0c87a;
        padding: 0 2px;
      }
    `,
  ],
})
export class PanelToolbarComponent {
  readonly viewMode = input.required<'text' | 'tree'>();
  readonly format = input.required<Format>();
  readonly suggestion = input.required<Format | null>();

  readonly viewModeChange = output<'text' | 'tree'>();
  readonly formatChange = output<Format>();
  readonly acceptSuggestion = output<void>();
  readonly dismissSuggestion = output<void>();
}
