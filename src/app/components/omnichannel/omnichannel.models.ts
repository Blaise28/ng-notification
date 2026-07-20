import { ClientType } from '@components/clients/client.models';

export type OmnichannelJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
export type OmnichannelChannel = 'email' | 'sms' | 'whatsapp';

export interface OmnichannelContentModel {
  email?: { subject: string; html: string; text?: string };
  sms?: { body: string };
  whatsapp?: { contentSid: string; variables?: Record<string, string> };
}

export interface SendOmnichannelBodyModel {
  channels: OmnichannelChannel[];
  organizationId?: string;
  templateId?: string;
  variables?: Record<string, string>;
  content?: OmnichannelContentModel;
  clientId?: string;
  toEmail?: string;
  toPhone?: string;
}

export interface BroadcastOmnichannelBodyModel {
  channels: OmnichannelChannel[];
  organizationId?: string;
  templateId?: string;
  variables?: Record<string, string>;
  content?: OmnichannelContentModel;
  clientIds?: string[];
  filter?: { type?: ClientType };
}

export interface OmnichannelJobModel {
  id: string;
  organizationId?: string | null;
  templateId?: string | null;
  channels: string[];
  status: OmnichannelJobStatus;
  channelResults: Record<
    string,
    { queued?: boolean; to?: string; skipped?: boolean; reason?: string }
  >;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface OmnichannelJobResponse {
  object: { success: true; job: OmnichannelJobModel };
}
