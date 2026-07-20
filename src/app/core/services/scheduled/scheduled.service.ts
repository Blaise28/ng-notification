import { inject, Service } from '@angular/core';

import {
  CreateScheduledBodyModel,
  ScheduledListResponse,
  ScheduledResponse,
} from '@components/scheduled/scheduled.models';
import { Api } from '@services/api/api';

@Service()
export class ScheduledService {
  private readonly api = inject(Api);

  create(body: CreateScheduledBodyModel) {
    return this.api.post<ScheduledResponse>('/api/v1/scheduled', body);
  }

  list() {
    return this.api.get<ScheduledListResponse>('/api/v1/scheduled');
  }

  getById(id: string) {
    return this.api.get<ScheduledResponse>(`/api/v1/scheduled/${id}`);
  }

  cancel(id: string) {
    return this.api.delete<ScheduledResponse>(`/api/v1/scheduled/${id}`);
  }
}
