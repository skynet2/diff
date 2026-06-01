import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'app-diff-controls',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="label">
      {{ count() === 0 ? 'No differences' : count() + ' differences' }}
    </div>
    @if (count() > 0) {
      <div class="position">{{ position() }} / {{ count() }}</div>
      <div class="nav">
        <button
          type="button"
          class="nav-btn"
          data-testid="prev"
          [disabled]="count() === 0"
          (click)="prev.emit()"
          aria-label="Previous difference"
        >▲</button>
        <button
          type="button"
          class="nav-btn"
          data-testid="next"
          [disabled]="count() === 0"
          (click)="next.emit()"
          aria-label="Next difference"
        >▼</button>
      </div>
    }

    <label class="hide-same" data-testid="hide-same">
      <input
        type="checkbox"
        [checked]="hideSame()"
        (change)="hideSameChange.emit($any($event.target).checked)"
      />
      <span>Hide same</span>
    </label>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 10px 8px;
        background: #252526;
        border-inline: 1px solid #3a3a3a;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
        color: #d4d4d4;
        user-select: none;
      }
      .label {
        font-weight: 600;
        text-align: center;
      }
      .position {
        color: #9a9a9a;
      }
      .nav {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .nav-btn {
        width: 26px;
        height: 26px;
        border: 1px solid #3a3a3a;
        border-radius: 4px;
        background: #333336;
        cursor: pointer;
        font-size: 12px;
        line-height: 1;
        color: #d4d4d4;
      }
      .nav-btn:hover:not(:disabled) {
        background: #45454a;
      }
      .nav-btn:disabled {
        opacity: 0.4;
        cursor: default;
      }
      .hide-same {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 4px;
        cursor: pointer;
        text-align: center;
        line-height: 1.2;
      }
      .hide-same input {
        cursor: pointer;
        margin: 0;
      }
    `,
  ],
})
export class DiffControlsComponent {
  readonly count = input.required<number>();
  readonly position = input.required<number>();
  readonly hideSame = input<boolean>(false);
  readonly prev = output<void>();
  readonly next = output<void>();
  readonly hideSameChange = output<boolean>();
}
