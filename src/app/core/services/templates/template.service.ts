import { inject, Service } from '@angular/core';

import {
  CreateTemplateBodyModel,
  DeleteTemplateResponse,
  ListTemplatesQueryModel,
  TemplateResponse,
  TemplatesListResponse,
  UpdateTemplateBodyModel,
} from '@components/templates/template.models';
import { Api } from '@services/api/api';
import { toQueryParams } from '@utils/api-query';

@Service()
export class TemplateService {
  private readonly api = inject(Api);

  create(body: CreateTemplateBodyModel) {
    return this.api.post<TemplateResponse>('/api/v1/templates/', body);
  }

  list(query?: ListTemplatesQueryModel) {
    return this.api.get<TemplatesListResponse>('/api/v1/templates/', {
      params: toQueryParams(query),
    });
  }

  getById(id: string) {
    return this.api.get<TemplateResponse>(`/api/v1/templates/${id}/`);
  }

  duplicate(id: string) {
    return this.api.post<TemplateResponse>(`/api/v1/templates/${id}/duplicate/`, {});
  }

  update(id: string, body: UpdateTemplateBodyModel) {
    return this.api.patch<TemplateResponse>(`/api/v1/templates/${id}/`, body);
  }

  remove(id: string) {
    return this.api.delete<DeleteTemplateResponse>(`/api/v1/templates/${id}/`);
  }
}
