import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, FormField, required } from '@angular/forms/signals';

import type { ListAction, ListHeaderModel } from '@globals/models/list.models';
import { List } from '@globals/components/list/list';
import { ApiError } from '@services/api/api-error';
import { DialogService } from '@services/dialog/dialog.service';
import { UserService } from '@services/users/user.service';
import { UserRole } from '@components/auth/auth.models';
import { UserListItemModel } from '../user.models';

interface EditUserFormValue {
  name: string;
  role: UserRole;
  isActive: boolean;
}

@Component({
  selector: 'app-user-list',
  imports: [List, FormField],
  templateUrl: './user-list.html',
})
export class UserList {
  private readonly destroyRef = inject(DestroyRef);
  private readonly userService = inject(UserService);
  private readonly dialogService = inject(DialogService);
  private readonly list = viewChild(List);

  protected readonly headers: ListHeaderModel[] = [
    { label: 'Nom', field: ['name'] },
    { label: 'E-mail', field: ['email'] },
    {
      label: 'Rôle',
      field: ['role'],
      format: 'badge',
      valueLabels: { admin: 'Administrateur', operator: 'Opérateur' },
    },
    {
      label: 'Actif',
      field: ['isActive'],
      format: 'boolean',
      boolean: {
        type: 'badge',
        trueLabel: 'Actif',
        falseLabel: 'Inactif',
        trueBadgeClass: 'badge-success',
        falseBadgeClass: 'badge-error',
      },
    },
    { label: 'Créé le', field: ['createdAt'], format: 'date' },
  ];

  protected readonly actions: ListAction[] = [
    {
      name: 'Modifier',
      callback: (line) => this.openEditDialog(line as UserListItemModel),
    },
  ];

  protected readonly editDialogOpen = signal(false);
  protected readonly editingUserId = signal<string | null>(null);
  protected readonly submitLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly editForm = form(
    signal<EditUserFormValue>({ name: '', role: 'operator', isActive: true }),
    (schema) => {
      required(schema.name);
    },
  );

  openEditDialog(user: UserListItemModel): void {
    this.errorMessage.set(null);
    this.editingUserId.set(user.id);
    this.editForm().value.set({
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    });
    this.editDialogOpen.set(true);
  }

  closeEditDialog(): void {
    this.editDialogOpen.set(false);
    this.editingUserId.set(null);
  }

  submitEdit(event: SubmitEvent): void {
    event.preventDefault();
    const userId = this.editingUserId();
    if (!userId) {
      return;
    }

    this.errorMessage.set(null);
    this.submitLoading.set(true);

    this.userService
      .update(userId, this.editForm().value())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitLoading.set(false);
          this.closeEditDialog();
          this.list()?.reloadList();
          this.dialogService.showToast({ type: 'success', message: 'Utilisateur mis à jour' });
        },
        error: (err: unknown) => {
          this.submitLoading.set(false);
          const message = err instanceof ApiError ? err.message : 'Une erreur est survenue.';
          this.errorMessage.set(message);
          this.dialogService.showToast({ type: 'error', message });
        },
      });
  }
}
