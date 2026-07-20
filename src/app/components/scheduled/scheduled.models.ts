import { ClientType } from '@components/clients/client.models';

export type ScheduledChannel = 'sms' | 'whatsapp' | 'email' | 'multi';
export type ScheduledStatus = 'PENDING' | 'QUEUED' | 'CANCELLED' | 'FAILED';
export type ScheduledTargetType = 'all' | 'clientId' | 'filter';

export interface ScheduledTargetModel {
  type: ScheduledTargetType;
  clientId?: string;
  filterType?: ClientType;
}

export interface CreateScheduledBodyModel {
  channel: ScheduledChannel;
  sendAt: string;
  payload: Record<string, unknown>;
  target: ScheduledTargetModel;
}

export interface ScheduledNotificationModel {
  id: string;
  channel: ScheduledChannel;
  sendAt: string;
  payload: Record<string, unknown>;
  targetType: ScheduledTargetType;
  targetValue: Record<string, unknown>;
  status: ScheduledStatus;
  bullJobId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface ScheduledResponse {
  object: { success: true; scheduled: ScheduledNotificationModel };
}

export interface ScheduledListResponse {
  object: { success: true; items: ScheduledNotificationModel[] };
}
