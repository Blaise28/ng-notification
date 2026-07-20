import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';

import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Delete02Icon, Edit02Icon, PlusSignIcon } from '@hugeicons/core-free-icons';

import { ApiError } from '@services/api/api-error';
import { OrganizationService } from '@services/organizations/organization.service';
import { OrganizationModel } from '../organization.models';

@Component({
  selector: 'app-organization-list',
  imports: [RouterLink, NgOptimizedImage, HugeiconsIconComponent],
  templateUrl: './organization-list.html',
})
export class OrganizationList {
  private readonly destroyRef = inject(DestroyRef);
  private readonly organizationService = inject(OrganizationService);

  protected readonly PlusSignIcon = PlusSignIcon;
  protected readonly Edit02Icon = Edit02Icon;
  protected readonly Delete02Icon = Delete02Icon;

  protected readonly organizations = signal<OrganizationModel[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);

  constructor() {
    this.fetch();
  }

  confirmDelete(organization: OrganizationModel): void {
    if (!confirm(`Supprimer l'organisation « ${organization.name} » ?`)) {
      return;
    }
    this.deletingId.set(organization.id);
    this.organizationService
      .remove(organization.id)
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
    this.organizationService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.organizations.set(response.object.items);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
        },
      });
  }
}
