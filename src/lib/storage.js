// Everything is stored on the phone only (localStorage). Nothing is sent anywhere
// except barcode numbers, which go to Open Food Facts to look the product up.

import { useEffect, useState } from 'react';

export const KEYS = { profile: 'nouri.profile.v1', history: 'nouri.history.v1' };
const MAX_HISTORY = 60;

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or storage full: the app still works, it just won't remember.
  }
}

export function usePersistentState(key, fallback) {
  const [value, setValue] = useState(() => load(key, fallback));
  useEffect(() => save(key, value), [key, value]);
  return [value, setValue];
}

export function addToHistory(history, product) {
  const entry = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    at: Date.now(),
    product,
  };
  const rest = history.filter((e) => !(product.code && e.product.code === product.code));
  return [entry, ...rest].slice(0, MAX_HISTORY);
}
