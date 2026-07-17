import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { email, form, FormField, required } from '@angular/forms/signals';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ApiError } from '@services/api/api-error';
import { AuthService } from '@services/auth/auth.service';
import { ThemeController } from '@layout/theme-controller/theme-controller';
import { RegisterBodyModel, UserRole } from '../auth.models';
import { UserStore } from '@stores/user/user.store';

@Component({
  selector: 'app-register',
  imports: [ThemeController, RouterLink, FormField],
  templateUrl: './register.html',
})
export class Register {
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private authService = inject(AuthService);
  private userStore = inject(UserStore);

  registerForm = form(
    signal<RegisterBodyModel>({
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
      required(schema.role);
    },
  );

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  setRole(role: UserRole): void {
    this.registerForm.role().value.set(role);
  }

  submitRegister(event: SubmitEvent) {
    event.preventDefault();
    this.errorMessage.set(null);
    this.isLoading.set(true);
    this.authService
      .register(this.registerForm().value())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (response) => {
          this.isLoading.set(false);
          this.userStore.setSession({
            user: response.object.user,
            access: response.object.accessToken,
          });
          await this.router.navigate(['/']);
        },
        error: (err: unknown) => {
          this.isLoading.set(false);
          const message = err instanceof ApiError ? err.message : 'Une erreur est survenue.';
          this.errorMessage.set(message);
        },
      });
  }
}
