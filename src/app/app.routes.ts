import { Routes } from '@angular/router';

import { Login } from '@components/auth/login/login';
import { Register } from '@components/auth/register/register';
import { Home } from '@components/home/home';
import { authGuard } from '@guards/auth.guard';
import { noAuthGuard } from '@guards/no-auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [noAuthGuard],
    component: Login,
  },
  {
    path: 'register',
    canActivate: [noAuthGuard],
    component: Register,
  },
  {
    path: '',
    canActivate: [authGuard],
    component: Home,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
