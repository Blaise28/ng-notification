import { Routes } from '@angular/router';

import { Login } from '@components/auth/login/login';
import { Home } from '@components/home/home';
import { authGuard } from '@guards/auth.guard';
import { noAuthGuard } from '@guards/no-auth.guard';
import { Layout } from '@layout/layout/layout';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [noAuthGuard],
    component: Login,
  },
  {
    path: '',
    canActivate: [authGuard],
    component: Layout,
    children: [
      { path: '', component: Home },
      {
        path: 'users',
        loadChildren: () => import('@components/users/user.routes').then((m) => m.userRoutes),
      },
      {
        path: 'clients',
        loadChildren: () => import('@components/clients/client.routes').then((m) => m.clientRoutes),
      },
      {
        path: 'templates',
        loadChildren: () =>
          import('@components/templates/template.routes').then((m) => m.templateRoutes),
      },
      {
        path: 'media',
        loadChildren: () => import('@components/media/media.routes').then((m) => m.mediaRoutes),
      },
      {
        path: 'notifications',
        loadChildren: () =>
          import('@components/notifications/notification.routes').then((m) => m.notificationRoutes),
      },
      {
        path: 'scheduled',
        loadChildren: () =>
          import('@components/scheduled/scheduled.routes').then((m) => m.scheduledRoutes),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
