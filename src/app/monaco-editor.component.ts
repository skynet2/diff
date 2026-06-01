import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  OnDestroy,
  OnInit,
  effect,
  inject,
  input,
  output,
} from '@angular/core';

const MONACO_BASE = '/assets/monaco/vs';

type MonacoApi = typeof import('monaco-editor');

interface MonacoWindow {
  monaco?: MonacoApi;
  require?: {
    (modules: string[], onLoad: () => void): void;
    config(options: { paths: Record<string, string> }): void;
  };
}

let monacoPromise: Promise<MonacoApi> | undefined;

function loadMonaco(): Promise<MonacoApi> {
  if (monacoPromise) {
    return monacoPromise;
  }
  monacoPromise = new Promise<MonacoApi>((resolve, reject) => {
    const w = window as unknown as MonacoWindow;
    if (w.monaco) {
      resolve(w.monaco);
      return;
    }

    const onLoaderReady = (): void => {
      const req = (window as unknown as MonacoWindow).require;
      if (!req) {
        reject(new Error('Monaco AMD loader did not expose require'));
        return;
      }
      req.config({ paths: { vs: MONACO_BASE } });
      req(['vs/editor/editor.main'], () => {
        const loaded = (window as unknown as MonacoWindow).monaco;
        if (loaded) {
          resolve(loaded);
        } else {
          reject(new Error('Monaco failed to initialize'));
        }
      });
    };

    const existing = document.getElementById('monaco-amd-loader');
    if (existing) {
      existing.addEventListener('load', onLoaderReady);
      existing.addEventListener('error', () =>
        reject(new Error('Monaco AMD loader failed to load')),
      );
      return;
    }

    const script = document.createElement('script');
    script.id = 'monaco-amd-loader';
    script.src = MONACO_BASE + '/loader.js';
    script.onload = onLoaderReady;
    script.onerror = () => reject(new Error('Monaco AMD loader failed to load'));
    document.body.appendChild(script);
  });
  return monacoPromise;
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
export class MonacoEditorComponent implements OnInit, OnDestroy {
  readonly value = input<string>('');
  readonly language = input<'json' | 'yaml'>('json');
  readonly valueChange = output<string>();

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private monaco?: MonacoApi;
  private editor?: import('monaco-editor').editor.IStandaloneCodeEditor;
  private debounceTimer?: ReturnType<typeof setTimeout>;
  private suppressEmit = false;
  private destroyed = false;

  constructor() {
    effect(() => {
      const language = this.language();
      const model = this.editor?.getModel();
      if (this.monaco && model) {
        this.monaco.editor.setModelLanguage(model, language);
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

  async ngOnInit(): Promise<void> {
    const monaco = await loadMonaco();
    if (this.destroyed) {
      return;
    }
    this.monaco = monaco;
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
  }

  ngOnDestroy(): void {
    this.destroyed = true;
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
