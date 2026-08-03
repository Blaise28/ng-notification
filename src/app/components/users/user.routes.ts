import { Routes } from '@angular/router';

import { adminGuard } from '@guards/admin.guard';
import { UserForm } from './user-form/user-form';
import { UserList } from './user-list/user-list';

export const userRoutes: Routes = [
  { path: '', component: UserList, canActivate: [adminGuard] },
  { path: 'new', component: UserForm, canActivate: [adminGuard] },
];
