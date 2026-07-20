import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Image01Icon,
} from '@hugeicons/core-free-icons';

import type { ListCell } from '@globals/models/list.models';
import { ImagePreviewDirective } from '@globals/directives/image-preview/image-preview.directive';

@Component({
  selector: 'app-list-cell',
  imports: [DatePipe, DecimalPipe, HugeiconsIconComponent, ImagePreviewDirective],
  templateUrl: './list-cell.html',
  })
export class ListCellView {
  readonly cell = input.required<ListCell>();

  protected readonly CancelCircleIcon = CancelCircleIcon;
  protected readonly CheckmarkCircle02Icon = CheckmarkCircle02Icon;
  protected readonly Image01Icon = Image01Icon;

  protected isTrueValue(value: string | null): boolean {
    return value?.toLocaleLowerCase()?.trim() === 'true';
  }

  protected isFalseValue(value: string | null): boolean {
    return value?.toLocaleLowerCase()?.trim() === 'false';
  }

  protected isHttpImage(value: string | null): boolean {
    return Boolean(value?.includes('http'));
  }

  protected stopRowNavigation(event: Event): void {
    event.stopPropagation();

    if (event instanceof KeyboardEvent && (event.key === ' ' || event.key === 'Enter')) {
      event.preventDefault();
      (event.currentTarget as HTMLElement).click();
    }
  }
}
