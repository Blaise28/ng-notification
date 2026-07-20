import {
  ListResponseModel,
  PaginatedQueryModel,
  SingleResponseModel,
} from '@models/pagination.models';

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

export type ListOrganizationsQueryModel = PaginatedQueryModel;

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

export type OrganizationResponse = SingleResponseModel<OrganizationModel>;
export type OrganizationsListResponse = ListResponseModel<OrganizationModel>;
export type DeleteOrganizationResponse = SingleResponseModel<{ id: string }>;
