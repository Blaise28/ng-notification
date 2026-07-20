import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import type { ListAction, ListHeaderModel } from '@globals/models/list.models';
import { List } from '@globals/components/list/list';
import { ApiError } from '@services/api/api-error';
import { OrganizationService } from '@services/organizations/organization.service';
import { OrganizationModel } from '../organization.models';

@Component({
  selector: 'app-organization-list',
  imports: [List],
  templateUrl: './organization-list.html',
})
export class OrganizationList {
  private readonly destroyRef = inject(DestroyRef);
  private readonly organizationService = inject(OrganizationService);
  private readonly router = inject(Router);
  private readonly list = viewChild(List);

  protected readonly headers: ListHeaderModel[] = [
    { label: 'Nom', field: ['name'] },
    { label: 'Slug', field: ['slug'] },
    { label: 'Support', field: ['supportEmail'] },
  ];

  protected readonly actions: ListAction[] = [
    {
      name: 'Modifier',
      callback: (line) => {
        void this.router.navigate(['/organizations', (line as OrganizationModel).id, 'edit']);
      },
    },
    {
      name: 'Supprimer',
      callback: (line) => this.confirmDelete(line as OrganizationModel),
    },
  ];

  protected readonly errorMessage = signal<string | null>(null);

  private confirmDelete(organization: OrganizationModel): void {
    if (!confirm(`Supprimer l'organisation « ${organization.name} » ?`)) {
      return;
    }
    this.organizationService
      .remove(organization.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.list()?.reloadList(),
        error: (err: unknown) => {
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
        },
      });
  }
}
