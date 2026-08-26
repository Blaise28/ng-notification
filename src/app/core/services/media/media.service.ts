import { inject, Service } from '@angular/core';

import {
  DeleteMediaResponse,
  ListMediaQueryModel,
  MediaListResponse,
  MediaResponse,
} from '@components/media/media.models';
import { Api } from '@services/api/api';
import { toQueryParams } from '@utils/api-query';

@Service()
export class MediaService {
  private readonly api = inject(Api);

  list(query?: ListMediaQueryModel) {
    return this.api.get<MediaListResponse>('/api/v1/media/', { params: toQueryParams(query) });
  }

  upload(file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.api.post<MediaResponse>('/api/v1/media/', body);
  }

  remove(id: string) {
    return this.api.delete<DeleteMediaResponse>(`/api/v1/media/${id}/`);
  }
}
