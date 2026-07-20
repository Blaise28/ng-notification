import {
  ListResponseModel,
  PaginatedQueryModel,
  SingleResponseModel,
} from '@models/pagination.models';

export type TemplateChannel = 'email' | 'sms' | 'whatsapp';

export const TEMPLATE_VARIABLE_TOKENS = [
  'displayName',
  'firstName',
  'lastName',
  'companyName',
  'phone',
  'email',
] as const;

export type TemplateVariableToken = (typeof TEMPLATE_VARIABLE_TOKENS)[number];

export const TEMPLATE_VARIABLE_LABELS: Record<TemplateVariableToken, string> = {
  displayName: 'Nom affiché',
  firstName: 'Prénom',
  lastName: 'Nom',
  companyName: 'Entreprise',
  phone: 'Téléphone',
  email: 'E-mail',
};

export interface CreateTemplateBodyModel {
  name: string;
  slug: string;
  channel: TemplateChannel;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  css?: string;
  smsBody?: string;
  whatsappContentSid?: string;
  variables?: string[];
  isDefault?: boolean;
}

export type UpdateTemplateBodyModel = Partial<CreateTemplateBodyModel>;

export interface ListTemplatesQueryModel extends PaginatedQueryModel {
  channel?: TemplateChannel;
}

export interface TemplateModel {
  id: string;
  name: string;
  slug: string;
  channel: TemplateChannel;
  subject?: string | null;
  htmlBody?: string | null;
  textBody?: string | null;
  css?: string | null;
  smsBody?: string | null;
  whatsappContentSid?: string | null;
  variables: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TemplateResponse = SingleResponseModel<TemplateModel>;
export type TemplatesListResponse = ListResponseModel<TemplateModel>;
export type DeleteTemplateResponse = SingleResponseModel<{ id: string }>;
