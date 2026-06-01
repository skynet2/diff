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
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 10px 8px;
        background: #f5f5f7;
        border-inline: 1px solid #d0d0d6;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
        color: #333;
        user-select: none;
      }
      .label {
        font-weight: 600;
        text-align: center;
      }
      .position {
        color: #666;
      }
      .nav {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .nav-btn {
        width: 26px;
        height: 26px;
        border: 1px solid #c0c0c6;
        border-radius: 4px;
        background: #fff;
        cursor: pointer;
        font-size: 12px;
        line-height: 1;
        color: #333;
      }
      .nav-btn:hover:not(:disabled) {
        background: #e8e8ee;
      }
      .nav-btn:disabled {
        opacity: 0.4;
        cursor: default;
      }
    `,
  ],
})
export class DiffControlsComponent {
  readonly count = input.required<number>();
  readonly position = input.required<number>();
  readonly prev = output<void>();
  readonly next = output<void>();
}
