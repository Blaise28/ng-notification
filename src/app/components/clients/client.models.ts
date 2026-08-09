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
  externalRef?: string;
  metadata?: Record<string, unknown>;
}

export type UpdateClientBodyModel = Partial<CreateClientBodyModel>;

export interface ListClientsQueryModel extends PaginatedQueryModel {
  type?: ClientType;
  optInSms?: boolean;
  optInWhatsapp?: boolean;
  optInEmail?: boolean;
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
  externalRef?: string | null;
  metadata: Record<string, unknown>;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export type ClientResponse = SingleResponseModel<ClientModel>;
export type ClientsListResponse = ListResponseModel<ClientModel>;
export type DeleteClientResponse = SingleResponseModel<{ id: string }>;
