import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiError } from '@services/api/api-error';
import { ClientService } from '@services/clients/client.service';
import { DialogService } from '@services/dialog/dialog.service';
import { ClientModel } from '../client.models';

@Component({
  selector: 'app-client-detail',
  imports: [RouterLink],
  templateUrl: './client-detail.html',
})
export class ClientDetail {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clientService = inject(ClientService);
  private readonly dialogService = inject(DialogService);

  protected readonly clientId = this.route.snapshot.paramMap.get('id')!;
  protected readonly client = signal<ClientModel | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    this.clientService
      .getById(this.clientId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.client.set(response.object);
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

  confirmDelete(): void {
    const client = this.client();
    if (!client) {
      return;
    }
    this.dialogService.showConfirmDialog({
      type: 'error',
      title: 'Supprimer le client',
      description: `Supprimer le client « ${client.displayName} » ?`,
      onConfirm: () => {
        this.clientService
          .remove(client.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: async () => {
              this.dialogService.showToast({
                type: 'success',
                message: 'Client supprimé',
              });
              await this.router.navigate(['/clients']);
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
