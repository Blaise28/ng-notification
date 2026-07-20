import { Component, computed, input, signal } from '@angular/core';

import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  RotateLeft01Icon,
  RotateRight01Icon,
  ZoomInAreaIcon,
  ZoomOutAreaIcon,
} from '@hugeicons/core-free-icons';

@Component({
  selector: 'image-viewer',
  imports: [HugeiconsIconComponent],
  templateUrl: './image-viewer.component.html',
    host: {
    class: 'flex min-h-0 flex-1 flex-col',
  },
})
export class ImageViewerComponent {
  readonly src = input.required<string>();
  readonly alt = input('');

  protected readonly RotateLeft01Icon = RotateLeft01Icon;
  protected readonly RotateRight01Icon = RotateRight01Icon;
  protected readonly ZoomInAreaIcon = ZoomInAreaIcon;
  protected readonly ZoomOutAreaIcon = ZoomOutAreaIcon;

  private readonly rotation = signal(0);
  private readonly scale = signal(1);

  protected readonly imageTransform = computed(
    () => `rotate(${this.rotation()}deg) scale(${this.scale()})`,
  );

  protected rotate(degrees: number): void {
    this.rotation.update((current) => (current + degrees) % 360);
  }

  protected zoom(delta: number): void {
    this.scale.update((current) => Math.max(0.1, current + delta));
  }

  protected resetView(): void {
    this.rotation.set(0);
    this.scale.set(1);
  }
}
