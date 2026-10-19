import { describe, expect, it } from 'vitest';
import { HISTORY_STORE } from '@/features/history/model/history';
import { DEFAULT_PROFILE } from '@/features/profile/model/profile';
import { PROFILE_STORE } from '@/features/profile/model/profileStore';
import { logger } from './logger';
import { readStore, writeStore, type StoreSpec } from './storage';

const numberStore: StoreSpec<number> = {
  key: 'test.number',
  version: 3,
  parse: (v) => (typeof v === 'number' ? v : null),
  fallback: () => 0,
  migrations: { 1: (v) => Number(v) * 10, 2: (v) => Number(v) + 1 },
};

describe('readStore / writeStore', () => {
  it('round-trips a value in a versioned envelope', () => {
    writeStore(numberStore, 42);
    expect(JSON.parse(localStorage.getItem('test.number') ?? '')).toEqual({ v: 3, data: 42 });
    expect(readStore(numberStore)).toBe(42);
  });

  it('runs migrations from older versions in order', () => {
    localStorage.setItem('test.number', JSON.stringify({ v: 1, data: 4 }));
    expect(readStore(numberStore)).toBe(41);
  });

  it('resets unreadable data without throwing', () => {
    logger.clear();
    localStorage.setItem('test.number', '{not json');
    expect(readStore(numberStore)).toBe(0);
    expect(localStorage.getItem('test.number')).toBeNull();
    localStorage.setItem('test.number', JSON.stringify({ v: 3, data: 'nope' }));
    expect(readStore(numberStore)).toBe(0);
    expect(logger.entries().some((e) => e.level === 'warn')).toBe(true);
  });

  it('works when storage is unavailable', () => {
    expect(readStore(numberStore, null)).toBe(0);
    expect(() => {
      writeStore(numberStore, 1, null);
    }).not.toThrow();
  });
});

describe('profile store', () => {
  it('migrates a v1 profile and cleans bad fields', () => {
    localStorage.setItem(
      'nouri.profile.v1',
      JSON.stringify({
        name: 'Asha',
        onboarded: true,
        lactose: true,
        spicy: 'yes',
        triggers: ['Corn', '<script>', 5, 'corn'],
      }),
    );
    const profile = readStore(PROFILE_STORE);
    expect(profile).toEqual({ ...DEFAULT_PROFILE, name: 'Asha', onboarded: true, lactose: true, triggers: ['corn'] });
    expect(localStorage.getItem('nouri.profile.v1')).toBeNull();
    expect(localStorage.getItem('nouri.profile')).not.toBeNull();
  });

  it('falls back to defaults for junk', () => {
    localStorage.setItem('nouri.profile', JSON.stringify({ v: 2, data: 'hello' }));
    expect(readStore(PROFILE_STORE)).toEqual(DEFAULT_PROFILE);
  });
});

describe('history store', () => {
  it('keeps valid entries and drops broken ones', () => {
    const good = { id: 'a', at: 1, product: { source: 'typed', name: 'Oats', ingredientsText: 'Oats' } };
    localStorage.setItem(
      'nouri.history.v1',
      JSON.stringify([good, { id: '', at: 1, product: {} }, { id: 'b', at: 'yesterday', product: {} }, 'junk']),
    );
    const history = readStore(HISTORY_STORE);
    expect(history).toHaveLength(1);
    expect(history[0]?.product.name).toBe('Oats');
  });
});
