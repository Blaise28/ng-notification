import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Delete02Icon, Edit02Icon, PlusSignIcon } from '@hugeicons/core-free-icons';

import { ApiError } from '@services/api/api-error';
import { OrganizationService } from '@services/organizations/organization.service';
import { TemplateService } from '@services/templates/template.service';
import { OrganizationModel } from '@components/organizations/organization.models';
import { TemplateModel } from '../template.models';

@Component({
  selector: 'app-template-list',
  imports: [RouterLink, HugeiconsIconComponent],
  templateUrl: './template-list.html',
})
export class TemplateList {
  private readonly destroyRef = inject(DestroyRef);
  private readonly templateService = inject(TemplateService);
  private readonly organizationService = inject(OrganizationService);

  protected readonly PlusSignIcon = PlusSignIcon;
  protected readonly Edit02Icon = Edit02Icon;
  protected readonly Delete02Icon = Delete02Icon;

  protected readonly templates = signal<TemplateModel[]>([]);
  protected readonly organizations = signal<OrganizationModel[]>([]);
  protected readonly organizationFilter = signal('');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);

  constructor() {
    this.organizationService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.organizations.set(response.object.items),
        error: () => undefined,
      });
    this.fetch();
  }

  organizationName(organizationId: string): string {
    return (
      this.organizations().find((organization) => organization.id === organizationId)?.name ?? '—'
    );
  }

  applyFilter(): void {
    this.fetch();
  }

  confirmDelete(template: TemplateModel): void {
    if (!confirm(`Supprimer le modèle « ${template.name} » ?`)) {
      return;
    }
    this.deletingId.set(template.id);
    this.templateService
      .remove(template.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingId.set(null);
          this.fetch();
        },
        error: (err: unknown) => {
          this.deletingId.set(null);
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
        },
      });
  }

  private fetch(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.templateService
      .list({ organizationId: this.organizationFilter() || undefined })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.templates.set(response.object.items);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
        },
      });
  }
}
