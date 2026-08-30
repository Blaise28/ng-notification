import { inject, Service } from '@angular/core';

import {
  AnalyticsSummaryQueryModel,
  AnalyticsSummaryResponse,
  AnalyticsTrendResponse,
} from '@components/home/home.models';
import { Api } from '@services/api/api';
import { toQueryParams } from '@utils/api-query';

@Service()
export class AnalyticsService {
  private readonly api = inject(Api);

  summary(query?: AnalyticsSummaryQueryModel) {
    return this.api.get<AnalyticsSummaryResponse>('/api/v1/analytics/summary/', {
      params: toQueryParams(query),
    });
  }

  trend(days = 30) {
    return this.api.get<AnalyticsTrendResponse>('/api/v1/analytics/trend/', {
      params: toQueryParams({ days }),
    });
  }
}
