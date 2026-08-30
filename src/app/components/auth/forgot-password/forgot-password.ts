import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { email, form, FormField, maxLength, required } from '@angular/forms/signals';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Password } from '@globals/components/password/password';
import { ApiError } from '@services/api/api-error';
import { AuthService } from '@services/auth/auth.service';
import { DialogService } from '@services/dialog/dialog.service';
import { ThemeController } from '@layout/theme-controller/theme-controller';

type Step = 'email' | 'otp';

interface EmailFormValue {
  email: string;
}

interface ResetFormValue {
  otp: string;
  password: string;
}

@Component({
  selector: 'app-forgot-password',
  imports: [ThemeController, RouterLink, FormField, Password],
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly dialogService = inject(DialogService);

  protected readonly step = signal<Step>('email');
  protected readonly submitLoading = signal(false);
  protected readonly resendLoading = signal(false);

  protected readonly emailForm = form(signal<EmailFormValue>({ email: '' }), (schema) => {
    required(schema.email);
    email(schema.email);
  });

  protected readonly resetForm = form(
    signal<ResetFormValue>({ otp: '', password: '' }),
    (schema) => {
      required(schema.otp);
      maxLength(schema.otp, 6);
      required(schema.password);
    },
  );

  submitEmail(event: SubmitEvent): void {
    event.preventDefault();
    this.submitLoading.set(true);

    this.authService
      .requestOtp(this.emailForm().value())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.submitLoading.set(false);
          this.step.set('otp');
          this.dialogService.showToast({ type: 'success', message: response.object.message });
        },
        error: (err: unknown) => {
          this.submitLoading.set(false);
          const message = err instanceof ApiError ? err.message : 'Une erreur est survenue.';
          this.dialogService.showToast({ type: 'error', message });
        },
      });
  }

  resendOtp(): void {
    this.resendLoading.set(true);
    this.authService
      .requestOtp(this.emailForm().value())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.resendLoading.set(false);
          this.dialogService.showToast({ type: 'success', message: response.object.message });
        },
        error: (err: unknown) => {
          this.resendLoading.set(false);
          const message = err instanceof ApiError ? err.message : 'Une erreur est survenue.';
          this.dialogService.showToast({ type: 'error', message });
        },
      });
  }

  backToEmail(): void {
    this.step.set('email');
    this.resetForm().reset();
  }

  submitReset(event: SubmitEvent): void {
    event.preventDefault();
    this.submitLoading.set(true);

    this.authService
      .resetPassword({
        email: this.emailForm().value().email,
        ...this.resetForm().value(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (response) => {
          this.submitLoading.set(false);
          this.dialogService.showToast({ type: 'success', message: response.object.message });
          await this.router.navigateByUrl('/login');
        },
        error: (err: unknown) => {
          this.submitLoading.set(false);
          this.resetForm.otp().value.set('');
          const message = err instanceof ApiError ? err.message : 'Une erreur est survenue.';
          this.dialogService.showToast({ type: 'error', message });
        },
      });
  }
}
