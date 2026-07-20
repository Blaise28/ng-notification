import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';

import { MediaPicker } from '@components/media/media-picker/media-picker';
import { MediaAssetModel } from '@components/media/media.models';
import { ApiError } from '@services/api/api-error';
import { TemplateService } from '@services/templates/template.service';
import { slugify } from '@utils/slugify';
import { TemplatePreview } from '../template-preview/template-preview';
import { TEMPLATE_PREVIEW_SAMPLE_VARS } from '../template-preview.utils';
import {
  CreateTemplateBodyModel,
  TEMPLATE_VARIABLE_LABELS,
  TEMPLATE_VARIABLE_TOKENS,
  TemplateChannel,
  TemplateVariableToken,
  UpdateTemplateBodyModel,
} from '../template.models';

interface TemplateFormValue {
  name: string;
  slug: string;
  channel: TemplateChannel;
  subject: string;
  htmlBody: string;
  textBody: string;
  css: string;
  smsBody: string;
  whatsappContentSid: string;
  isDefault: boolean;
}

const EMPTY_FORM_VALUE: TemplateFormValue = {
  name: '',
  slug: '',
  channel: 'email',
  subject: '',
  htmlBody: '',
  textBody: '',
  css: '',
  smsBody: '',
  whatsappContentSid: '',
  isDefault: false,
};

@Component({
  selector: 'app-template-form',
  imports: [RouterLink, FormField, MediaPicker, TemplatePreview],
  templateUrl: './template-form.html',
})
export class TemplateForm {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly templateService = inject(TemplateService);
  private slugTouched = false;

  protected readonly templateId = signal(this.route.snapshot.paramMap.get('id'));
  protected readonly isEdit = computed(() => this.templateId() !== null);

  protected readonly variableTokens = TEMPLATE_VARIABLE_TOKENS;
  protected readonly variableLabels = TEMPLATE_VARIABLE_LABELS;
  protected readonly selectedVariables = signal<TemplateVariableToken[]>([]);
  protected readonly showGallery = signal(false);

  protected readonly templateForm = form(
    signal<TemplateFormValue>({ ...EMPTY_FORM_VALUE }),
    (schema) => {
      required(schema.name);
      required(schema.slug);
      required(schema.channel);
    },
  );

  protected readonly previewVariables = computed(() => {
    const selected = this.selectedVariables();
    const vars: Record<string, string> = {};
    for (const token of selected) {
      vars[token] = TEMPLATE_PREVIEW_SAMPLE_VARS[token] ?? '';
    }
    return vars;
  });

  protected readonly loading = signal(false);
  protected readonly submitLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    const id = this.templateId();
    if (id) {
      this.slugTouched = true;
      this.loading.set(true);
      this.templateService
        .getById(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            this.loading.set(false);
            const template = response.object;
            this.selectedVariables.set(
              (template.variables ?? []).filter((token): token is TemplateVariableToken =>
                (TEMPLATE_VARIABLE_TOKENS as readonly string[]).includes(token),
              ),
            );
            this.templateForm().value.set({
              name: template.name,
              slug: template.slug,
              channel: template.channel,
              subject: template.subject ?? '',
              htmlBody: template.htmlBody ?? '',
              textBody: template.textBody ?? '',
              css: template.css ?? '',
              smsBody: template.smsBody ?? '',
              whatsappContentSid: template.whatsappContentSid ?? '',
              isDefault: template.isDefault,
            });
          },
          error: (err: unknown) => {
            this.loading.set(false);
            this.errorMessage.set(
              err instanceof ApiError ? err.message : 'Une erreur est survenue.',
            );
          },
        });
    }
  }

  onNameInput(value: string): void {
    this.templateForm.name().value.set(value);
    if (!this.slugTouched) {
      this.templateForm.slug().value.set(slugify(value));
    }
  }

  onSlugInput(value: string): void {
    this.slugTouched = true;
    this.templateForm.slug().value.set(value);
  }

  toggleVariable(token: TemplateVariableToken): void {
    this.selectedVariables.update((current) =>
      current.includes(token) ? current.filter((t) => t !== token) : [...current, token],
    );
  }

  insertVariable(token: TemplateVariableToken): void {
    const channel = this.templateForm.channel().value();
    const placeholder = `{{${token}}}`;
    if (channel === 'sms') {
      this.templateForm.smsBody().value.set(`${this.templateForm.smsBody().value()}${placeholder}`);
      return;
    }
    this.templateForm.htmlBody().value.set(`${this.templateForm.htmlBody().value()}${placeholder}`);
  }

  onGallerySelect(asset: MediaAssetModel): void {
    const img = `<img src="${asset.url}" alt="${asset.originalName}" style="max-width:100%;height:auto;" />`;
    this.templateForm.htmlBody().value.set(`${this.templateForm.htmlBody().value()}${img}`);
    this.showGallery.set(false);
  }

  submit(event: SubmitEvent): void {
    event.preventDefault();
    this.errorMessage.set(null);
    this.submitLoading.set(true);

    const value = this.templateForm().value();
    const id = this.templateId();
    const body = toBody(value, this.selectedVariables());
    const request = id
      ? this.templateService.update(id, body as UpdateTemplateBodyModel)
      : this.templateService.create(body);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: async (response) => {
        this.submitLoading.set(false);
        await this.router.navigate(['/templates', response.object.id]);
      },
      error: (err: unknown) => {
        this.submitLoading.set(false);
        this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
      },
    });
  }
}

function toBody(
  value: TemplateFormValue,
  variables: TemplateVariableToken[],
): CreateTemplateBodyModel {
  return {
    name: value.name.trim(),
    slug: value.slug.trim(),
    channel: value.channel,
    subject: value.subject.trim() || undefined,
    htmlBody: value.htmlBody.trim() || undefined,
    textBody: value.textBody.trim() || undefined,
    css: value.css.trim() || undefined,
    smsBody: value.smsBody.trim() || undefined,
    whatsappContentSid: value.whatsappContentSid.trim() || undefined,
    variables,
    isDefault: value.isDefault,
  };
}
