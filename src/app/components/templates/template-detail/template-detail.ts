import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiError } from '@services/api/api-error';
import { DialogService } from '@services/dialog/dialog.service';
import { TemplateService } from '@services/templates/template.service';
import { TemplatePreview } from '../template-preview/template-preview';
import { TEMPLATE_PREVIEW_SAMPLE_VARS } from '../template.utils';
import {
  TEMPLATE_VARIABLE_LABELS,
  TemplateModel,
  TemplateVariableToken,
  WHATSAPP_LANGUAGE_OPTIONS,
} from '../template.models';

@Component({
  selector: 'app-template-detail',
  imports: [RouterLink, TemplatePreview],
  templateUrl: './template-detail.html',
})
export class TemplateDetail {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly templateService = inject(TemplateService);
  private readonly dialogService = inject(DialogService);

  protected readonly templateId = this.route.snapshot.paramMap.get('id')!;
  protected readonly template = signal<TemplateModel | null>(null);
  protected readonly loading = signal(true);
  protected readonly duplicateLoading = signal(false);
  protected readonly variableLabels = TEMPLATE_VARIABLE_LABELS;
  protected readonly whatsappLanguages = WHATSAPP_LANGUAGE_OPTIONS;

  protected readonly previewVariables = computed(() => {
    const template = this.template();
    if (!template) {
      return {};
    }
    const vars: Record<string, string> = {};
    for (const token of template.variables ?? []) {
      vars[token] = TEMPLATE_PREVIEW_SAMPLE_VARS[token] ?? '';
    }
    return vars;
  });

  protected readonly whatsappLanguageLabel = computed(() => {
    const template = this.template();
    if (!template?.whatsappTemplateLanguage) {
      return '';
    }
    return (
      this.whatsappLanguages.find((lang) => lang.value === template.whatsappTemplateLanguage)
        ?.label ?? template.whatsappTemplateLanguage
    );
  });

  constructor() {
    this.templateService
      .getById(this.templateId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.template.set(response.object);
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

  labelFor(token: string): string {
    return this.variableLabels[token as TemplateVariableToken] ?? token;
  }

  async duplicateTemplate(): Promise<void> {
    this.duplicateLoading.set(true);
    this.templateService
      .duplicate(this.templateId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (response) => {
          this.duplicateLoading.set(false);
          await this.router.navigate(['/templates', response.object.id, 'edit']);
        },
        error: (err: unknown) => {
          this.duplicateLoading.set(false);
          this.dialogService.showToast({
            type: 'error',
            message: err instanceof ApiError ? err.message : 'Une erreur est survenue.',
          });
        },
      });
  }

  confirmDelete(): void {
    const template = this.template();
    if (!template) {
      return;
    }
    this.dialogService.showConfirmDialog({
      type: 'error',
      title: 'Supprimer le modèle',
      description: `Supprimer le modèle « ${template.name} » ?`,
      onConfirm: () => {
        this.templateService
          .remove(template.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: async () => {
              this.dialogService.showToast({
                type: 'success',
                message: 'Modèle supprimé',
              });
              await this.router.navigate(['/templates']);
            },
            error: (err: unknown) => {
              this.dialogService.showToast({
                type: 'error',
                message: err instanceof ApiError ? err.message : 'Une erreur est survenue.',
              });
            },
          });
      },
    });
  }
}
