import { inject, Service } from '@angular/core';

import { Api } from '@services/api/api';

export interface HealthStatusResponse {
  status: 'ok' | 'degraded';
}

export interface ReadinessResponse {
  status: 'ok' | 'degraded';
  checks: { postgres: 'up' | 'down'; redis: 'up' | 'down' };
}

@Service()
export class HealthService {
  private readonly api = inject(Api);

  live() {
    return this.api.get<HealthStatusResponse>('/api/v1/health/live');
  }

  ready() {
    return this.api.get<ReadinessResponse>('/api/v1/health/ready');
  }
}
