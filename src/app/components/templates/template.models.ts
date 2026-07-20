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
  organizationId: string;
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

export interface ListTemplatesQueryModel {
  organizationId?: string;
}

export interface TemplateModel {
  id: string;
  organizationId: string;
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

export interface TemplateResponse {
  object: { success: true; template: TemplateModel };
}

export interface TemplatesListResponse {
  object: { success: true; items: TemplateModel[] };
}

export interface DeleteTemplateResponse {
  object: { success: true; id: string };
}
