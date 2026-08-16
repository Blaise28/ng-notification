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

export const WHATSAPP_LANGUAGE_OPTIONS = [
  { value: 'fr_FR', label: 'Français (fr_FR)' },
  { value: 'en_US', label: 'Anglais US (en_US)' },
  { value: 'en_GB', label: 'Anglais UK (en_GB)' },
  { value: 'es', label: 'Espagnol (es)' },
  { value: 'de', label: 'Allemand (de)' },
] as const;

export interface CreateTemplateBodyModel {
  name: string;
  slug: string;
  channel: TemplateChannel;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  css?: string;
  smsBody?: string;
  whatsappTemplateName?: string;
  whatsappTemplateLanguage?: string;
  whatsappVariableKeys?: string[];
  variables?: string[];
  isDefault?: boolean;
}

export type UpdateTemplateBodyModel = Partial<CreateTemplateBodyModel>;

export interface ListTemplatesQueryModel extends PaginatedQueryModel {
  channel?: TemplateChannel;
  search?: string;
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
  whatsappTemplateName?: string | null;
  whatsappTemplateLanguage?: string | null;
  whatsappVariableKeys?: string[];
  variables: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TemplateResponse = SingleResponseModel<TemplateModel>;
export type TemplatesListResponse = ListResponseModel<TemplateModel>;
export type DeleteTemplateResponse = SingleResponseModel<{ id: string }>;
