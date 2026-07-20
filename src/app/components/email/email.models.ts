import { ClientType } from '@components/clients/client.models';

export type EmailJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
export type EmailDeliveryStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED';

export interface SendEmailBodyModel {
  to?: string;
  subject: string;
  html: string;
  text?: string;
  clientId?: string;
}

export interface BroadcastEmailBodyModel {
  subject: string;
  html: string;
  text?: string;
  clientIds?: string[];
  filter?: { type?: ClientType };
}

export interface EmailDeliveryModel {
  id: string;
  toEmail: string;
  status: EmailDeliveryStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
}

export interface EmailJobModel {
  id: string;
  subject: string;
  status: EmailJobStatus;
  recipientCount: number;
  deliveries: EmailDeliveryModel[];
  createdAt: string;
}

export interface EmailJobResponse {
  object: { success: true; job: EmailJobModel };
}
