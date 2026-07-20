import {
  ListResponseModel,
  PaginatedQueryModel,
  SingleResponseModel,
} from '@models/pagination.models';

export type TemplateChannel = 'email' | 'sms' | 'whatsapp' | 'multi';

export const TEMPLATE_VARIABLE_TOKENS = [
  'displayName',
  'firstName',
  'lastName',
  'companyName',
  'phone',
  'email',
  'organizationName',
] as const;

export interface CreateTemplateBodyModel {
  organizationId?: string;
  name: string;
  slug: string;
  channel: TemplateChannel;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  smsBody?: string;
  whatsappContentSid?: string;
  isDefault?: boolean;
}

export type UpdateTemplateBodyModel = Partial<Omit<CreateTemplateBodyModel, 'organizationId'>>;

export interface ListTemplatesQueryModel extends PaginatedQueryModel {
  organizationId?: string;
}

export interface TemplateModel {
  id: string;
  organizationId?: string | null;
  name: string;
  slug: string;
  channel: TemplateChannel;
  subject?: string | null;
  htmlBody?: string | null;
  textBody?: string | null;
  smsBody?: string | null;
  whatsappContentSid?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TemplateResponse = SingleResponseModel<TemplateModel>;
export type TemplatesListResponse = ListResponseModel<TemplateModel>;
export type DeleteTemplateResponse = SingleResponseModel<{ id: string }>;
