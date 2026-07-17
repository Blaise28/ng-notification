import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authorizationInterceptor } from '@interceptors/authorization.interceptor';
import { runAppBootstrap } from '@configs/bootstrap';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authorizationInterceptor])),
    provideAppInitializer(() => runAppBootstrap()),
  ],
};
