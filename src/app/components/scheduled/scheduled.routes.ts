import { Routes } from '@angular/router';

import { ScheduledDetail } from './scheduled-detail/scheduled-detail';
import { ScheduledForm } from './scheduled-form/scheduled-form';
import { ScheduledList } from './scheduled-list/scheduled-list';

export const scheduledRoutes: Routes = [
  { path: '', component: ScheduledList },
  { path: 'new', component: ScheduledForm },
  { path: ':id', component: ScheduledDetail },
];
