import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  Alert02Icon,
  ArrowLeft02Icon,
  CheckmarkCircleIcon,
  Comment01Icon,
  Mail01Icon,
  Megaphone02Icon,
  UserGroupIcon,
  WhatsappIcon,
} from '@hugeicons/core-free-icons';

import { ApiError } from '@services/api/api-error';
import { DialogService } from '@services/dialog/dialog.service';
import { NotificationService } from '@services/notifications/notification.service';
import { SentNotificationDetailModel } from '../notification.models';

@Component({
  selector: 'app-notification-detail',
  imports: [RouterLink, DatePipe, HugeiconsIconComponent],
  templateUrl: './notification-detail.html',
})
export class NotificationDetail {
  protected readonly Megaphone02Icon = Megaphone02Icon;
  protected readonly ArrowLeft02Icon = ArrowLeft02Icon;
  protected readonly CheckmarkCircleIcon = CheckmarkCircleIcon;
  protected readonly Alert02Icon = Alert02Icon;
  protected readonly UserGroupIcon = UserGroupIcon;
  protected readonly Mail01Icon = Mail01Icon;
  protected readonly Comment01Icon = Comment01Icon;
  protected readonly WhatsappIcon = WhatsappIcon;
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly notificationService = inject(NotificationService);
  private readonly dialogService = inject(DialogService);

  protected readonly notificationId = this.route.snapshot.paramMap.get('id')!;
  protected readonly notification = signal<SentNotificationDetailModel | null>(null);
  protected readonly loading = signal(true);

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
          this.dialogService.showToast({
            type: 'error',
            message: err instanceof ApiError ? err.message : 'Une erreur est survenue.',
          });
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
