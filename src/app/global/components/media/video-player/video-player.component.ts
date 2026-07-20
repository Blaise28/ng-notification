import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { fromEvent, merge } from 'rxjs';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  ArrowExpand01Icon,
  ArrowShrink02Icon,
  Backward01Icon,
  DashboardSpeed01Icon,
  Forward01Icon,
  PauseIcon,
  PictureInPictureExitIcon,
  PictureInPictureOnIcon,
  PlayIcon,
  RepeatIcon,
  Settings02Icon,
  Tick02Icon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeMute01Icon,
} from '@hugeicons/core-free-icons';

import {
  buildPlaybackRates,
  clampMediaTime,
  computeBufferedEnd,
  formatMediaTime,
  getPlaybackRateLabel,
  isPictureInPictureSupported,
  progressPercent,
  seekPercentOfDuration,
} from '@globals/components/media/media-player/media-playback.helpers';

@Component({
  selector: 'app-video-player',
  imports: [HugeiconsIconComponent],
  templateUrl: './video-player.component.html',
  styleUrl: './video-player.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'handleKeydown($event)',
  },
})
export class VideoPlayerComponent implements AfterViewInit {
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  readonly videoRef = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  readonly progressBarRef = viewChild.required<ElementRef<HTMLInputElement>>('progressBar');
  readonly volumeSliderRef = viewChild<ElementRef<HTMLInputElement>>('volumeSlider');
  readonly previewVideoRef = viewChild<ElementRef<HTMLVideoElement>>('previewVideo');
  readonly previewCanvasRef = viewChild<ElementRef<HTMLCanvasElement>>('previewCanvas');

  readonly videoSource = input.required<string>();
  readonly autoplayOnHover = input(false);

  readonly videoPlay = output<void>();
  readonly videoPause = output<void>();
  readonly videoEnded = output<void>();

  protected readonly PlayIcon = PlayIcon;
  protected readonly PauseIcon = PauseIcon;
  protected readonly Backward01Icon = Backward01Icon;
  protected readonly Forward01Icon = Forward01Icon;
  protected readonly VolumeHighIcon = VolumeHighIcon;
  protected readonly VolumeLowIcon = VolumeLowIcon;
  protected readonly VolumeMute01Icon = VolumeMute01Icon;
  protected readonly Settings02Icon = Settings02Icon;
  protected readonly DashboardSpeed01Icon = DashboardSpeed01Icon;
  protected readonly Tick02Icon = Tick02Icon;
  protected readonly ArrowExpand01Icon = ArrowExpand01Icon;
  protected readonly ArrowShrink02Icon = ArrowShrink02Icon;
  protected readonly RepeatIcon = RepeatIcon;
  protected readonly PictureInPictureOnIcon = PictureInPictureOnIcon;
  protected readonly PictureInPictureExitIcon = PictureInPictureExitIcon;

  private controlsHideTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastClickAt = 0;

  readonly isPlaying = signal(false);
  readonly isActive = signal(false);
  readonly isMuted = signal(false);
  readonly volume = signal(1);
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly bufferedEnd = signal(0);
  readonly isFullScreen = signal(false);
  readonly isPictureInPicture = signal(false);
  readonly isLoading = signal(false);
  readonly showVolumeSlider = signal(false);
  readonly volumeBeforeMute = signal(1);
  readonly showCursor = signal(true);
  readonly showControls = signal(true);
  readonly mouseInPlayer = signal(false);
  readonly autoplay = signal(false);
  readonly isLooping = signal(false);
  readonly showReplay = signal(false);
  readonly pipSupported = signal(isPictureInPictureSupported());

  readonly scrubHoverTime = signal<number | null>(null);
  readonly scrubHoverPercent = signal(0);
  readonly scrubPreviewAvailable = signal(false);

  readonly playbackRates = buildPlaybackRates($localize`Normale`);
  readonly selectedPlaybackRate = signal(1);

  protected readonly playPauseTooltip = computed(() =>
    this.isPlaying() ? $localize`Pause` : $localize`Lire`,
  );

  protected readonly playPauseAriaLabel = computed(() =>
    this.isPlaying() ? $localize`Mettre en pause` : $localize`Lire la vidéo`,
  );

  protected readonly muteAriaLabel = computed(() =>
    this.isMuted() ? $localize`Activer le son` : $localize`Couper le son`,
  );

  protected readonly fullScreenAriaLabel = computed(() =>
    this.isFullScreen() ? $localize`Quitter le plein écran` : $localize`Plein écran`,
  );

  protected readonly pipAriaLabel = computed(() =>
    this.isPictureInPicture()
      ? $localize`Quitter le mode image dans l'image`
      : $localize`Image dans l'image`,
  );

