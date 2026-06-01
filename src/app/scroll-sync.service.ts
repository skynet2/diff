import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ScrollSyncService {
  readonly top = signal(0);
  readonly left = signal(0);

  report(top: number, left: number): void {
    this.top.set(top);
    this.left.set(left);
  }
}
