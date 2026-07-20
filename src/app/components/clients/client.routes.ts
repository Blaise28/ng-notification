import { Routes } from '@angular/router';

import { ClientDetail } from './client-detail/client-detail';
import { ClientForm } from './client-form/client-form';
import { ClientList } from './client-list/client-list';

export const clientRoutes: Routes = [
  { path: '', component: ClientList },
  { path: 'new', component: ClientForm },
  { path: ':id', component: ClientDetail },
  { path: ':id/edit', component: ClientForm },
];
