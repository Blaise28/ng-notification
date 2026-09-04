import { inject, Service } from '@angular/core';
import {
  ClientImportJobResponse,
  ClientResponse,
  ClientsListResponse,
  ClientsStatsResponse,
  CreateClientBodyModel,
  DeleteClientResponse,
  ListClientsQueryModel,
  UpdateClientBodyModel,
} from '@components/clients/client.models';
import { Api } from '@services/api/api';
import { toQueryParams } from '@utils/api-query';

@Service()
export class ClientService {
  private readonly api = inject(Api);

  create(body: CreateClientBodyModel) {
    return this.api.post<ClientResponse>('/api/v1/clients/', body);
  }

  list(query?: ListClientsQueryModel) {
    return this.api.get<ClientsListResponse>('/api/v1/clients/', { params: toQueryParams(query) });
  }

  stats() {
    return this.api.get<ClientsStatsResponse>('/api/v1/clients/stats/');
  }

  getById(id: string) {
    return this.api.get<ClientResponse>(`/api/v1/clients/${id}/`);
  }

  update(id: string, body: UpdateClientBodyModel) {
    return this.api.patch<ClientResponse>(`/api/v1/clients/${id}/`, body);
  }

  remove(id: string) {
    return this.api.delete<DeleteClientResponse>(`/api/v1/clients/${id}/`);
  }

  uploadExcelImport(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post<ClientImportJobResponse>('/api/v1/clients/import/file', formData);
  }

  getImportJob(id: string) {
    return this.api.get<ClientImportJobResponse>(`/api/v1/clients/import/${id}`);
  }

  retryImportRows(id: string, rows: { row: number; data: unknown }[]) {
    return this.api.post<ClientImportJobResponse>(`/api/v1/clients/import/${id}/retry`, { rows });
  }

  downloadTemplate() {
    return this.api.getBlob('/api/v1/clients/import/template');
  }
}
