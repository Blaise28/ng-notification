import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { EditorView, basicSetup } from 'codemirror';
import { html } from '@codemirror/lang-html';
import { css as cssLang } from '@codemirror/lang-css';
import { EditorState } from '@codemirror/state';

import {
  TEMPLATE_VARIABLE_LABELS,
  TEMPLATE_VARIABLE_TOKENS,
  TemplateVariableToken,
} from '../template.models';

type EditorMode = 'visual' | 'code';
type CodeTab = 'html' | 'css';

@Component({
  selector: 'app-template-email-editor',
  templateUrl: './template-email-editor.html',
})
export class TemplateEmailEditor implements AfterViewInit, OnDestroy {
  readonly htmlBody = input('');
  readonly css = input('');
  readonly htmlBodyChange = output<string>();
  readonly cssChange = output<string>();
  readonly insertImage = output<void>();

  readonly variableTokens = input<readonly string[]>(TEMPLATE_VARIABLE_TOKENS);

  protected readonly mode = signal<EditorMode>('visual');
  protected readonly codeTab = signal<CodeTab>('html');
  protected readonly visualUnsupported = signal(false);
  protected readonly variableLabels = TEMPLATE_VARIABLE_LABELS;

  private readonly visualHost = viewChild<ElementRef<HTMLDivElement>>('visualHost');
  private readonly codeHost = viewChild<ElementRef<HTMLDivElement>>('codeHost');

  private tiptap: Editor | null = null;
  private codeView: EditorView | null = null;
  private syncingFromParent = false;

  constructor() {
    effect(() => {
      const html = this.htmlBody();
      const css = this.css();
      if (this.syncingFromParent) {
        return;
      }
      this.syncVisualEditor(html);
      this.syncCodeEditor(html, css);
    });
  }

  ngAfterViewInit(): void {
    this.initVisualEditor();
    this.initCodeEditor();
  }

  ngOnDestroy(): void {
    this.tiptap?.destroy();
    this.codeView?.destroy();
  }

  setMode(mode: EditorMode): void {
    if (mode === 'visual' && this.visualUnsupported()) {
      return;
    }
    this.mode.set(mode);
    if (mode === 'visual') {
      this.syncVisualEditor(this.htmlBody());
    } else {
      this.syncCodeEditor(this.htmlBody(), this.css());
    }
  }

  setCodeTab(tab: CodeTab): void {
    this.codeTab.set(tab);
    this.initCodeEditor();
  }

  insertVariable(token: string): void {
    const placeholder = `{{${token}}}`;
    if (this.mode() === 'visual' && this.tiptap) {
      this.tiptap.chain().focus().insertContent(placeholder).run();
      this.htmlBodyChange.emit(this.tiptap.getHTML());
      return;
    }
    this.htmlBodyChange.emit(`${this.htmlBody()}${placeholder}`);
  }

  insertBlock(type: 'cta' | 'divider' | 'info'): void {
    const blocks: Record<'cta' | 'divider' | 'info', string> = {
      cta: '<p><a href="#" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Cliquez ici</a></p>',
      divider: '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />',
      info: '<div style="background:#eff6ff;border-left:4px solid #2563eb;padding:12px 16px;border-radius:4px;"><p style="margin:0;color:#1e40af;">Information importante</p></div>',
    };
    const block = blocks[type];
    if (this.mode() === 'visual' && this.tiptap) {
      this.tiptap.chain().focus().insertContent(block).run();
      this.htmlBodyChange.emit(this.tiptap.getHTML());
      return;
    }
    this.htmlBodyChange.emit(`${this.htmlBody()}${block}`);
  }

  onInsertImageClick(): void {
    this.insertImage.emit();
  }

  appendHtml(fragment: string): void {
    if (this.mode() === 'visual' && this.tiptap) {
      this.tiptap.chain().focus().insertContent(fragment).run();
      this.htmlBodyChange.emit(this.tiptap.getHTML());
      return;
    }
    this.htmlBodyChange.emit(`${this.htmlBody()}${fragment}`);
  }

  labelFor(token: string): string {
    return this.variableLabels[token as TemplateVariableToken] ?? token;
  }

  private initVisualEditor(): void {
    const host = this.visualHost()?.nativeElement;
    if (!host || this.tiptap) {
      return;
    }
    this.tiptap = new Editor({
      element: host,
      extensions: [StarterKit],
      content: this.htmlBody() || '<p></p>',
      onUpdate: ({ editor }) => {
        this.syncingFromParent = true;
        this.htmlBodyChange.emit(editor.getHTML());
        this.syncingFromParent = false;
      },
    });
    this.checkVisualSupport(this.htmlBody());
  }

  private initCodeEditor(): void {
    const host = this.codeHost()?.nativeElement;
    if (!host) {
      return;
    }
    this.codeView?.destroy();
    const tab = this.codeTab();
    const value = tab === 'html' ? this.htmlBody() : this.css();
    const language = tab === 'html' ? html() : cssLang();
    this.codeView = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          language,
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) {
              return;
            }
            const next = update.state.doc.toString();
            this.syncingFromParent = true;
            if (tab === 'html') {
              this.htmlBodyChange.emit(next);
              this.checkVisualSupport(next);
            } else {
              this.cssChange.emit(next);
            }
            this.syncingFromParent = false;
          }),
        ],
      }),
    });
  }

  private syncVisualEditor(htmlContent: string): void {
    if (!this.tiptap) {
      return;
    }
    const current = this.tiptap.getHTML();
    if (current === htmlContent) {
      return;
    }
    this.checkVisualSupport(htmlContent);
    if (this.visualUnsupported()) {
      return;
    }
    this.tiptap.commands.setContent(htmlContent || '<p></p>', { emitUpdate: false });
  }

  private syncCodeEditor(htmlContent: string, cssContent: string): void {
    if (!this.codeView) {
      return;
    }
    const tab = this.codeTab();
    const expected = tab === 'html' ? htmlContent : cssContent;
    const current = this.codeView.state.doc.toString();
    if (current === expected) {
      return;
    }
    this.codeView.dispatch({
      changes: { from: 0, to: current.length, insert: expected },
    });
  }

  private checkVisualSupport(htmlContent: string): void {
    const unsupported = /<(table|style|script|iframe|form|input|select|textarea)\b/i.test(
      htmlContent,
    );
    this.visualUnsupported.set(unsupported);
    if (unsupported && this.mode() === 'visual') {
      this.mode.set('code');
    }
  }
}
