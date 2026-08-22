import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MediaAssetModel } from '@components/media/media.models';
import { ApiError } from '@services/api/api-error';
import { DialogService } from '@services/dialog/dialog.service';
import { MediaService } from '@services/media/media.service';
import { ClipboardDirective } from '@globals/directives/clipboard/clipboard.directive';

@Component({
  selector: 'app-media-gallery',
  imports: [ClipboardDirective],
  templateUrl: './media-gallery.html',
})
export class MediaGallery {
  private readonly destroyRef = inject(DestroyRef);
  private readonly mediaService = inject(MediaService);
  private readonly dialogService = inject(DialogService);

  protected readonly assets = signal<MediaAssetModel[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.mediaService
      .list({ limit: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.assets.set(response.objects);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.dialogService.showToast({
            type: 'error',
            message: err instanceof ApiError ? err.message : 'Une erreur est survenue.',
          });
        },
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.uploading.set(true);
    this.mediaService
      .upload(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.uploading.set(false);
          input.value = '';
          this.reload();
        },
        error: (err: unknown) => {
          this.uploading.set(false);
          this.dialogService.showToast({
            type: 'error',
            message: err instanceof ApiError ? err.message : 'Une erreur est survenue.',
          });
        },
      });
  }

  confirmDelete(asset: MediaAssetModel): void {
    this.dialogService.showConfirmDialog({
      type: 'error',
      title: 'Supprimer le média',
      description: `Supprimer « ${asset.originalName} » ?`,
      onConfirm: () => {
        this.mediaService
          .remove(asset.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.reload();
              this.dialogService.showToast({
                type: 'success',
                message: 'Média supprimé',
              });
            },
            error: (err: unknown) => {
              this.dialogService.showToast({
                type: 'error',
                message: err instanceof ApiError ? err.message : 'Une erreur est survenue.',
              });
            },
          });
      },
    });
  }
}
