import { Component, DestroyRef, inject, viewChild } from '@angular/core';
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
  ];

  protected readonly actions: ListAction[] = [
    {
      name: 'Modifier',
      callback: (line) => {
        void this.router.navigate(['/clients', (line as ClientModel).id, 'edit']);
      },
    },
    {
      name: 'Supprimer',
      callback: (line) => this.confirmDelete(line as ClientModel),
    },
  ];

  private confirmDelete(client: ClientModel): void {
    this.dialogService.showConfirmDialog({
      type: 'error',
      title: 'Supprimer le client',
      description: `Supprimer le client « ${client.displayName} » ?`,
      onConfirm: () => {
        this.clientService
          .remove(client.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.list()?.reloadList();
              this.dialogService.showToast({
                type: 'success',
                message: 'Client supprimé',
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
