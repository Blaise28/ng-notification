import {
  ListResponseModel,
  PaginatedQueryModel,
  SingleResponseModel,
} from '@models/pagination.models';

export type ClientType = 'individual' | 'business';

export interface CreateClientBodyModel {
  type: ClientType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  taxId?: string;
  contactPersonName?: string;
  phoneE164: string;
  email?: string;
  locale?: string;
  optInSms?: boolean;
  optInWhatsapp?: boolean;
  optInEmail?: boolean;
  isActive?: boolean;
  subscriptionEndAt?: string;
  metadata?: Record<string, unknown>;
}

export type UpdateClientBodyModel = Partial<CreateClientBodyModel>;

export interface ListClientsQueryModel extends PaginatedQueryModel {
  type?: ClientType;
  optInSms?: boolean;
  optInWhatsapp?: boolean;
  optInEmail?: boolean;
  subscriptionEndAtFrom?: string;
  subscriptionEndAtTo?: string;
}

export interface ClientModel {
  id: string;
  type: ClientType;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  taxId?: string | null;
  contactPersonName?: string | null;
  phoneE164: string;
  email?: string | null;
  locale: string;
  optInSms: boolean;
  optInWhatsapp: boolean;
  optInEmail: boolean;
  isActive: boolean;
  subscriptionEndAt?: string | null;
  metadata: Record<string, unknown>;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export type ClientResponse = SingleResponseModel<ClientModel>;
export type ClientsListResponse = ListResponseModel<ClientModel>;
export type DeleteClientResponse = SingleResponseModel<{ id: string }>;

export interface ClientsStatsModel {
  total: number;
  active: number;
  optIn: { email: number; sms: number; whatsapp: number };
}

export type ClientsStatsResponse = SingleResponseModel<ClientsStatsModel>;

export interface ClientImportRowDataModel {
  type?: ClientType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  contactPersonName?: string;
  taxId?: string;
  phoneE164: string;
  email?: string;
  locale?: string;
  optInSms?: boolean;
  optInWhatsapp?: boolean;
  optInEmail?: boolean;
  subscriptionEndAt?: string;
}

export interface ClientImportRowResultModel {
  row: number;
  data: ClientImportRowDataModel;
  status: 'success' | 'updated' | 'error';
  message?: string;
  errors?: string[];
  clientId?: string;
}

export interface ClientImportJobModel {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  progressPercentage: number;
  successCount: number;
  updatedCount: number;
  errorCount: number;
  results: ClientImportRowResultModel[];
  createdAt: string;
  updatedAt: string;
}

export type ClientImportJobResponse = SingleResponseModel<ClientImportJobModel>;
