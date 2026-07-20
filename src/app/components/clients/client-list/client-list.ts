import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Delete02Icon, Edit02Icon, PlusSignIcon } from '@hugeicons/core-free-icons';

import { ApiError } from '@services/api/api-error';
import { ClientService } from '@services/clients/client.service';
import { ClientModel, ClientType, ListClientsQueryModel } from '../client.models';

@Component({
  selector: 'app-client-list',
  imports: [RouterLink, HugeiconsIconComponent],
  templateUrl: './client-list.html',
})
export class ClientList {
  private readonly destroyRef = inject(DestroyRef);
  private readonly clientService = inject(ClientService);

  protected readonly PlusSignIcon = PlusSignIcon;
  protected readonly Edit02Icon = Edit02Icon;
  protected readonly Delete02Icon = Delete02Icon;

  protected readonly clients = signal<ClientModel[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(1);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);

  protected readonly page = signal(1);
  protected readonly limit = 20;
  protected readonly typeFilter = signal<ClientType | ''>('');
  protected readonly optInSmsFilter = signal(false);
  protected readonly optInWhatsappFilter = signal(false);
  protected readonly optInEmailFilter = signal(false);

  constructor() {
    this.fetch();
  }

  applyFilters(): void {
    this.page.set(1);
    this.fetch();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }
    this.page.set(page);
    this.fetch();
  }

  confirmDelete(client: ClientModel): void {
    if (!confirm(`Supprimer le client « ${client.displayName} » ?`)) {
      return;
    }
    this.deletingId.set(client.id);
    this.clientService
      .remove(client.id)
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

    const query: ListClientsQueryModel = {
      page: this.page(),
      limit: this.limit,
      type: this.typeFilter() || undefined,
      optInSms: this.optInSmsFilter() || undefined,
      optInWhatsapp: this.optInWhatsappFilter() || undefined,
      optInEmail: this.optInEmailFilter() || undefined,
    };

    this.clientService
      .list(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.clients.set(response.object.items);
          this.total.set(response.object.total);
          this.totalPages.set(response.object.totalPages);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
        },
      });
  }
}
