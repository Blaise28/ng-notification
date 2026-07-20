import { Routes } from '@angular/router';

import { OrganizationDetail } from './organization-detail/organization-detail';
import { OrganizationForm } from './organization-form/organization-form';
import { OrganizationList } from './organization-list/organization-list';

export const organizationRoutes: Routes = [
  { path: '', component: OrganizationList },
  { path: 'new', component: OrganizationForm },
  { path: ':id', component: OrganizationDetail },
  { path: ':id/edit', component: OrganizationForm },
];
