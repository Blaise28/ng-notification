import { inject, Service } from '@angular/core';

import {
  BroadcastSmsBodyModel,
  SendSmsBodyModel,
  SmsJobResponse,
} from '@components/sms/sms.models';
import { Api } from '@services/api/api';

@Service()
export class SmsService {
  private readonly api = inject(Api);

  send(body: SendSmsBodyModel) {
    return this.api.post<SmsJobResponse>('/api/v1/sms', body);
  }

  broadcast(body: BroadcastSmsBodyModel) {
    return this.api.post<SmsJobResponse>('/api/v1/sms/broadcast', body);
  }

  getJob(id: string) {
    return this.api.get<SmsJobResponse>(`/api/v1/sms/jobs/${id}`);
  }
}
