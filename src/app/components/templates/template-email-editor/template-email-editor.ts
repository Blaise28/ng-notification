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
import { EditorView, basicSetup } from 'codemirror';
import { html } from '@codemirror/lang-html';
import { css as cssLang } from '@codemirror/lang-css';
import { EditorState } from '@codemirror/state';

import {
  TEMPLATE_VARIABLE_LABELS,
  TEMPLATE_VARIABLE_TOKENS,
  TemplateVariableToken,
} from '../template.models';

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

  protected readonly codeTab = signal<CodeTab>('html');
  protected readonly variableLabels = TEMPLATE_VARIABLE_LABELS;

  private readonly codeHost = viewChild<ElementRef<HTMLDivElement>>('codeHost');

  private codeView: EditorView | null = null;
  private syncingFromParent = false;

  constructor() {
    effect(() => {
      const html = this.htmlBody();
      const css = this.css();
      if (this.syncingFromParent) {
        return;
      }
      this.syncCodeEditor(html, css);
    });
  }

  ngAfterViewInit(): void {
    this.initCodeEditor();
  }

  ngOnDestroy(): void {
    this.codeView?.destroy();
  }

  setCodeTab(tab: CodeTab): void {
    this.codeTab.set(tab);
    this.initCodeEditor();
  }

  insertVariable(token: string): void {
    const placeholder = `{{${token}}}`;
    this.htmlBodyChange.emit(`${this.htmlBody()}${placeholder}`);
  }

  insertBlock(type: 'cta' | 'divider' | 'info'): void {
    const blocks: Record<'cta' | 'divider' | 'info', string> = {
      cta: '<p><a href="#" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Cliquez ici</a></p>',
      divider: '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />',
      info: '<div style="background:#eff6ff;border-left:4px solid #2563eb;padding:12px 16px;border-radius:4px;"><p style="margin:0;color:#1e40af;">Information importante</p></div>',
    };
    const block = blocks[type];
    this.htmlBodyChange.emit(`${this.htmlBody()}${block}`);
  }

  onInsertImageClick(): void {
    this.insertImage.emit();
  }

  appendHtml(fragment: string): void {
    this.htmlBodyChange.emit(`${this.htmlBody()}${fragment}`);
  }

  labelFor(token: string): string {
    return this.variableLabels[token as TemplateVariableToken] ?? token;
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
            } else {
              this.cssChange.emit(next);
            }
            this.syncingFromParent = false;
          }),
        ],
      }),
    });
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
}
