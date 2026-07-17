import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserStore } from '@stores/user/user.store';

export const authGuard: CanActivateFn = async (_route, state) => {
  const userStore = inject(UserStore);
  const router = inject(Router);

  await userStore.hydrate();

  if (userStore.access()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { redirectUrl: state.url },
  });
};
