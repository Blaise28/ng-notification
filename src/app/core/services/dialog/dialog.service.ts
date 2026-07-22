import { Service, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

export type ConfirmDialogVariant = 'warning' | 'error' | 'info' | 'success';

export interface ConfirmDialogOptions {
  type: ConfirmDialogVariant;
  description: string;
  title?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

@Service()
export class DialogService {
  private toasts = signal<ToastOptions[]>([]);
  private confirmDialog = signal<ConfirmDialogOptions | null>(null);

  showToast(toast: { type: ToastType; message: string; title?: string; duration?: number }) {
    this.add(toast);
  }

  showConfirmDialog(options: ConfirmDialogOptions) {
    this.confirmDialog.set(options);
  }

  async confirmAction(onConfirm?: () => void | Promise<void>) {
    const dialog = this.confirmDialog();
    this.closeConfirmDialog();
    if (dialog?.onConfirm) {
      await dialog.onConfirm();
    }
    if (onConfirm) {
      await onConfirm();
    }
  }

  cancelAction(onCancel?: () => void) {
    const dialog = this.confirmDialog();
    this.closeConfirmDialog();
    if (dialog?.onCancel) {
      dialog.onCancel();
    }
    if (onCancel) {
      onCancel();
    }
  }

  closeConfirmDialog() {
    this.confirmDialog.set(null);
  }

  private add(toast: Omit<ToastOptions, 'id'>): string {
    const id = crypto.randomUUID();
    this.toasts.update((t) => [...t, { ...toast, id }]);

    const duration = toast.duration ?? 6000;
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }

  dismiss(id: string) {
    this.toasts.update((t) => t.filter((toast) => toast.id !== id));
  }

  clear() {
    this.toasts.set([]);
  }

  getToast() {
    return this.toasts.asReadonly();
  }

  getConfirmDialog() {
    return this.confirmDialog.asReadonly();
  }
}
