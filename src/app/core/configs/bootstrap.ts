import { inject } from '@angular/core';

import { ThemeStore } from '@stores/theme/theme.store';
import { UserStore } from '@stores/user/user.store';

export async function runAppBootstrap(): Promise<void> {
  const themeStore = inject(ThemeStore);
  const userStore = inject(UserStore);

  themeStore.initialize();
  await userStore.hydrate();
}
