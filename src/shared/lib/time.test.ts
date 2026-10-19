import { describe, expect, it } from 'vitest';
import { dayLabel, timeAgo } from './time';

describe('timeAgo', () => {
  const now = new Date('2026-10-19T12:00:00').getTime();
  it.each([
    [now - 10_000, 'Just now'],
    [now - 5 * 60_000, '5 min ago'],
    [now - 3 * 3600_000, '3 h ago'],
  ])('%s → %s', (ts, expected) => {
    expect(timeAgo(ts, now)).toBe(expected);
  });

  it('falls back to a date after a day', () => {
    expect(timeAgo(now - 3 * 86400_000, now)).toMatch(/16/);
  });
});

describe('dayLabel', () => {
  const now = new Date('2026-10-19T12:00:00');
  it('names today and yesterday', () => {
    expect(dayLabel(now.getTime() - 3600_000, now)).toBe('Today');
    expect(dayLabel(now.getTime() - 86400_000, now)).toBe('Yesterday');
    expect(dayLabel(now.getTime() - 5 * 86400_000, now)).not.toMatch(/Today|Yesterday/);
  });
});
