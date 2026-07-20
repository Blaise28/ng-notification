import {
  Directive,
  ElementRef,
  inject,
  OnDestroy,
  Renderer2,
  signal,
} from '@angular/core';

@Directive({
  selector: '[appImagePreview]',
  standalone: true,
  host: {
    '[style.cursor]': "'zoom-in'",
    '(click)': 'onClick()',
  },
})
export class ImagePreviewDirective implements OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private renderer = inject(Renderer2);

  private overlay = signal<HTMLElement | undefined>(undefined);
  private previewImg = signal<HTMLElement | undefined>(undefined);
  private controlsContainer = signal<HTMLElement | undefined>(undefined);

  private rotation = signal(0);
  private scale = signal(1);
  private unlisteners = signal<(() => void)[]>([]);

  onClick() {
    if (this.overlay()) return;

    const imgSrc = this.el.nativeElement.getAttribute('src');
    if (!imgSrc) return;

    this.createOverlay(imgSrc);
  }

  private createOverlay(imgSrc: string) {
    const overlay = this.renderer.createElement('div');
    this.overlay.set(overlay);

    const wrapper = this.renderer.createElement('div');
    const previewImg = this.renderer.createElement('img');
    this.previewImg.set(previewImg);

    const controlsContainer = this.renderer.createElement('div');
    this.controlsContainer.set(controlsContainer);

    // Overlay style
    this.renderer.setAttribute(
      overlay,
      'class',
      'fixed inset-0 w-screen h-screen bg-black/40 flex items-center justify-center z-[100] overflow-hidden'
    );

    // Image style
    this.renderer.setAttribute(previewImg, 'src', imgSrc);
    this.renderer.setAttribute(
      previewImg,
      'class',
      'max-w-[90vw] max-h-[80vh] rounded-xl transition-transform duration-300 block'
    );

    // Controls container style
    this.renderer.setAttribute(
      controlsContainer,
      'class',
      'absolute top-4 right-1/2 translate-x-1/2 flex gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-full shadow-2xl z-[100]'
    );

    const controls = [
      { icon: 'fa-rotate-left', action: () => this.rotate(-90) },
      { icon: 'fa-rotate-right', action: () => this.rotate(90) },
      { icon: 'fa-magnifying-glass-plus', action: () => this.zoom(0.1) },
      { icon: 'fa-magnifying-glass-minus', action: () => this.zoom(-0.1) },
      { icon: 'fa-xmark', action: () => this.close() },
    ];

    controls.forEach(control => {
      const button = this.renderer.createElement('button');
      const icon = this.renderer.createElement('i');
      this.renderer.addClass(icon, 'fa-solid');
      this.renderer.addClass(icon, control.icon);
      this.renderer.setAttribute(
        button,
        'class',
        'btn btn-circle btn-ghost text-white btn-sm text-lg'
      );
      this.renderer.appendChild(button, icon);

      const unlisten = this.renderer.listen(button, 'click', (event: Event) => {
        event.stopPropagation();
        control.action();
      });
      this.unlisteners.update(items => [...items, unlisten]);
      this.renderer.appendChild(controlsContainer, button);
    });

    this.renderer.appendChild(wrapper, previewImg);
    this.renderer.appendChild(wrapper, controlsContainer);
    this.renderer.appendChild(overlay, wrapper);
    this.renderer.appendChild(document.body, overlay);

    this.unlisteners.update(items => [
      ...items,
      this.renderer.listen(overlay, 'click', (event: Event) => {
        if (event.target === overlay) {
          this.close();
        }
      }),
    ]);
  }

  private rotate(degrees: number) {
    this.rotation.set((this.rotation() + degrees) % 360);
    this.applyTransform();
  }

  private zoom(amount: number) {
    this.scale.set(Math.max(0.1, this.scale() + amount));
    this.applyTransform();
  }

  private applyTransform() {
    const previewImg = this.previewImg();
    if (previewImg) {
      this.renderer.setStyle(
        previewImg,
        'transform',
        `rotate(${this.rotation()}deg) scale(${this.scale()})`
      );
    }
  }

  private close = () => {
    const overlay = this.overlay();
    if (!overlay) return;

    this.unlisteners().forEach(unlisten => unlisten());
    this.unlisteners.set([]);

    this.renderer.removeChild(document.body, overlay);

    this.overlay.set(undefined);
    this.previewImg.set(undefined);
    this.controlsContainer.set(undefined);
    this.rotation.set(0);
    this.scale.set(1);
  };

  ngOnDestroy() {
    this.close();
  }
}
