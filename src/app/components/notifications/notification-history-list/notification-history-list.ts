import { Component, signal } from '@angular/core';

import type { ListHeaderModel } from '@globals/models/list.models';
import { List } from '@globals/components/list/list';
import { NotificationChannel } from '../notification.models';

@Component({
  selector: 'app-notification-history-list',
  imports: [List],
  templateUrl: './notification-history-list.html',
})
export class NotificationHistoryList {
  protected readonly channelFilter = signal<NotificationChannel | ''>('');
  protected readonly listUrl = signal('/api/v1/notifications');

  protected readonly headers: ListHeaderModel[] = [
    { label: 'Canaux', field: ['channels'] },
    {
      label: 'Mode',
      field: ['mode'],
      format: 'badge',
    },
    {
      label: 'Statut',
      field: ['status'],
      format: 'badge',
      dynamicClass: 'status',
    },
    { label: 'Destinataires', field: ['recipientCount'], format: 'number' },
    { label: 'Créé le', field: ['createdAt'], format: 'date' },
  ];

  applyFilters(): void {
    const channel = this.channelFilter();
    this.listUrl.set(
      channel ? `/api/v1/notifications?channel=${channel}` : '/api/v1/notifications',
    );
  }
}
