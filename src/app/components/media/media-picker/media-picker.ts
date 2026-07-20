import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MediaAssetModel } from '@components/media/media.models';
import { ApiError } from '@services/api/api-error';
import { MediaService } from '@services/media/media.service';

@Component({
  selector: 'app-media-picker',
  template: `
    <div class="modal modal-open" role="dialog" aria-modal="true" aria-label="Choisir une image">
      <div class="modal-box max-w-3xl">
        <h2 class="font-bold text-lg mb-3">Galerie</h2>
        @if (errorMessage(); as message) {
          <div role="alert" class="alert alert-error text-sm mb-3">{{ message }}</div>
        }
        @if (loading()) {
          <div class="flex justify-center py-8"><span class="loading loading-spinner"></span></div>
        } @else if (assets().length === 0) {
          <p class="text-sm text-base-content/60">Aucune image. Ajoutez-en dans Galerie.</p>
        } @else {
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
            @for (asset of assets(); track asset.id) {
              <button
                type="button"
                class="btn btn-ghost h-auto p-2 flex-col gap-1 border border-base-300"
                (click)="select(asset)"
              >
                <img
                  [src]="asset.url"
                  [alt]="asset.originalName"
                  class="w-full h-24 object-cover rounded"
                />
                <span class="text-xs truncate w-full">{{ asset.originalName }}</span>
              </button>
            }
          </div>
        }
        <div class="modal-action">
          <button type="button" class="btn" (click)="cancelled.emit()">Fermer</button>
        </div>
      </div>
      <button type="button" class="modal-backdrop" aria-label="Fermer" (click)="cancelled.emit()">
      </button>
    </div>
  `,
})
export class MediaPicker {
  private readonly destroyRef = inject(DestroyRef);
  private readonly mediaService = inject(MediaService);

  readonly selected = output<MediaAssetModel>();
  readonly cancelled = output<void>();

  protected readonly assets = signal<MediaAssetModel[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
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

  select(asset: MediaAssetModel): void {
    this.selected.emit(asset);
  }
}
