import { Component, computed, inject, signal } from '@angular/core';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  Alert02Icon,
  CancelCircleIcon,
  CheckmarkCircleIcon,
  Message02Icon,
  Notification02Icon,
  SettingError04Icon,
} from '@hugeicons/core-free-icons';

import { DialogService, type ToastType } from '@services/dialog/dialog.service';

@Component({
  selector: 'app-dialogs',
  imports: [HugeiconsIconComponent],
  templateUrl: './dialogs.html',
  styleUrl: './dialogs.scss',
})
export class Dialogs {
  private readonly dialogService = inject(DialogService);
  protected readonly cancelCircleIcon = signal(CancelCircleIcon);

  protected readonly toasts = computed(() => this.dialogService.getToast()());
  protected readonly toastTitles: Record<ToastType, string> = {
    success: 'Opération réussie',
    error: 'Une erreur est survenue',
    info: 'Information importante',
    warning: 'Attention requise',
  };

  protected readonly open = computed(() => this.dialogService.getConfirmDialog()() !== null);
  protected readonly confirmDialog = computed(() => this.dialogService.getConfirmDialog()());

  alertClass(type: string): string {
    const map: Record<string, string> = {
      success: 'alert-success',
      info: 'alert-info',
      warning: 'alert-warning',
      error: 'alert-error',
    };
    return map[type] ?? '';
  }

  getToastIcon(type: string): IconSvgObject {
    const map: Record<string, IconSvgObject> = {
      success: CheckmarkCircleIcon,
      info: Message02Icon,
      warning: Alert02Icon,
      error: SettingError04Icon,
    };
    return map[type] ?? Notification02Icon;
  }

  dismiss(id: string): void {
    this.dialogService.dismiss(id);
  }

  getDefaultToastTitle(type: ToastType): string {
    return this.toastTitles[type];
  }

  async onConfirm(): Promise<void> {
    await this.dialogService.confirmAction();
  }

  onCancel(): void {
    this.dialogService.cancelAction();
  }

  dialogIconBg(type: string): string {
    const map: Record<string, string> = {
      success: 'bg-success/25 text-success',
      info: 'bg-info/25 text-info',
      warning: 'bg-warning/25 text-warning',
      error: 'bg-error/25 text-error',
    };
    return map[type] ?? '';
  }
}
