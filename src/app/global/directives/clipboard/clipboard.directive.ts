import { Directive, ElementRef, inject, input, signal } from '@angular/core';

@Directive({
  selector: '[appClipboard]',
  standalone: true,
  host: {
    '[class.tooltip]': 'true',
    '[class.tooltip-bottom]': 'true',
    '[attr.data-tip]': 'tooltipTitle()',
    '(click)': 'onClick()',
  },
})
export class ClipboardDirective {
  private el = inject(ElementRef);

  tooltipTitle = signal('Copier dans le presse-papier');
  readonly clipboardText = input('', { alias: 'appClipboard' });

  onClick() {
    const text = this.clipboardText() || this.el.nativeElement.innerText;

    navigator.clipboard.writeText(text).then(() => {
      const originalTitle = this.tooltipTitle();
      this.tooltipTitle.set('Copié !');

      setTimeout(() => {
        this.tooltipTitle.set(originalTitle);
      }, 1000);
    });
  }
}
