import { ClientType } from '@components/clients/client.models';

export type SmsJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
export type SmsDeliveryStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'UNDELIVERED';

export interface SendSmsBodyModel {
  to?: string;
  body: string;
  clientId?: string;
}

export interface BroadcastSmsBodyModel {
  body: string;
  clientIds?: string[];
  filter?: { type?: ClientType };
}

export interface SmsDeliveryModel {
  id: string;
  toE164: string;
  status: SmsDeliveryStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
}

export interface SmsJobModel {
  id: string;
  body: string;
  status: SmsJobStatus;
  recipientCount: number;
  deliveries: SmsDeliveryModel[];
  createdAt: string;
}

export interface SmsJobResponse {
  object: SmsJobModel;
}
