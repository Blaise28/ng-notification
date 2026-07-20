import { Routes } from '@angular/router';

import { NotificationCompose } from './notification-compose/notification-compose';
import { NotificationDetail } from './notification-detail/notification-detail';
import { NotificationHistoryList } from './notification-history-list/notification-history-list';

export const notificationRoutes: Routes = [
  { path: '', component: NotificationHistoryList },
  { path: 'compose', component: NotificationCompose },
  { path: ':id', component: NotificationDetail },
];
