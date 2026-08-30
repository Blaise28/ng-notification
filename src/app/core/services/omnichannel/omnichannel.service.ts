import { inject, Service } from '@angular/core';

import {
  BroadcastOmnichannelBodyModel,
  OmnichannelJobResponse,
  SendOmnichannelBodyModel,
} from '@components/omnichannel/omnichannel.models';
import { Api } from '@services/api/api';

@Service()
export class OmnichannelService {
  private readonly api = inject(Api);

  send(body: SendOmnichannelBodyModel) {
    return this.api.post<OmnichannelJobResponse>('/api/v1/omnichannel/send/', body);
  }

  broadcast(body: BroadcastOmnichannelBodyModel) {
    return this.api.post<OmnichannelJobResponse>('/api/v1/omnichannel/broadcast/', body);
  }

  getJob(id: string) {
    return this.api.get<OmnichannelJobResponse>(`/api/v1/omnichannel/jobs/${id}/`);
  }
}
