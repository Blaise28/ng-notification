import { describe, expect, it } from 'vitest';

import { getStartersForChannel } from './template-starters';

describe('template-starters', () => {
  it('returns starters for email channel', () => {
    const starters = getStartersForChannel('email');
    expect(starters.length).toBeGreaterThan(0);
    expect(starters.every((starter) => starter.channel === 'email')).toBe(true);
  });

  it('returns sms starter', () => {
    const starters = getStartersForChannel('sms');
    expect(starters.some((starter) => starter.id === 'sms-short')).toBe(true);
  });
});
