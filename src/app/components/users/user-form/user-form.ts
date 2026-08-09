import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { email, form, FormField, required } from '@angular/forms/signals';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Password } from '@globals/components/password/password';
import { ApiError } from '@services/api/api-error';
import { DialogService } from '@services/dialog/dialog.service';
import { UserService } from '@services/users/user.service';
import { UserRole } from '@components/auth/auth.models';

interface UserFormValue {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

@Component({
  selector: 'app-user-form',
  imports: [RouterLink, FormField, Password],
  templateUrl: './user-form.html',
})
export class UserForm {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly dialogService = inject(DialogService);

  protected readonly userForm = form(
    signal<UserFormValue>({
      name: '',
      email: '',
      password: '',
      role: 'operator',
    }),
    (schema) => {
      required(schema.name);
      required(schema.email);
      email(schema.email);
      required(schema.password);
    },
  );

  protected readonly submitLoading = signal(false);

  submit(event: SubmitEvent): void {
    event.preventDefault();
    this.submitLoading.set(true);

    this.userService
      .create(this.userForm().value())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async () => {
          this.submitLoading.set(false);
          this.dialogService.showToast({
            type: 'success',
            message: 'Opérateur créé',
          });
          await this.router.navigate(['/users']);
        },
        error: (err: unknown) => {
          this.submitLoading.set(false);
          const message = err instanceof ApiError ? err.message : 'Une erreur est survenue.';
          this.dialogService.showToast({ type: 'error', message });
        },
      });
  }
}
