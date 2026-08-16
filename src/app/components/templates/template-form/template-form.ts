import { Component, computed, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';

import { MediaPicker } from '@components/media/media-picker/media-picker';
import { MediaAssetModel } from '@components/media/media.models';
import { ApiError } from '@services/api/api-error';
import { DialogService } from '@services/dialog/dialog.service';
import { TemplateService } from '@services/templates/template.service';
import { slugify } from '@utils/slugify';
import { TemplateEmailEditor } from '../template-email-editor/template-email-editor';
import { TemplatePreview } from '../template-preview/template-preview';
import {
  countSmsSegments,
  extractVariablesFromContent,
  TEMPLATE_PREVIEW_SAMPLE_VARS,
} from '../template.utils';
import {
  CreateTemplateBodyModel,
  TEMPLATE_VARIABLE_LABELS,
  TEMPLATE_VARIABLE_TOKENS,
  TemplateChannel,
  TemplateVariableToken,
  UpdateTemplateBodyModel,
  WHATSAPP_LANGUAGE_OPTIONS,
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
  whatsappTemplateName: string;
  whatsappTemplateLanguage: string;
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
  whatsappTemplateName: '',
  whatsappTemplateLanguage: 'fr_FR',
  isDefault: false,
};

@Component({
  selector: 'app-template-form',
  imports: [RouterLink, FormField, MediaPicker, TemplatePreview, TemplateEmailEditor],
  templateUrl: './template-form.html',
})
export class TemplateForm {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly templateService = inject(TemplateService);
  private readonly dialogService = inject(DialogService);
  private slugTouched = false;

  private readonly emailEditor = viewChild(TemplateEmailEditor);

  protected readonly templateId = signal(this.route.snapshot.paramMap.get('id'));
  protected readonly isEdit = computed(() => this.templateId() !== null);

  protected readonly variableTokens = TEMPLATE_VARIABLE_TOKENS;
  protected readonly variableLabels = TEMPLATE_VARIABLE_LABELS;
  protected readonly whatsappLanguages = WHATSAPP_LANGUAGE_OPTIONS;
  protected readonly whatsappVariableKeys = signal<string[]>([]);
  protected readonly showGallery = signal(false);

  protected readonly templateForm = form(
    signal<TemplateFormValue>({ ...EMPTY_FORM_VALUE }),
    (schema) => {
      required(schema.name);
      required(schema.channel);
    },
  );

  protected readonly detectedVariables = computed(() => {
    const value = this.templateForm().value();
    const channel = value.channel;
    const texts: string[] = [value.subject];
    if (channel === 'email') {
      texts.push(value.htmlBody, value.textBody);
    }
    if (channel === 'sms') {
      texts.push(value.smsBody);
    }
    return extractVariablesFromContent(...texts);
  });

  protected readonly previewVariables = computed(() => {
    const vars: Record<string, string> = {};
    for (const token of this.detectedVariables()) {
      vars[token] = TEMPLATE_PREVIEW_SAMPLE_VARS[token] ?? `[${token}]`;
    }
    for (const token of this.whatsappVariableKeys()) {
      vars[token] = TEMPLATE_PREVIEW_SAMPLE_VARS[token] ?? `[${token}]`;
    }
    return vars;
  });

  protected readonly smsStats = computed(() => {
    const body = this.templateForm.smsBody().value();
    return countSmsSegments(body);
  });

  protected readonly channelValidationError = computed(() => {
    const value = this.templateForm().value();
    switch (value.channel) {
      case 'email':
        if (!value.subject.trim() || !value.htmlBody.trim()) {
          return 'Le sujet et le corps HTML sont requis pour un modèle e-mail.';
        }
        return null;
      case 'sms':
        if (!value.smsBody.trim()) {
          return 'Le corps SMS est requis.';
        }
        return null;
      case 'whatsapp':
        if (!value.whatsappTemplateName.trim()) {
          return 'Le nom du modèle Meta WhatsApp est requis.';
        }
        if (this.whatsappVariableKeys().length === 0) {
          return 'Ajoutez au moins une variable WhatsApp ordonnée.';
        }
        return null;
      default:
        return null;
    }
  });

  protected readonly loading = signal(false);
  protected readonly submitLoading = signal(false);

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
            this.whatsappVariableKeys.set(template.whatsappVariableKeys ?? []);
            this.templateForm().value.set({
              name: template.name,
              slug: template.slug,
              channel: template.channel,
              subject: template.subject ?? '',
              htmlBody: template.htmlBody ?? '',
              textBody: template.textBody ?? '',
              css: template.css ?? '',
              smsBody: template.smsBody ?? '',
              whatsappTemplateName: template.whatsappTemplateName ?? '',
              whatsappTemplateLanguage: template.whatsappTemplateLanguage ?? 'fr_FR',
              isDefault: template.isDefault,
            });
          },
          error: (err: unknown) => {
            this.loading.set(false);
            this.dialogService.showToast({
              type: 'error',
              message: err instanceof ApiError ? err.message : 'Une erreur est survenue.',
            });
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

  insertVariable(token: TemplateVariableToken, target: 'subject' | 'sms' | 'whatsapp'): void {
    const placeholder = `{{${token}}}`;
    if (target === 'subject') {
      this.templateForm.subject().value.set(`${this.templateForm.subject().value()}${placeholder}`);
      return;
    }
    if (target === 'sms') {
      this.templateForm.smsBody().value.set(`${this.templateForm.smsBody().value()}${placeholder}`);
      return;
    }
    this.addWhatsappVariable(token);
  }

  addWhatsappVariable(token: string): void {
    this.whatsappVariableKeys.update((keys) => (keys.includes(token) ? keys : [...keys, token]));
  }

  removeWhatsappVariable(token: string): void {
    this.whatsappVariableKeys.update((keys) => keys.filter((key) => key !== token));
  }

  moveWhatsappVariable(index: number, direction: -1 | 1): void {
    this.whatsappVariableKeys.update((keys) => {
      const next = [...keys];
      const target = index + direction;
      if (target < 0 || target >= next.length) {
        return keys;
      }
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  onGallerySelect(asset: MediaAssetModel): void {
    const img = `<img src="${asset.url}" alt="${asset.originalName}" style="max-width:100%;height:auto;" />`;
    this.emailEditor()?.appendHtml(img);
    this.showGallery.set(false);
  }

  labelFor(token: string): string {
    return this.variableLabels[token as TemplateVariableToken] ?? token;
  }

  submit(event: SubmitEvent): void {
    event.preventDefault();
    const validationError = this.channelValidationError();
    if (validationError) {
      this.dialogService.showToast({ type: 'error', message: validationError });
      return;
    }

    this.submitLoading.set(true);

    const value = this.templateForm().value();
    const id = this.templateId();
    const body = toBody(value, this.detectedVariables(), this.whatsappVariableKeys());
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
        this.dialogService.showToast({
          type: 'error',
          message: err instanceof ApiError ? err.message : 'Une erreur est survenue.',
        });
      },
    });
  }
}

function toBody(
  value: TemplateFormValue,
  variables: string[],
  whatsappVariableKeys: string[],
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
    whatsappTemplateName: value.whatsappTemplateName.trim() || undefined,
    whatsappTemplateLanguage: value.whatsappTemplateLanguage.trim() || undefined,
    whatsappVariableKeys: value.channel === 'whatsapp' ? whatsappVariableKeys : undefined,
    variables,
    isDefault: value.isDefault,
  };
}
