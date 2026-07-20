import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MediaAssetModel } from '@components/media/media.models';
import { ApiError } from '@services/api/api-error';
import { MediaService } from '@services/media/media.service';

@Component({
  selector: 'app-media-gallery',
  templateUrl: './media-gallery.html',
})
export class MediaGallery {
  private readonly destroyRef = inject(DestroyRef);
  private readonly mediaService = inject(MediaService);

  protected readonly assets = signal<MediaAssetModel[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

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
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
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
    this.errorMessage.set(null);
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
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
        },
      });
  }

  confirmDelete(asset: MediaAssetModel): void {
    if (!confirm(`Supprimer « ${asset.originalName} » ?`)) {
      return;
    }
    this.mediaService
      .remove(asset.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.reload(),
        error: (err: unknown) => {
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
        },
      });
  }
}
