import { inject, Service } from '@angular/core';

import {
  CreateScheduledBodyModel,
  ListScheduledQueryModel,
  ScheduledListResponse,
  ScheduledResponse,
} from '@components/scheduled/scheduled.models';
import { Api } from '@services/api/api';
import { toQueryParams } from '@utils/api-query';

@Service()
export class ScheduledService {
  private readonly api = inject(Api);

  create(body: CreateScheduledBodyModel) {
    return this.api.post<ScheduledResponse>('/api/v1/scheduled', body);
  }

  list(query?: ListScheduledQueryModel) {
    return this.api.get<ScheduledListResponse>('/api/v1/scheduled', {
      params: toQueryParams(query),
    });
  }

  getById(id: string) {
    return this.api.get<ScheduledResponse>(`/api/v1/scheduled/${id}`);
  }

  cancel(id: string) {
    return this.api.delete<ScheduledResponse>(`/api/v1/scheduled/${id}`);
  }
}
