import { TestBed } from '@angular/core/testing';
import { PanelToolbarComponent } from './panel-toolbar.component';

describe('PanelToolbarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelToolbarComponent],
    }).compileComponents();
  });

  it('emits viewModeChange("tree") when tree button clicked', async () => {
    const fixture = TestBed.createComponent(PanelToolbarComponent);
    fixture.componentRef.setInput('viewMode', 'text');
    fixture.componentRef.setInput('format', 'json');
    fixture.componentRef.setInput('suggestion', null);
    await fixture.whenStable();

    const emitted: ('text' | 'tree')[] = [];
    fixture.componentInstance.viewModeChange.subscribe((v) => emitted.push(v));

    const el = fixture.nativeElement as HTMLElement;
    const treeBtn = el.querySelector<HTMLButtonElement>('[data-test="view-tree"]')!;
    treeBtn.click();

    expect(emitted).toEqual(['tree']);
  });

  it('shows YAML hint and emits acceptSuggestion on switch', async () => {
    const fixture = TestBed.createComponent(PanelToolbarComponent);
    fixture.componentRef.setInput('viewMode', 'text');
    fixture.componentRef.setInput('format', 'json');
    fixture.componentRef.setInput('suggestion', 'yaml');
    await fixture.whenStable();

    const accepted: number[] = [];
    fixture.componentInstance.acceptSuggestion.subscribe(() => accepted.push(1));

    const el = fixture.nativeElement as HTMLElement;
    const hint = el.querySelector<HTMLElement>('[data-test="suggestion"]')!;
    expect(hint.textContent).toContain('YAML');

    const switchBtn = el.querySelector<HTMLButtonElement>('[data-test="suggestion-switch"]')!;
    switchBtn.click();

    expect(accepted).toEqual([1]);
  });
});
