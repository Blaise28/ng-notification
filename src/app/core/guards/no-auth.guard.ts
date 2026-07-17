import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { safeInternalRedirectPath } from '@utils/safe-redirect-url';
import { UserStore } from '@stores/user/user.store';

export const noAuthGuard: CanActivateFn = async (_route, state) => {
  const userStore = inject(UserStore);
  const router = inject(Router);

  await userStore.hydrate();

  if (!userStore.access()) {
    return true;
  }

  const parsed = router.parseUrl(state.url);
  const raw = parsed.queryParams['redirectUrl'];
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const target = safeInternalRedirectPath(typeof candidate === 'string' ? candidate : undefined);
  return router.parseUrl(target);
};
