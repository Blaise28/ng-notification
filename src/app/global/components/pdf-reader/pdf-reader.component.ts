import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'pdf-reader',
  templateUrl: './pdf-reader.component.html',
  styleUrls: ['./pdf-reader.component.scss'],
  host: {
    class: 'block h-full',
  },
})
export class PdfReaderComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly url = input.required<string | null>();

  protected readonly pdfUrl = computed(() => {
    const url = this.url();
    if (!url) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });
}
