import { describe, expect, it } from 'vitest';
import { checkTrigger, MAX_TRIGGERS } from './triggers';

describe('checkTrigger', () => {
  it('normalises and accepts ordinary foods', () => {
    expect(checkTrigger('  Green   Peas ', [])).toEqual({ ok: true, value: 'green peas' });
    expect(checkTrigger('crème fraîche', [])).toEqual({ ok: true, value: 'crème fraîche' });
  });

  it.each([
    ['a', 'at least 2'],
    ['<script>', 'letters'],
    ['x'.repeat(41), 'under'],
    ['corn', 'Already'],
  ])('rejects %s', (raw, reason) => {
    const res = checkTrigger(raw, ['corn']);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain(reason);
  });

  it('limits the list size', () => {
    const full = Array.from({ length: MAX_TRIGGERS }, (_, i) => `food ${i}`);
    expect(checkTrigger('rice', full).ok).toBe(false);
  });
});
