import { ClientType } from '@components/clients/client.models';
import { PaginatedQueryModel, PaginatedResultModel } from '@models/pagination.models';

export type NotificationChannel = 'email' | 'sms' | 'whatsapp';
export type SentNotificationMode = 'SINGLE' | 'MULTI' | 'BROADCAST';
export type SentNotificationStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
export type RecipientStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'SKIPPED';

export interface ChannelContentModel {
  email?: { subject: string; html: string; text?: string };
  sms?: { body: string };
  whatsapp?: { contentSid: string; variables?: Record<string, string> };
}

export interface SendToClientsBodyModel {
  channels: NotificationChannel[];
  clientIds?: string[];
  filter?: { type?: ClientType };
  broadcastAll?: boolean;
  organizationId?: string;
  templateId?: string;
  variables?: Record<string, string>;
  content?: ChannelContentModel;
}

export interface SentNotificationRecipientModel {
  id: string;
  sentNotificationId: string;
  clientId?: string | null;
  channel: string;
  toAddress: string;
  displayName?: string | null;
  status: RecipientStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  skipReason?: string | null;
  createdAt: string;
}

export interface SentNotificationModel {
  id: string;
  organizationId?: string | null;
  templateId?: string | null;
  channels: string[];
  mode: SentNotificationMode;
  status: SentNotificationStatus;
  recipientCount: number;
  content: Record<string, unknown>;
  variables: Record<string, string>;
  channelJobRefs: Record<string, unknown>;
  metadata: Record<string, unknown>;
  sentBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SentNotificationDetailModel extends SentNotificationModel {
  recipients: SentNotificationRecipientModel[];
}

export interface ListSentNotificationsQueryModel extends PaginatedQueryModel {
  channel?: NotificationChannel;
  organizationId?: string;
  clientId?: string;
}

export interface SendNotificationResponse {
  object: { success: true; notification: SentNotificationDetailModel };
}

export interface NotificationsListResponse {
  object: { success: true } & PaginatedResultModel<SentNotificationModel>;
}

export interface NotificationDetailResponse {
  object: { success: true; notification: SentNotificationDetailModel };
}
