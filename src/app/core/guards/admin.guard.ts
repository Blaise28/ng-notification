import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserStore } from '@stores/user/user.store';

export const adminGuard: CanActivateFn = () => {
  const userStore = inject(UserStore);
  const router = inject(Router);

  if (userStore.user()?.role === 'admin') {
    return true;
  }

  return router.createUrlTree(['/']);
};
