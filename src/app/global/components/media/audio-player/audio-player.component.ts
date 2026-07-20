import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
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
  Backward01Icon,
  DashboardSpeed01Icon,
  Forward01Icon,
  Music3,
  PauseIcon,
  PlayIcon,
  RepeatIcon,
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
  progressPercent,
  seekPercentOfDuration,
} from '@globals/components/media/media-player/media-playback.helpers';

@Component({
  selector: 'app-audio-player',
  imports: [HugeiconsIconComponent],
  templateUrl: './audio-player.component.html',
  styleUrl: './audio-player.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'handleKeydown($event)',
    class: 'block w-full',
  },
})
export class AudioPlayerComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly audioRef = viewChild.required<ElementRef<HTMLAudioElement>>('audio');
  readonly progressBarRef = viewChild.required<ElementRef<HTMLInputElement>>('progressBar');
  readonly volumeSliderRef = viewChild<ElementRef<HTMLInputElement>>('volumeSlider');

  readonly audioSource = input.required<string>();
  readonly title = input('');
  readonly artworkUrl = input<string | null>(null);

  readonly audioPlay = output<void>();
  readonly audioPause = output<void>();
  readonly audioEnded = output<void>();

  protected readonly PlayIcon = PlayIcon;
  protected readonly PauseIcon = PauseIcon;
  protected readonly Backward01Icon = Backward01Icon;
  protected readonly Forward01Icon = Forward01Icon;
  protected readonly VolumeHighIcon = VolumeHighIcon;
  protected readonly VolumeLowIcon = VolumeLowIcon;
  protected readonly VolumeMute01Icon = VolumeMute01Icon;
  protected readonly DashboardSpeed01Icon = DashboardSpeed01Icon;
  protected readonly Tick02Icon = Tick02Icon;
  protected readonly RepeatIcon = RepeatIcon;
  protected readonly MusicIcon = Music3;

  readonly isPlaying = signal(false);
  readonly isActive = signal(false);
  readonly isMuted = signal(false);
  readonly volume = signal(1);
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly bufferedEnd = signal(0);
  readonly isLoading = signal(false);
  readonly showVolumeSlider = signal(false);
  readonly volumeBeforeMute = signal(1);
  readonly isLooping = signal(false);
  readonly showReplay = signal(false);

  readonly playbackRates = buildPlaybackRates($localize`Normale`);
  readonly selectedPlaybackRate = signal(1);

  protected readonly playPauseAriaLabel = computed(() =>
    this.isPlaying() ? $localize`Mettre en pause` : $localize`Lire l'audio`,
  );

  protected readonly muteAriaLabel = computed(() =>
    this.isMuted() ? $localize`Activer le son` : $localize`Couper le son`,
  );

  protected readonly loopAriaLabel = computed(() =>
    this.isLooping() ? $localize`Désactiver la boucle` : $localize`Activer la boucle`,
  );

  protected readonly displayTitle = computed(() => this.title().trim() || $localize`Audio`);

  protected readonly bufferedPercent = computed(() =>
    progressPercent(this.bufferedEnd(), this.duration()),
  );

  protected readonly playedPercent = computed(() =>
    progressPercent(this.currentTime(), this.duration()),
  );

  private readonly viewReady = signal(false);

  constructor() {
    effect(() => {
      const src = this.audioSource();
      if (!this.viewReady()) {
        return;
      }
      untracked(() => this.loadAudioSource(src));
    });
  }

  ngAfterViewInit(): void {
    const audio = this.audioRef().nativeElement;

    merge(
      fromEvent(audio, 'loadedmetadata'),
      fromEvent(audio, 'durationchange'),
      fromEvent(audio, 'loadeddata'),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.duration.set(audio.duration);
        this.bufferedEnd.set(computeBufferedEnd(audio.buffered, audio.currentTime));
        this.isLoading.set(false);
      });

    fromEvent(audio, 'timeupdate')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.currentTime.set(audio.currentTime);
        this.bufferedEnd.set(computeBufferedEnd(audio.buffered, audio.currentTime));
        this.updateProgress();
      });

    fromEvent(audio, 'volumechange')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.volume.set(audio.volume);
        this.isMuted.set(audio.muted || audio.volume === 0);
      });

    fromEvent(audio, 'waiting')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.isLoading.set(true));

    fromEvent(audio, 'playing')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isLoading.set(false);
        this.isPlaying.set(true);
        this.showReplay.set(false);
        this.audioPlay.emit();
      });

    fromEvent(audio, 'pause')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isPlaying.set(false);
        this.audioPause.emit();
      });

    fromEvent(audio, 'loadstart')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.isLoading.set(true));

    fromEvent(audio, 'canplay')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.isLoading.set(false));

    fromEvent(audio, 'ended')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isPlaying.set(false);
        if (!this.isLooping()) {
          this.showReplay.set(true);
        }
        this.audioEnded.emit();
      });

    this.viewReady.set(true);
  }

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
    const audio = this.audioRef().nativeElement;
    if (audio.muted && newVolume > 0) {
      audio.muted = false;
      this.isMuted.set(false);
    }
  }

  protected playPause(): void {
    const audio = this.audioRef().nativeElement;
    this.showReplay.set(false);
    if (audio.paused) {
      void audio.play();
      this.isPlaying.set(true);
    } else {
      audio.pause();
      this.isPlaying.set(false);
    }
  }

  protected replay(): void {
    const audio = this.audioRef().nativeElement;
    audio.currentTime = 0;
    this.showReplay.set(false);
    void audio.play();
  }

  protected skip(seconds: number): void {
    const audio = this.audioRef().nativeElement;
    audio.currentTime = clampMediaTime(audio.currentTime + seconds, audio.duration || this.duration());
    this.showReplay.set(false);
  }

  protected seekToPercentDigit(digit: number): void {
    const audio = this.audioRef().nativeElement;
    audio.currentTime = seekPercentOfDuration(digit, audio.duration || this.duration());
    this.showReplay.set(false);
  }

  protected muteUnmute(): void {
    const audio = this.audioRef().nativeElement;
    if (audio.muted || audio.volume === 0) {
      audio.muted = false;
      audio.volume = this.volumeBeforeMute() > 0 ? this.volumeBeforeMute() : 0.5;
      this.volume.set(audio.volume);
      this.isMuted.set(false);
    } else {
      this.volumeBeforeMute.set(audio.volume);
      audio.muted = true;
      audio.volume = 0;
      this.volume.set(0);
      this.isMuted.set(true);
    }
  }

  protected setVolume(eventOrValue: Event | number): void {
    let value: number;
    if (typeof eventOrValue === 'number') {
      value = eventOrValue;
    } else {
      value = parseFloat((eventOrValue.target as HTMLInputElement).value);
    }
    const audio = this.audioRef().nativeElement;
    audio.volume = value;
    if (value > 0 && audio.muted) {
      audio.muted = false;
      this.isMuted.set(false);
    } else if (value === 0) {
      audio.muted = true;
      this.isMuted.set(true);
    }
    this.volume.set(value);
  }

  protected onProgressChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    const audio = this.audioRef().nativeElement;
    audio.currentTime = value;
    this.currentTime.set(value);
    this.showReplay.set(false);
  }

  private updateProgress(): void {
    const bar = this.progressBarRef()?.nativeElement;
    if (bar) {
      bar.value = this.currentTime().toString();
    }
  }

  protected formatTime(seconds: number): string {
    return formatMediaTime(seconds);
  }

  protected toggleLoop(): void {
    const next = !this.isLooping();
    this.isLooping.set(next);
    this.audioRef().nativeElement.loop = next;
  }

  protected showVolumeControl(): void {
    this.showVolumeSlider.set(true);
    setTimeout(() => this.volumeSliderRef()?.nativeElement.focus(), 50);
  }

  protected hideVolumeControl(): void {
    this.showVolumeSlider.set(false);
  }

  private loadAudioSource(src = this.audioSource()): void {
    const audio = this.audioRef().nativeElement;
    this.showReplay.set(false);
    this.bufferedEnd.set(0);
    audio.src = src;
    audio.loop = this.isLooping();
    audio.load();
  }

  protected setPlaybackRate(rate: number): void {
    this.selectedPlaybackRate.set(rate);
    this.audioRef().nativeElement.playbackRate = rate;
  }

  protected getPlaybackRateLabel(rate: number): string {
    return getPlaybackRateLabel(this.playbackRates, rate, $localize`Normale`);
  }
}
