import { Component, inject } from '@angular/core';
import { ThemeStore } from '@stores/theme/theme.store';

@Component({
  selector: 'app-theme-controller',
  imports: [],
  templateUrl: './theme-controller.html',
})
export class ThemeController {
  protected readonly store = inject(ThemeStore);
}
