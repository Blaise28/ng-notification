import { Component, computed, input, resource } from '@angular/core';

import { marked } from 'marked';

@Component({
  selector: 'markdown-reader',
  templateUrl: './markdown-reader.component.html',
  styleUrl: './markdown-reader.component.scss',
})
export class MarkdownReaderComponent {
  readonly url = input<string | null>(null);

  protected readonly markdownResource = resource({
    params: () => {
      const url = this.url();
      return url ? { url } : undefined;
    },
    loader: async ({ params, abortSignal }) => {
      const response = await fetch(params.url, { signal: abortSignal });
      if (!response.ok) {
        throw new Error(`Failed to fetch markdown (${response.status})`);
      }
      return response.text();
    },
  });

  protected readonly isLoading = computed(() => this.markdownResource.isLoading());

  protected readonly hasError = computed(
    () => !this.url() || this.markdownResource.error() != null,
  );

  protected readonly renderedHtml = computed(() => {
    const markdown = this.markdownResource.value();
    if (typeof markdown !== 'string' || markdown.length === 0) {
      return '';
    }

    const html = marked.parse(markdown, { gfm: true, async: false });
    return typeof html === 'string' ? html : '';
  });

  protected readonly hasContent = computed(() => this.renderedHtml().length > 0);
}