  protected readonly loopAriaLabel = computed(() =>
    this.isLooping() ? $localize`Désactiver la boucle` : $localize`Activer la boucle`,
  );

  protected readonly bufferedPercent = computed(() =>
    progressPercent(this.bufferedEnd(), this.duration()),
  );

  protected readonly playedPercent = computed(() =>
    progressPercent(this.currentTime(), this.duration()),
  );

  private readonly viewReady = signal(false);

  constructor() {
    effect(() => {
      const src = this.videoSource();
      if (!this.viewReady()) {
        return;
      }
      untracked(() => this.loadVideoSource(src));
    });

    this.destroyRef.onDestroy(() => {
      this.clearAutoHide();
      document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    });
  }

  ngAfterViewInit(): void {
    const video = this.videoRef().nativeElement;

    merge(
      fromEvent(video, 'loadedmetadata'),
      fromEvent(video, 'durationchange'),
      fromEvent(video, 'loadeddata'),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.duration.set(video.duration);
        this.bufferedEnd.set(computeBufferedEnd(video.buffered, video.currentTime));
        this.isLoading.set(false);
      });

    fromEvent(video, 'timeupdate')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.currentTime.set(video.currentTime);
        this.bufferedEnd.set(computeBufferedEnd(video.buffered, video.currentTime));
        this.updateProgress();
      });

    fromEvent(video, 'volumechange')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.volume.set(video.volume);
        this.isMuted.set(video.muted || video.volume === 0);
        if (this.volume() > 0 && video.muted) {
          video.muted = false;
          this.isMuted.set(false);
        }
      });

    fromEvent(video, 'waiting')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.isLoading.set(true));

    fromEvent(video, 'playing')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isLoading.set(false);
        this.isPlaying.set(true);
        this.showReplay.set(false);
        this.showControls.set(true);
        this.autoHideControls();
        this.videoPlay.emit();
      });

    fromEvent(video, 'pause')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isPlaying.set(false);
        this.showControls.set(true);
        this.clearAutoHide();
        this.videoPause.emit();
      });

    fromEvent(video, 'loadstart')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.isLoading.set(true));

    fromEvent(video, 'canplay')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.isLoading.set(false));

    fromEvent(video, 'seeked')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.isLoading.set(false));

    fromEvent(video, 'ended')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isPlaying.set(false);
        this.showControls.set(true);
        this.clearAutoHide();
        if (!this.isLooping()) {
          this.showReplay.set(true);
        }
        this.videoEnded.emit();
      });

    fromEvent(video, 'enterpictureinpicture')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.isPictureInPicture.set(true));

    fromEvent(video, 'leavepictureinpicture')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.isPictureInPicture.set(false));

    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    this.viewReady.set(true);
  }

  private readonly handleFullscreenChange = (): void => {
    this.isFullScreen.set(!!document.fullscreenElement);
    if (this.isFullScreen()) {
      this.showControls.set(true);
      this.showCursor.set(true);
      this.autoHideControls();
    }
  };

  protected setActive(): void {
    this.isActive.set(true);
  }

  protected setInactive(): void {
    this.isActive.set(false);
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (!this.isActive()) {
      return;
    }
    if (event.target && (event.target as HTMLElement).tagName === 'INPUT') {
      return;
    }

    const key = event.key.toLowerCase();
    switch (key) {
      case 'm':
        this.muteUnmute();
        event.preventDefault();
        break;
      case 'arrowup':
        this.setVolumeFromKey(0.05);
        event.preventDefault();
        break;
      case 'arrowdown':
        this.setVolumeFromKey(-0.05);
        event.preventDefault();
        break;
      case 'arrowright':
        this.skip(5);
        event.preventDefault();
        break;
      case 'arrowleft':
        this.skip(-5);
        event.preventDefault();
        break;
      case ' ':
      case 'spacebar':
      case 'k':
        this.playPause();
        event.preventDefault();
        break;
      case 'j':
        this.skip(-10);
        event.preventDefault();
        break;
      case 'l':
        this.skip(10);
        event.preventDefault();
        break;
      case 'f':
        this.toggleFullScreen();
        event.preventDefault();
        break;
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        this.seekToPercentDigit(Number(key));
        event.preventDefault();
        break;
    }
  }

  protected setVolumeFromKey(delta: number): void {
    const newVolume = Math.max(0, Math.min(1, this.volume() + delta));
    this.setVolume(newVolume);
    const video = this.videoRef().nativeElement;
    if (video.muted && newVolume > 0) {
      video.muted = false;
      this.isMuted.set(false);
    }
  }

  protected playPause(): void {
    const video = this.videoRef().nativeElement;
    this.showReplay.set(false);
    if (video.paused) {
      void video.play();
      this.isPlaying.set(true);
      this.showControls.set(true);
      this.autoHideControls();
    } else {
      video.pause();
      this.isPlaying.set(false);
      this.showControls.set(true);
      this.clearAutoHide();
    }
  }

  protected onVideoClick(): void {
    this.setActive();
    const now = Date.now();
    // Ignore the first click of a double-click (fullscreen).
    if (now - this.lastClickAt < 280) {
      this.lastClickAt = now;
      return;
    }
    this.lastClickAt = now;
    window.setTimeout(() => {
      if (Date.now() - this.lastClickAt >= 280) {
        this.playPause();
      }
    }, 280);
  }

  protected replay(): void {
    const video = this.videoRef().nativeElement;
    video.currentTime = 0;
    this.showReplay.set(false);
    void video.play();
  }

  protected skip(seconds: number): void {
    const video = this.videoRef().nativeElement;
    video.currentTime = clampMediaTime(video.currentTime + seconds, video.duration || this.duration());
    this.showReplay.set(false);
  }

  protected seekToPercentDigit(digit: number): void {
    const video = this.videoRef().nativeElement;
    video.currentTime = seekPercentOfDuration(digit, video.duration || this.duration());
    this.showReplay.set(false);
  }

  protected muteUnmute(): void {
    const video = this.videoRef().nativeElement;
    if (video.muted || video.volume === 0) {
      video.muted = false;
      video.volume = this.volumeBeforeMute() > 0 ? this.volumeBeforeMute() : 0.5;
      this.volume.set(video.volume);
      this.isMuted.set(false);
    } else {
      this.volumeBeforeMute.set(video.volume);
      video.muted = true;
      video.volume = 0;
      this.volume.set(0);
      this.isMuted.set(true);
    }
  }

  protected setVolume(eventOrValue: Event | number): void {
    let value: number;
    if (typeof eventOrValue === 'number') {
      value = eventOrValue;
    } else {
      const inputEl = eventOrValue.target as HTMLInputElement;
      value = parseFloat(inputEl.value);
    }
    const video = this.videoRef().nativeElement;
    video.volume = value;
    if (value > 0 && video.muted) {
      video.muted = false;
      this.isMuted.set(false);
    } else if (value === 0) {
      video.muted = true;
      this.isMuted.set(true);
    }
    this.volume.set(value);
  }

  protected onProgressChange(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const value = parseFloat(inputEl.value);
    const video = this.videoRef().nativeElement;
    video.currentTime = value;
    this.currentTime.set(value);
    this.showReplay.set(false);
  }

  protected onProgressHover(event: MouseEvent): void {
    const bar = this.progressBarRef().nativeElement;
    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const time = ratio * (this.duration() || 0);
    this.scrubHoverTime.set(time);
    this.scrubHoverPercent.set(ratio * 100);
    void this.updateScrubPreview(time);
  }

  protected onProgressLeave(): void {
    this.scrubHoverTime.set(null);
    this.scrubPreviewAvailable.set(false);
  }

  private async updateScrubPreview(time: number): Promise<void> {
    const previewVideo = this.previewVideoRef()?.nativeElement;
    const canvas = this.previewCanvasRef()?.nativeElement;
    if (!previewVideo || !canvas || !this.videoSource()) {
      this.scrubPreviewAvailable.set(false);
      return;
    }

    try {
      if (!previewVideo.getAttribute('src') || previewVideo.currentSrc !== this.videoSource()) {
        previewVideo.src = this.videoSource();
        previewVideo.load();
        await new Promise<void>((resolve, reject) => {
          const onReady = () => {
            previewVideo.removeEventListener('loadeddata', onReady);
            previewVideo.removeEventListener('error', onError);
            resolve();
          };
          const onError = () => {
            previewVideo.removeEventListener('loadeddata', onReady);
            previewVideo.removeEventListener('error', onError);
            reject(new Error('preview load failed'));
          };
          previewVideo.addEventListener('loadeddata', onReady, { once: true });
          previewVideo.addEventListener('error', onError, { once: true });
        });
      }
      previewVideo.currentTime = clampMediaTime(time, previewVideo.duration || this.duration());
      await new Promise<void>((resolve, reject) => {
        const onSeeked = () => {
          previewVideo.removeEventListener('seeked', onSeeked);
          previewVideo.removeEventListener('error', onError);
          resolve();
        };
        const onError = () => {
          previewVideo.removeEventListener('seeked', onSeeked);
          previewVideo.removeEventListener('error', onError);
          reject(new Error('preview seek failed'));
        };
        previewVideo.addEventListener('seeked', onSeeked, { once: true });
        previewVideo.addEventListener('error', onError, { once: true });
      });

      const ctx = canvas.getContext('2d');
      if (!ctx || previewVideo.videoWidth === 0) {
        this.scrubPreviewAvailable.set(false);
        return;
      }
      canvas.width = 160;
      canvas.height = Math.round((160 * previewVideo.videoHeight) / previewVideo.videoWidth) || 90;
      ctx.drawImage(previewVideo, 0, 0, canvas.width, canvas.height);
      this.scrubPreviewAvailable.set(true);
    } catch {
      this.scrubPreviewAvailable.set(false);
    }
  }

  private updateProgress(): void {
    const progressBarRef = this.progressBarRef();
    if (progressBarRef?.nativeElement) {
      progressBarRef.nativeElement.value = this.currentTime().toString();
    }
  }

  protected formatTime(seconds: number): string {
    return formatMediaTime(seconds);
  }

  protected toggleFullScreen(): void {
    const videoElem = this.videoRef().nativeElement;
    const player = videoElem.parentElement;
    if (!document.fullscreenElement) {
      void player?.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  }

  protected async togglePictureInPicture(): Promise<void> {
    if (!this.pipSupported()) {
      return;
    }
    const video = this.videoRef().nativeElement;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {
      // Browser may reject PiP for policy/CORS reasons.
    }
  }

  protected toggleLoop(): void {
    const next = !this.isLooping();
    this.isLooping.set(next);
    this.videoRef().nativeElement.loop = next;
  }

  protected showVolumeControl(): void {
    this.showVolumeSlider.set(true);
    setTimeout(() => this.volumeSliderRef()?.nativeElement.focus(), 50);
  }

  protected hideVolumeControl(): void {
    this.showVolumeSlider.set(false);
  }

  private loadVideoSource(src = this.videoSource()): void {
    const video = this.videoRef().nativeElement;
    this.showReplay.set(false);
    this.bufferedEnd.set(0);
    video.src = src;
    video.loop = this.isLooping();
    video.load();

    const preview = this.previewVideoRef()?.nativeElement;
    if (preview) {
      preview.src = src;
      preview.load();
    }

    if (this.autoplayOnHover() || this.autoplay()) {
      setTimeout(() => {
        void video.play().catch(() => undefined);
      }, 300);
    }
  }

  protected onPlayerMouseMove(): void {
    this.mouseInPlayer.set(true);
    this.showControls.set(true);
    this.showCursor.set(true);
    if (this.isPlaying() && !this.isLoading()) {
      this.autoHideControls();
    } else {
      this.clearAutoHide();
      this.showControls.set(true);
    }
  }

  protected onPlayerMouseEnter(): void {
    this.mouseInPlayer.set(true);
    this.showControls.set(true);
    const video = this.videoRef().nativeElement;
    if (this.autoplayOnHover() && video.paused) {
      void video.play();
    }
    if (this.isPlaying()) {
      this.autoHideControls();
    } else {
      this.clearAutoHide();
      this.showControls.set(true);
    }
  }

  protected onPlayerMouseLeave(): void {
    if (this.isLoading()) {
      return;
    }
    this.mouseInPlayer.set(false);
    this.scrubHoverTime.set(null);
    if (this.isPlaying()) {
      this.autoHideControls(5000);
    } else {
      this.clearAutoHide();
      this.showControls.set(true);
    }
    const video = this.videoRef().nativeElement;
    if (this.autoplayOnHover() && !video.paused) {
      video.pause();
    }
  }

  private autoHideControls(timeout = 5000): void {
    this.clearAutoHide();
    if (this.isPlaying() && this.mouseInPlayer()) {
      this.ngZone.runOutsideAngular(() => {
        this.controlsHideTimeout = setTimeout(() => {
          if (this.isPlaying() && this.mouseInPlayer()) {
            this.ngZone.run(() => {
              this.showControls.set(false);
              this.showCursor.set(false);
            });
          }
        }, timeout);
      });
    }
  }

  private clearAutoHide(): void {
    if (this.controlsHideTimeout) {
      clearTimeout(this.controlsHideTimeout);
      this.controlsHideTimeout = null;
    }
  }

  protected setPlaybackRate(rate: number): void {
    this.selectedPlaybackRate.set(rate);
    this.videoRef().nativeElement.playbackRate = rate;
  }

  protected getPlaybackRateLabel(rate: number): string {
    return getPlaybackRateLabel(this.playbackRates, rate, $localize`Normale`);
  }
}
