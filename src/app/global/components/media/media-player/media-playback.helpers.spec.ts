import {
  buildPlaybackRates,
  clampMediaTime,
  computeBufferedEnd,
  formatMediaTime,
  getPlaybackRateLabel,
  progressPercent,
  seekPercentOfDuration,
} from './media-playback.helpers';

describe('media-playback.helpers', () => {
  describe('formatMediaTime', () => {
    it('formats seconds under one hour', () => {
      expect(formatMediaTime(65)).toBe('1:05');
      expect(formatMediaTime(0)).toBe('0:00');
    });

    it('formats hours when needed', () => {
      expect(formatMediaTime(3661)).toBe('1:01:01');
    });

    it('handles invalid values', () => {
      expect(formatMediaTime(Number.NaN)).toBe('0:00');
      expect(formatMediaTime(-5)).toBe('0:00');
    });
  });

  describe('clampMediaTime', () => {
    it('clamps within duration', () => {
      expect(clampMediaTime(-1, 100)).toBe(0);
      expect(clampMediaTime(50, 100)).toBe(50);
      expect(clampMediaTime(150, 100)).toBe(100);
    });

    it('returns 0 for invalid duration', () => {
      expect(clampMediaTime(10, 0)).toBe(0);
      expect(clampMediaTime(10, Number.NaN)).toBe(0);
    });
  });

  describe('seekPercentOfDuration', () => {
    it('maps digits 0-9 to 0%-90%', () => {
      expect(seekPercentOfDuration(0, 100)).toBe(0);
      expect(seekPercentOfDuration(5, 100)).toBe(50);
      expect(seekPercentOfDuration(9, 100)).toBe(90);
    });
  });

  describe('computeBufferedEnd', () => {
    it('returns end of the range containing currentTime', () => {
      const buffered = {
        length: 2,
        start: (i: number) => (i === 0 ? 0 : 40),
        end: (i: number) => (i === 0 ? 20 : 80),
      } as TimeRanges;

      expect(computeBufferedEnd(buffered, 10)).toBe(20);
      expect(computeBufferedEnd(buffered, 50)).toBe(80);
    });

    it('returns 0 when empty', () => {
      const buffered = { length: 0, start: () => 0, end: () => 0 } as TimeRanges;
      expect(computeBufferedEnd(buffered, 0)).toBe(0);
    });
  });

  describe('playback rates', () => {
    it('builds rates with localized normal label', () => {
      const rates = buildPlaybackRates('Normale');
      expect(rates.find((r) => r.value === 1)?.label).toBe('Normale');
      expect(rates.find((r) => r.value === 1.5)?.label).toBe('1.5x');
    });

    it('resolves label for selected rate', () => {
      const rates = buildPlaybackRates('Normal');
      expect(getPlaybackRateLabel(rates, 1.25, 'Normal')).toBe('1.25x');
      expect(getPlaybackRateLabel(rates, 3, 'Normal')).toBe('Normal');
    });
  });

  describe('progressPercent', () => {
    it('computes percentage', () => {
      expect(progressPercent(25, 100)).toBe(25);
      expect(progressPercent(0, 0)).toBe(0);
    });
  });
});
