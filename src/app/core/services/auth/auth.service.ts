import { inject, Service } from '@angular/core';

import {
  AuthSuccessResponse,
  LoginBodyModel,
  MeSuccessResponse,
  RegisterBodyModel,
} from '@components/auth/auth.models';
import { Api } from '@services/api/api';

@Service()
export class AuthService {
  private readonly api = inject(Api);

  login(body: LoginBodyModel) {
    return this.api.post<AuthSuccessResponse>('/api/v1/auth/login', body);
  }

  register(body: RegisterBodyModel) {
    return this.api.post<AuthSuccessResponse>('/api/v1/auth/register', body);
  }

  me() {
    return this.api.get<MeSuccessResponse>('/api/v1/auth/me');
  }
}
