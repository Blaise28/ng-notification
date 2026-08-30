import { inject, Service } from '@angular/core';

import {
  BroadcastEmailBodyModel,
  EmailJobResponse,
  SendEmailBodyModel,
} from '@components/email/email.models';
import { Api } from '@services/api/api';

@Service()
export class EmailService {
  private readonly api = inject(Api);

  send(body: SendEmailBodyModel) {
    return this.api.post<EmailJobResponse>('/api/v1/email/', body);
  }

  broadcast(body: BroadcastEmailBodyModel) {
    return this.api.post<EmailJobResponse>('/api/v1/email/broadcast/', body);
  }

  getJob(id: string) {
    return this.api.get<EmailJobResponse>(`/api/v1/email/jobs/${id}/`);
  }
}
