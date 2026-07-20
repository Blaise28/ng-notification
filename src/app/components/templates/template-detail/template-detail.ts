import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiError } from '@services/api/api-error';
import { OrganizationService } from '@services/organizations/organization.service';
import { TemplateService } from '@services/templates/template.service';
import { TemplateModel } from '../template.models';

@Component({
  selector: 'app-template-detail',
  imports: [RouterLink],
  templateUrl: './template-detail.html',
})
export class TemplateDetail {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly templateService = inject(TemplateService);
  private readonly organizationService = inject(OrganizationService);

  protected readonly templateId = this.route.snapshot.paramMap.get('id')!;
  protected readonly template = signal<TemplateModel | null>(null);
  protected readonly organizationName = signal<string>('—');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.templateService
      .getById(this.templateId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          const template = response.object.template;
          this.template.set(template);
          this.organizationService
            .getById(template.organizationId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (orgResponse) =>
                this.organizationName.set(orgResponse.object.organization.name),
              error: () => undefined,
            });
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
        },
      });
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
