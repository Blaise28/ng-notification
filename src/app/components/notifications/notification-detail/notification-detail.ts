import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApiError } from '@services/api/api-error';
import { NotificationService } from '@services/notifications/notification.service';
import { SentNotificationDetailModel } from '../notification.models';

@Component({
  selector: 'app-notification-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './notification-detail.html',
})
export class NotificationDetail {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly notificationService = inject(NotificationService);

  protected readonly notificationId = this.route.snapshot.paramMap.get('id')!;
  protected readonly notification = signal<SentNotificationDetailModel | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.notificationService
      .getById(this.notificationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.notification.set(response.object);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
        },
      });
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'COMPLETED':
      case 'DELIVERED':
      case 'SENT':
        return 'badge-success';
      case 'FAILED':
        return 'badge-error';
      case 'PARTIAL':
      case 'SKIPPED':
        return 'badge-warning';
      default:
        return 'badge-info';
    }
  }
}
