import { Component } from '@angular/core';

import type { ListHeaderModel } from '@globals/models/list.models';
import { List } from '@globals/components/list/list';

@Component({
  selector: 'app-user-list',
  imports: [List],
  templateUrl: './user-list.html',
})
export class UserList {
  protected readonly headers: ListHeaderModel[] = [
    { label: 'Nom', field: ['name'] },
    { label: 'E-mail', field: ['email'] },
    {
      label: 'Rôle',
      field: ['role'],
      format: 'badge',
      valueLabels: { admin: 'Administrateur', operator: 'Opérateur' },
    },
    { label: 'Créé le', field: ['createdAt'], format: 'date' },
  ];
}
