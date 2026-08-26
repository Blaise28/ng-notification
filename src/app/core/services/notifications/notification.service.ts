import { inject, Service } from '@angular/core';

import {
  ListSentNotificationsQueryModel,
  NotificationDetailResponse,
  NotificationsListResponse,
  SendNotificationResponse,
  SendToClientsBodyModel,
} from '@components/notifications/notification.models';
import { Api } from '@services/api/api';
import { toQueryParams } from '@utils/api-query';
import { PaginatedQueryModel } from '@models/pagination.models';

@Service()
export class NotificationService {
  private readonly api = inject(Api);

  send(body: SendToClientsBodyModel) {
    return this.api.post<SendNotificationResponse>('/api/v1/notifications/send/', body);
  }

  list(query?: ListSentNotificationsQueryModel) {
    return this.api.get<NotificationsListResponse>('/api/v1/notifications/', {
      params: toQueryParams(query),
    });
  }

  listByClient(clientId: string, query?: PaginatedQueryModel) {
    return this.api.get<NotificationsListResponse>(`/api/v1/notifications/by-client/${clientId}/`, {
      params: toQueryParams(query),
    });
  }

  getById(id: string) {
    return this.api.get<NotificationDetailResponse>(`/api/v1/notifications/${id}/`);
  }
}
