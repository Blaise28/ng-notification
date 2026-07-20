import { Routes } from '@angular/router';

import { TemplateDetail } from './template-detail/template-detail';
import { TemplateForm } from './template-form/template-form';
import { TemplateList } from './template-list/template-list';

export const templateRoutes: Routes = [
  { path: '', component: TemplateList },
  { path: 'new', component: TemplateForm },
  { path: ':id', component: TemplateDetail },
  { path: ':id/edit', component: TemplateForm },
];
