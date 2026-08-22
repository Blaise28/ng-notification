import { SingleResponseModel } from '@models/pagination.models';

export type AnalyticsChannel = 'email' | 'sms' | 'whatsapp';

export interface ChannelDeliveryCountsModel {
  queued: number;
  sent: number;
  delivered: number;
  failed: number;
  undelivered: number;
  total: number;
}

export interface AnalyticsSummaryModel {
  from: string;
  to: string;
  byChannel: Record<AnalyticsChannel, ChannelDeliveryCountsModel>;
  notifications: Record<string, number>;
  totals: { sent: number; delivered: number; failed: number };
}

export interface AnalyticsSummaryQueryModel {
  from?: string;
  to?: string;
}

export interface AnalyticsTrendPointModel {
  date: string;
  email: number;
  sms: number;
  whatsapp: number;
}

export interface AnalyticsTrendModel {
  from: string;
  to: string;
  days: number;
  series: AnalyticsTrendPointModel[];
}

export type AnalyticsSummaryResponse = SingleResponseModel<AnalyticsSummaryModel>;
export type AnalyticsTrendResponse = SingleResponseModel<AnalyticsTrendModel>;
