import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

import type { TemplateChannel } from '../template.models';
import {
  buildEmailPreviewDocument,
  interpolateTemplate,
  TEMPLATE_PREVIEW_SAMPLE_VARS,
} from '../template-preview.utils';

@Component({
  selector: 'app-template-preview',
  templateUrl: './template-preview.html',
})
export class TemplatePreview {
  private readonly sanitizer = inject(DomSanitizer);

  readonly channel = input.required<TemplateChannel>();
  readonly subject = input('');
  readonly htmlBody = input('');
  readonly css = input('');
  readonly smsBody = input('');
  readonly whatsappContentSid = input('');
  readonly variables = input<Record<string, string>>(TEMPLATE_PREVIEW_SAMPLE_VARS);
  readonly title = input('Aperçu');

  protected readonly previewSubject = computed(() =>
    interpolateTemplate(this.subject(), this.variables()),
  );

  protected readonly previewSms = computed(() =>
    interpolateTemplate(this.smsBody(), this.variables()),
  );

  protected readonly emailSrcdoc = computed((): SafeHtml => {
    const doc = buildEmailPreviewDocument({
      subject: this.subject(),
      htmlBody: this.htmlBody(),
      css: this.css(),
      variables: this.variables(),
    });
    return this.sanitizer.bypassSecurityTrustHtml(doc);
  });
}
