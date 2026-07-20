import { inject, Service } from '@angular/core';

import {
  CreateOrganizationBodyModel,
  DeleteOrganizationResponse,
  ListOrganizationsQueryModel,
  OrganizationResponse,
  OrganizationsListResponse,
  UpdateOrganizationBodyModel,
} from '@components/organizations/organization.models';
import { Api } from '@services/api/api';
import { toQueryParams } from '@utils/api-query';

@Service()
export class OrganizationService {
  private readonly api = inject(Api);

  create(body: CreateOrganizationBodyModel) {
    return this.api.post<OrganizationResponse>('/api/v1/organizations', body);
  }

  list(query?: ListOrganizationsQueryModel) {
    return this.api.get<OrganizationsListResponse>('/api/v1/organizations', {
      params: toQueryParams(query),
    });
  }

  getById(id: string) {
    return this.api.get<OrganizationResponse>(`/api/v1/organizations/${id}`);
  }

  update(id: string, body: UpdateOrganizationBodyModel) {
    return this.api.patch<OrganizationResponse>(`/api/v1/organizations/${id}`, body);
  }

  remove(id: string) {
    return this.api.delete<DeleteOrganizationResponse>(`/api/v1/organizations/${id}`);
  }
}
