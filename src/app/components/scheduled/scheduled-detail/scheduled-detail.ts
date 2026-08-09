import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiError } from '@services/api/api-error';
import { DialogService } from '@services/dialog/dialog.service';
import { ScheduledService } from '@services/scheduled/scheduled.service';
import { ScheduledNotificationModel } from '../scheduled.models';

@Component({
  selector: 'app-scheduled-detail',
  imports: [RouterLink, DatePipe, JsonPipe],
  templateUrl: './scheduled-detail.html',
})
export class ScheduledDetail {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly scheduledService = inject(ScheduledService);
  private readonly dialogService = inject(DialogService);

  protected readonly scheduledId = this.route.snapshot.paramMap.get('id')!;
  protected readonly scheduled = signal<ScheduledNotificationModel | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    this.scheduledService
      .getById(this.scheduledId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.scheduled.set(response.object);
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

  confirmCancel(): void {
    this.dialogService.showConfirmDialog({
      type: 'warning',
      title: 'Annuler la planification',
      description: 'Annuler cette planification ?',
      onConfirm: () => {
        this.scheduledService
          .cancel(this.scheduledId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: async () => {
              this.dialogService.showToast({
                type: 'success',
                message: 'Planification annulée',
              });
              await this.router.navigate(['/scheduled']);
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
