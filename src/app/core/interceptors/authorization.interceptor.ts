import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '@environments/environment';
import { UserStore } from '@stores/user/user.store';

export const authorizationInterceptor: HttpInterceptorFn = (req, next) => {
  const userStore = inject(UserStore);
  const token = userStore.access();

  const setHeaders: Record<string, string> = {
    'X-App-Version': environment.appVersionUuid,
  };

  if (token) {
    setHeaders['Authorization'] = `Bearer ${token}`;
  }

  return next(
    req.clone({
      setHeaders,
    }),
  );
};
