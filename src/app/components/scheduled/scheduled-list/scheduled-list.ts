import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { HugeiconsIconComponent } from '@hugeicons/angular';
import { PlusSignIcon } from '@hugeicons/core-free-icons';

import { ApiError } from '@services/api/api-error';
import { ScheduledService } from '@services/scheduled/scheduled.service';
import { ScheduledNotificationModel } from '../scheduled.models';

type ScheduledTab = 'upcoming' | 'past';

@Component({
  selector: 'app-scheduled-list',
  imports: [RouterLink, HugeiconsIconComponent, DatePipe],
  templateUrl: './scheduled-list.html',
})
export class ScheduledList {
  private readonly destroyRef = inject(DestroyRef);
  private readonly scheduledService = inject(ScheduledService);

  protected readonly PlusSignIcon = PlusSignIcon;

  protected readonly scheduledItems = signal<ScheduledNotificationModel[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly cancellingId = signal<string | null>(null);
  protected readonly activeTab = signal<ScheduledTab>('upcoming');

  protected readonly upcomingItems = computed(() =>
    this.scheduledItems().filter(
      (item) =>
        (item.status === 'PENDING' || item.status === 'QUEUED') &&
        new Date(item.sendAt) >= new Date(),
    ),
  );
  protected readonly pastItems = computed(() =>
    this.scheduledItems().filter((item) => !this.upcomingItems().includes(item)),
  );
  protected readonly visibleItems = computed(() =>
    this.activeTab() === 'upcoming' ? this.upcomingItems() : this.pastItems(),
  );

  constructor() {
    this.fetch();
  }

  statusBadgeClass(status: ScheduledNotificationModel['status']): string {
    switch (status) {
      case 'QUEUED':
        return 'badge-success';
      case 'CANCELLED':
        return 'badge-neutral';
      case 'FAILED':
        return 'badge-error';
      default:
        return 'badge-info';
    }
  }

  confirmCancel(item: ScheduledNotificationModel): void {
    if (!confirm('Annuler cet envoi programmé ?')) {
      return;
    }
    this.cancellingId.set(item.id);
    this.scheduledService
      .cancel(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cancellingId.set(null);
          this.fetch();
        },
        error: (err: unknown) => {
          this.cancellingId.set(null);
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
        },
      });
  }

  private fetch(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.scheduledService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.scheduledItems.set(response.object.items);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
        },
      });
  }
}
