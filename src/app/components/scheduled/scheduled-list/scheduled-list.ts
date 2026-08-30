import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { ListAction, ListHeaderModel } from '@globals/models/list.models';
import { List } from '@globals/components/list/list';
import { ApiError } from '@services/api/api-error';
import { DialogService } from '@services/dialog/dialog.service';
import { ScheduledService } from '@services/scheduled/scheduled.service';
import { ScheduledNotificationModel } from '../scheduled.models';

type ScheduledTab = 'upcoming' | 'past';

@Component({
  selector: 'app-scheduled-list',
  imports: [List],
  templateUrl: './scheduled-list.html',
})
export class ScheduledList {
  private readonly destroyRef = inject(DestroyRef);
  private readonly scheduledService = inject(ScheduledService);
  private readonly dialogService = inject(DialogService);
  private readonly list = viewChild(List);

  protected readonly activeTab = signal<ScheduledTab>('upcoming');
  protected readonly listUrl = computed(() => `/api/v1/scheduled?tab=${this.activeTab()}`);

  protected readonly headers: ListHeaderModel[] = [
    { label: 'Canal', field: ['channel'], format: 'badge' },
    { label: 'Envoi prévu', field: ['sendAt'], format: 'date' },
    {
      label: 'Statut',
      field: ['status'],
      format: 'badge',
      dynamicClass: 'status',
    },
    { label: 'Cible', field: ['targetType'] },
  ];

  protected readonly actions: ListAction[] = [
    {
      name: 'Annuler',
      callback: (line) => this.confirmCancel(line as ScheduledNotificationModel),
    },
    {
      name: 'Relancer',
      callback: (line) => this.retry(line as ScheduledNotificationModel),
    },
  ];

  setTab(tab: ScheduledTab): void {
    this.activeTab.set(tab);
  }

  private confirmCancel(item: ScheduledNotificationModel): void {
    this.dialogService.showConfirmDialog({
      type: 'warning',
      title: 'Annuler la planification',
      description: 'Annuler cet envoi programmé ?',
      onConfirm: () => {
        this.scheduledService
          .cancel(item.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.list()?.reloadList();
              this.dialogService.showToast({
                type: 'success',
                message: 'Planification annulée',
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

  private retry(item: ScheduledNotificationModel): void {
    this.scheduledService
      .retry(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.list()?.reloadList();
          this.dialogService.showToast({
            type: 'success',
            message: 'Planification relancée',
          });
        },
        error: (err: unknown) => {
          this.dialogService.showToast({
            type: 'error',
            message: err instanceof ApiError ? err.message : 'Une erreur est survenue.',
          });
        },
      });
  }
}
