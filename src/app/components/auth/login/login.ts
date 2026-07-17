import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { email, form, FormField, required } from '@angular/forms/signals';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ApiError } from '@services/api/api-error';
import { AuthService } from '@services/auth/auth.service';
import { ThemeController } from '@layout/theme-controller/theme-controller';
import { safeInternalRedirectPath } from '@utils/safe-redirect-url';
import { LoginBodyModel } from '../auth.models';
import { UserStore } from '@stores/user/user.store';
import { ThemeStore } from '@stores/theme/theme.store';

@Component({
  selector: 'app-login',
  imports: [ThemeController, RouterLink, FormField],
  templateUrl: './login.html',
})
export class Login {
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private userStore = inject(UserStore);
  private themeStore = inject(ThemeStore);

  isDark = computed(() => this.themeStore.isDark());

  loginForm = form(
    signal<LoginBodyModel>({
      email: '',
      password: '',
    }),
    (schema) => {
      required(schema.email);
      email(schema.email);
      required(schema.password);
    },
  );

  submitLoginLoading = signal(false);
  errorMessage = signal<string | null>(null);

  signInWithEmail(event: SubmitEvent) {
    event.preventDefault();
    this.errorMessage.set(null);
    this.submitLoginLoading.set(true);
    this.authService
      .login(this.loginForm().value())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (response) => {
          this.submitLoginLoading.set(false);
          this.userStore.setSession({
            user: response.object.user,
            access: response.object.accessToken,
          });
          this.loginForm().reset();
          const redirectUrl = this.activatedRoute.snapshot.queryParamMap.get('redirectUrl');
          const targetUrl = safeInternalRedirectPath(redirectUrl);
          await this.router.navigateByUrl(targetUrl);
        },
        error: (err: unknown) => {
          this.submitLoginLoading.set(false);
          this.loginForm.password().value.set('');
          const message = err instanceof ApiError ? err.message : 'Une erreur est survenue.';
          this.errorMessage.set(message);
        },
      });
  }
}
