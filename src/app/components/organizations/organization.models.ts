export interface CreateOrganizationBodyModel {
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  supportEmail?: string;
  websiteUrl?: string;
}

export type UpdateOrganizationBodyModel = Partial<CreateOrganizationBodyModel>;

export interface OrganizationModel {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  supportEmail?: string | null;
  websiteUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationResponse {
  object: { success: true; organization: OrganizationModel };
}

export interface OrganizationsListResponse {
  object: { success: true; items: OrganizationModel[] };
}

export interface DeleteOrganizationResponse {
  object: { success: true; id: string };
}
