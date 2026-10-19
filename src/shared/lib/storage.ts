// Everything is stored on the phone only (localStorage). Nothing is sent anywhere
// except barcode numbers, which go to Open Food Facts to look the product up.

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

export const KEYS = { profile: 'nouri.profile.v1', history: 'nouri.history.v1' } as const;

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or storage full: the app still works, it just won't remember.
  }
}

export function usePersistentState<T>(key: string, fallback: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => load(key, fallback));
  useEffect(() => {
    save(key, value);
  }, [key, value]);
  return [value, setValue];
}
