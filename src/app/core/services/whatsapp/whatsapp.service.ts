import { inject, Service } from '@angular/core';

import {
  BroadcastWhatsappBodyModel,
  SendWhatsappBodyModel,
  WhatsappJobResponse,
} from '@components/whatsapp/whatsapp.models';
import { Api } from '@services/api/api';

@Service()
export class WhatsappService {
  private readonly api = inject(Api);

  send(body: SendWhatsappBodyModel) {
    return this.api.post<WhatsappJobResponse>('/api/v1/whatsapp', body);
  }

  broadcast(body: BroadcastWhatsappBodyModel) {
    return this.api.post<WhatsappJobResponse>('/api/v1/whatsapp/broadcast', body);
  }

  getJob(id: string) {
    return this.api.get<WhatsappJobResponse>(`/api/v1/whatsapp/jobs/${id}`);
  }
}
