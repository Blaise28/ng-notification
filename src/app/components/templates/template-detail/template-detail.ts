import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiError } from '@services/api/api-error';
import { TemplateService } from '@services/templates/template.service';
import { TemplatePreview } from '../template-preview/template-preview';
import { TEMPLATE_PREVIEW_SAMPLE_VARS } from '../template-preview.utils';
import { TEMPLATE_VARIABLE_LABELS, TemplateModel, TemplateVariableToken } from '../template.models';

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

  protected readonly templateId = this.route.snapshot.paramMap.get('id')!;
  protected readonly template = signal<TemplateModel | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly variableLabels = TEMPLATE_VARIABLE_LABELS;

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
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
        },
      });
  }

  labelFor(token: string): string {
    return this.variableLabels[token as TemplateVariableToken] ?? token;
  }

  confirmDelete(): void {
    const template = this.template();
    if (!template || !confirm(`Supprimer le modèle « ${template.name} » ?`)) {
      return;
    }
    this.templateService
      .remove(template.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async () => {
          await this.router.navigate(['/templates']);
        },
        error: (err: unknown) => {
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
        },
      });
  }
}
