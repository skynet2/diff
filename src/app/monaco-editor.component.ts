import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import * as monaco from 'monaco-editor';

interface MonacoEnvironment {
  getWorker(workerId: string, label: string): Worker;
}

function ensureMonacoEnvironment(): void {
  const globalScope = globalThis as typeof globalThis & {
    MonacoEnvironment?: MonacoEnvironment;
  };
  if (globalScope.MonacoEnvironment) {
    return;
  }
  const stubWorkerUrl = URL.createObjectURL(
    new Blob(['self.onmessage=function(){};'], { type: 'text/javascript' }),
  );
  globalScope.MonacoEnvironment = {
    getWorker(): Worker {
      return new Worker(stubWorkerUrl);
    },
  };
}

@Component({
  selector: 'app-monaco-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class MonacoEditorComponent implements OnDestroy {
  readonly value = input<string>('');
  readonly language = input<'json' | 'yaml'>('json');
  readonly valueChange = output<string>();

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private editor?: monaco.editor.IStandaloneCodeEditor;
  private debounceTimer?: ReturnType<typeof setTimeout>;
  private suppressEmit = false;

  constructor() {
    ensureMonacoEnvironment();

    this.editor = monaco.editor.create(this.host, {
      value: this.value(),
      language: this.language(),
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 13,
      tabSize: 2,
    });

    this.editor.onDidChangeModelContent(() => this.onContentChanged());

    effect(() => {
      const language = this.language();
      const model = this.editor?.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
      }
    });

    effect(() => {
      const incoming = this.value();
      if (!this.editor || incoming === this.editor.getValue()) {
        return;
      }
      this.suppressEmit = true;
      this.editor.setValue(incoming);
      this.suppressEmit = false;
    });
  }

  ngOnDestroy(): void {
    if (this.debounceTimer !== undefined) {
      clearTimeout(this.debounceTimer);
    }
    this.editor?.dispose();
  }

  private onContentChanged(): void {
    if (this.suppressEmit) {
      return;
    }
    if (this.debounceTimer !== undefined) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      const current = this.editor?.getValue() ?? '';
      this.valueChange.emit(current);
    }, 300);
  }
}
