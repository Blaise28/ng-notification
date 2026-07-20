import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Megaphone02Icon } from '@hugeicons/core-free-icons';

import { ApiError } from '@services/api/api-error';
import { NotificationService } from '@services/notifications/notification.service';
import {
  ListSentNotificationsQueryModel,
  NotificationChannel,
  SentNotificationModel,
} from '../notification.models';

@Component({
  selector: 'app-notification-history-list',
  imports: [RouterLink, HugeiconsIconComponent, DatePipe],
  templateUrl: './notification-history-list.html',
})
export class NotificationHistoryList {
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService);

  protected readonly Megaphone02Icon = Megaphone02Icon;

  protected readonly notifications = signal<SentNotificationModel[]>([]);
  protected readonly totalPages = signal(1);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly page = signal(1);
  protected readonly limit = 20;
  protected readonly channelFilter = signal<NotificationChannel | ''>('');

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

  statusBadgeClass(status: SentNotificationModel['status']): string {
    switch (status) {
      case 'COMPLETED':
        return 'badge-success';
      case 'FAILED':
        return 'badge-error';
      case 'PARTIAL':
        return 'badge-warning';
      default:
        return 'badge-info';
    }
  }

  private fetch(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const query: ListSentNotificationsQueryModel = {
      page: this.page(),
      limit: this.limit,
      channel: this.channelFilter() || undefined,
    };

    this.notificationService
      .list(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.notifications.set(response.object.items);
          this.totalPages.set(response.object.totalPages);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
        },
      });
  }
}
