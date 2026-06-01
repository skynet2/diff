import { Component, computed, inject, signal } from '@angular/core';
import { EditorPanelComponent } from './editor-panel.component';
import { DiffControlsComponent } from './diff-controls.component';
import { DiffStateService } from './diff-state.service';
import { pathKey } from './diff/path';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [EditorPanelComponent, DiffControlsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly svc = inject(DiffStateService);

  protected readonly expanded = signal<Set<string>>(new Set());
  protected readonly currentIndex = signal(0);

  protected readonly count = computed(() => this.svc.result().entries.length);
  protected readonly position = computed(() =>
    this.count() === 0 ? 0 : this.currentIndex() + 1,
  );

  onToggleExpand(key: string): void {
    const s = new Set(this.expanded());
    if (s.has(key)) {
      s.delete(key);
    } else {
      s.add(key);
    }
    this.expanded.set(s);
  }

  next(): void {
    const n = this.count();
    if (n === 0) {
      return;
    }
    this.currentIndex.set((this.currentIndex() + 1) % n);
    this.revealCurrent();
  }

  prev(): void {
    const n = this.count();
    if (n === 0) {
      return;
    }
    this.currentIndex.set((this.currentIndex() - 1 + n) % n);
    this.revealCurrent();
  }

  private revealCurrent(): void {
    const entries = this.svc.result().entries;
    if (entries.length === 0) {
      return;
    }
    const index = Math.min(this.currentIndex(), entries.length - 1);
    const path = entries[index].path;

    const s = new Set(this.expanded());
    for (let i = 1; i < path.length; i++) {
      s.add(pathKey(path.slice(0, i)));
    }
    this.expanded.set(s);

    const target = pathKey(path);
    setTimeout(() => {
      document
        ?.querySelector('[data-pathkey="' + CSS.escape(target) + '"]')
        ?.scrollIntoView({ block: 'center' });
    }, 0);
  }
}
