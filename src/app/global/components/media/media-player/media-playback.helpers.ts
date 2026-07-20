export interface PlaybackRateOption {
  value: number;
  label: string;
}

/** Numeric playback rates; the 1x label is localized in consumers. */
export const MEDIA_PLAYBACK_RATE_VALUES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export function buildPlaybackRates(normalLabel: string): PlaybackRateOption[] {
  return MEDIA_PLAYBACK_RATE_VALUES.map((value) => ({
    value,
    label: value === 1 ? normalLabel : `${value}x`,
  }));
}

export function formatMediaTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function clampMediaTime(time: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) {
    return 0;
  }
  if (!Number.isFinite(time)) {
    return 0;
  }
  return Math.max(0, Math.min(duration, time));
}

/** Digit 0–9 maps to 0%–90% of duration (YouTube-style). */
export function seekPercentOfDuration(digit: number, duration: number): number {
  const index = Math.max(0, Math.min(9, Math.floor(digit)));
  return clampMediaTime((index / 10) * duration, duration);
}

export function computeBufferedEnd(buffered: TimeRanges, currentTime: number): number {
  if (!buffered || buffered.length === 0) {
    return 0;
  }

  for (let i = 0; i < buffered.length; i++) {
    const start = buffered.start(i);
    const end = buffered.end(i);
    if (currentTime >= start && currentTime <= end) {
      return end;
    }
  }

  let maxEnd = 0;
  for (let i = 0; i < buffered.length; i++) {
    maxEnd = Math.max(maxEnd, buffered.end(i));
  }
  return maxEnd;
}

export function getPlaybackRateLabel(
  rates: PlaybackRateOption[],
  rate: number,
  fallbackLabel: string,
): string {
  const found = rates.find((option) => option.value === rate);
  return found ? found.label : fallbackLabel;
}

export function isPictureInPictureSupported(): boolean {
  return (
    typeof document !== 'undefined' &&
    'pictureInPictureEnabled' in document &&
    Boolean((document as Document & { pictureInPictureEnabled?: boolean }).pictureInPictureEnabled)
  );
}

export function progressPercent(current: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, (current / duration) * 100));
}
