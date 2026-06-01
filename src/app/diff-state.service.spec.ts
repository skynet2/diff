import { TestBed } from '@angular/core/testing';
import { DiffStateService } from './diff-state.service';

describe('DiffStateService (diff present)', () => {
  it('computes entries and merged tree', () => {
    const svc = TestBed.inject(DiffStateService);
    svc.setLeft({ age: 30 });
    svc.setRight({ age: 31 });
    expect(svc.result().entries.length).toBe(1);
    expect(svc.merged()[0].status).toBe('changed');
  });
});

describe('DiffStateService (suppressed)', () => {
  it('no diff when a side is undefined', () => {
    const svc = TestBed.inject(DiffStateService);
    svc.setLeft({ age: 30 });
    svc.setRight(undefined);
    expect(svc.result().entries.length).toBe(0);
    expect(svc.merged().length).toBe(0);
  });
});
