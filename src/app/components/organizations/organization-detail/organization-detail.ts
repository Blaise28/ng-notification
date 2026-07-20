import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';

import { ApiError } from '@services/api/api-error';
import { OrganizationService } from '@services/organizations/organization.service';
import { readableTextColor } from '@utils/readable-text-color';
import { OrganizationModel } from '../organization.models';

@Component({
  selector: 'app-organization-detail',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './organization-detail.html',
})
export class OrganizationDetail {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly organizationService = inject(OrganizationService);

  protected readonly organizationId = this.route.snapshot.paramMap.get('id')!;
  protected readonly organization = signal<OrganizationModel | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly previewTextColor = computed(() => {
    const organization = this.organization();
    return organization ? readableTextColor(organization.primaryColor) : '#000000';
  });

  constructor() {
    this.organizationService
      .getById(this.organizationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.organization.set(response.object.organization);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
        },
      });
  }

  confirmDelete(): void {
    const organization = this.organization();
    if (!organization || !confirm(`Supprimer l'organisation « ${organization.name} » ?`)) {
      return;
    }
    this.organizationService
      .remove(organization.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async () => {
          await this.router.navigate(['/organizations']);
        },
        error: (err: unknown) => {
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
        },
      });
  }
}
