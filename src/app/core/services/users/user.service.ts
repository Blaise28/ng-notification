import { inject, Service } from '@angular/core';

import {
  CreateUserBodyModel,
  UpdateUserBodyModel,
  UserResponse,
} from '@components/users/user.models';
import { Api } from '@services/api/api';

@Service()
export class UserService {
  private readonly api = inject(Api);

  create(body: CreateUserBodyModel) {
    return this.api.post<UserResponse>('/api/v1/auth/users/', body);
  }

  update(id: string, body: UpdateUserBodyModel) {
    return this.api.patch<UserResponse>(`/api/v1/auth/users/${id}/`, body);
  }
}
