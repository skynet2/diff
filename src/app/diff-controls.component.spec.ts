import { TestBed } from '@angular/core/testing';
import { DiffControlsComponent } from './diff-controls.component';

describe('DiffControlsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiffControlsComponent],
    }).compileComponents();
  });

  it('renders the difference count', async () => {
    const fixture = TestBed.createComponent(DiffControlsComponent);
    fixture.componentRef.setInput('count', 5);
    fixture.componentRef.setInput('position', 1);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('5 differences');
    expect(text).toContain('1 / 5');
  });

  it('renders no differences when count is zero', async () => {
    const fixture = TestBed.createComponent(DiffControlsComponent);
    fixture.componentRef.setInput('count', 0);
    fixture.componentRef.setInput('position', 0);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No differences');
  });

  it('emits next when the down button is clicked', async () => {
    const fixture = TestBed.createComponent(DiffControlsComponent);
    fixture.componentRef.setInput('count', 5);
    fixture.componentRef.setInput('position', 1);
    await fixture.whenStable();
    const emitted: void[] = [];
    fixture.componentInstance.next.subscribe(() => emitted.push(undefined));
    const next = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="next"]',
    ) as HTMLButtonElement;
    next.click();
    expect(emitted.length).toBe(1);
  });

  it('emits prev when the up button is clicked', async () => {
    const fixture = TestBed.createComponent(DiffControlsComponent);
    fixture.componentRef.setInput('count', 5);
    fixture.componentRef.setInput('position', 2);
    await fixture.whenStable();
    const emitted: void[] = [];
    fixture.componentInstance.prev.subscribe(() => emitted.push(undefined));
    const prev = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="prev"]',
    ) as HTMLButtonElement;
    prev.click();
    expect(emitted.length).toBe(1);
  });
});
