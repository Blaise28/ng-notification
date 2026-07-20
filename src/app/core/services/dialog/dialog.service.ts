import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly toast = signal<ToastMessage | null>(null);

  showToast(toast: ToastMessage): void {
    this.toast.set(toast);
    window.setTimeout(() => {
      if (this.toast()?.message === toast.message) {
        this.toast.set(null);
      }
    }, 4000);
  }
}
