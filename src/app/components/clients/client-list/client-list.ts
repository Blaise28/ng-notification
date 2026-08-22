import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import type { ListAction, ListHeaderModel } from '@globals/models/list.models';
import { List } from '@globals/components/list/list';
import { ApiError } from '@services/api/api-error';
import { ClientService } from '@services/clients/client.service';
import { DialogService } from '@services/dialog/dialog.service';
import { ClientModel } from '../client.models';

@Component({
  selector: 'app-client-list',
  imports: [List],
  templateUrl: './client-list.html',
})
export class ClientList {
  private readonly destroyRef = inject(DestroyRef);
  private readonly clientService = inject(ClientService);
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);
  private readonly list = viewChild(List);

  protected readonly subscriptionEndFrom = signal('');
  protected readonly subscriptionEndTo = signal('');
  protected readonly listUrl = signal('/api/v1/clients');

  protected readonly headers: ListHeaderModel[] = [
    { label: 'Nom', field: ['displayName'] },
    {
      label: 'Type',
      field: ['type'],
      format: 'badge',
      valueLabels: { individual: 'Particulier', business: 'Entreprise' },
    },
    { label: 'Téléphone', field: ['phoneE164'] },
    { label: 'E-mail', field: ['email'] },
    { label: 'Fin abonnement', field: ['subscriptionEndAt'], format: 'date' },
    {
      label: 'Actif',
      field: ['isActive'],
      format: 'boolean',
      boolean: {
        type: 'badge',
        trueLabel: 'Actif',
        falseLabel: 'Inactif',
        trueBadgeClass: 'badge-success badge-soft',
        falseBadgeClass: 'badge-error badge-soft',
      },
    },
  ];

  protected readonly actions: ListAction[] = [
    {
      name: 'Modifier',
      callback: (line) => {
        void this.router.navigate(['/clients', (line as ClientModel).id, 'edit']);
      },
    },
    {
      name: 'Activer',
      callback: (line) => this.manageActiveAction('active', line as ClientModel),
    },
    {
      name: 'Désactiver',
      callback: (line) => this.manageActiveAction('deactive', line as ClientModel),
    },
  ];

  applySubscriptionFilter(): void {
    const params = new URLSearchParams();
    if (this.subscriptionEndFrom()) {
      params.set('subscriptionEndAtFrom', this.subscriptionEndFrom());
    }
    if (this.subscriptionEndTo()) {
      params.set('subscriptionEndAtTo', this.subscriptionEndTo());
    }
    const query = params.toString();
    this.listUrl.set(query ? `/api/v1/clients?${query}` : '/api/v1/clients');
  }

  resetSubscriptionFilter(): void {
    this.subscriptionEndFrom.set('');
    this.subscriptionEndTo.set('');
    this.listUrl.set('/api/v1/clients');
  }

  private manageActiveAction(type: 'active' | 'deactive', client: ClientModel): void {
    this.dialogService.showConfirmDialog({
      type: 'error',
      title: `${type === 'active' ? `Activer` : `Désactiver`} le client`,
      description: `${type === 'active' ? `Activer` : `Désactiver`} le client « ${client.displayName} » ?`,
      onConfirm: () => {
        this.clientService
          .update(client.id, { isActive: type === 'active' ? true : false })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.list()?.reloadList();
              this.dialogService.showToast({
                type: 'success',
                message: 'Client désactivé',
              });
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
