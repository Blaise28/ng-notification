import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiError } from '@services/api/api-error';
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

  protected readonly scheduledId = this.route.snapshot.paramMap.get('id')!;
  protected readonly scheduled = signal<ScheduledNotificationModel | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

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
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
        },
      });
  }

  confirmCancel(): void {
    if (!confirm('Annuler cette planification ?')) {
      return;
    }
    this.scheduledService
      .cancel(this.scheduledId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async () => {
          await this.router.navigate(['/scheduled']);
        },
        error: (err: unknown) => {
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
        },
      });
  }
}
