import { signal, ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WritableSignal } from '@angular/core';

import { resolveDocumentViewerKind } from '@components/documents/document-file/utils/document-file.utils';
import { MarkdownReaderComponent } from './markdown-reader.component';

const resourceRoot = path.resolve(
  process.cwd(),
  'src/app/components/dev/markdown-reader',
);

async function resolveMarkdownReaderResources(): Promise<void> {
  await resolveComponentResources(async (url) => {
    const resourcePath = path.join(resourceRoot, url.replace(/^\.\//, ''));
    return readFile(resourcePath, 'utf8');
  });
}

describe('MarkdownReaderComponent', () => {
  let fixture: ComponentFixture<MarkdownReaderComponent>;
  let urlInput: WritableSignal<string | null>;

  function bindSignalInputs(component: MarkdownReaderComponent): void {
    Object.defineProperties(component, {
      url: { configurable: true, value: urlInput },
    });
  }

  beforeEach(async () => {
    urlInput = signal<string | null>(null);
    await resolveMarkdownReaderResources();

    await TestBed.configureTestingModule({
      imports: [MarkdownReaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MarkdownReaderComponent);
    bindSignalInputs(fixture.componentInstance);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should expose supported viewer kinds for markdown documents', () => {
    expect(
      resolveDocumentViewerKind({
        id: '1',
        title: 'Readme',
        file_url: 'https://example.com/readme.md',
        document_kind: 'markdown',
        original_filename: 'readme.md',
      }),
    ).toBe('markdown');
  });

  it('should parse markdown content to html', () => {
    const html = marked.parse('# Hello\n\n**World**', { gfm: true, async: false });
    expect(html).toContain('<h1');
    expect(html).toContain('Hello');
    expect(html).toContain('<strong>World</strong>');
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show unavailable message when url is null', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const status = fixture.nativeElement.querySelector('[role="status"]');
    expect(status?.textContent).toContain('Aperçu Markdown indisponible.');
  });

  it('should fetch markdown via fetch and render html', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Hello'),
    });
    vi.stubGlobal('fetch', fetchMock);

    urlInput.set('http://localhost:9000/arch-media/readme.md');
    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => fixture.nativeElement.querySelector('article'));

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:9000/arch-media/readme.md',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(fixture.nativeElement.querySelector('article')?.innerHTML).toContain('<h1');
  });
});
