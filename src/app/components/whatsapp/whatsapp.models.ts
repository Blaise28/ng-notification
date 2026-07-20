import { ClientType } from '@components/clients/client.models';

export type WhatsappJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
export type WhatsappDeliveryStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'UNDELIVERED';

export interface SendWhatsappBodyModel {
  to?: string;
  contentSid: string;
  variables?: Record<string, string>;
  clientId?: string;
}

export interface BroadcastWhatsappBodyModel {
  contentSid: string;
  variables?: Record<string, string>;
  clientIds?: string[];
  filter?: { type?: ClientType };
}

export interface WhatsappDeliveryModel {
  id: string;
  toE164: string;
  status: WhatsappDeliveryStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
}

export interface WhatsappJobModel {
  id: string;
  contentSid: string;
  status: WhatsappJobStatus;
  recipientCount: number;
  deliveries: WhatsappDeliveryModel[];
  createdAt: string;
}

export interface WhatsappJobResponse {
  object: { success: true; job: WhatsappJobModel };
}
