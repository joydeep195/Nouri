// Versioned, validated on-device storage (localStorage). Nothing here is ever sent anywhere.
//
// Each record is stored as { v: <schema version>, data: <value> }. On read the data is
// migrated to the current version and validated; anything unreadable is reset on its own
// instead of crashing the app.

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { logger } from './logger';

export interface StoreSpec<T> {
  key: string;
  /** Current schema version. Bump it and add a migration when the stored shape changes. */
  version: number;
  /** Validates/cleans a value of the current version. Returns null if it is unusable. */
  parse: (value: unknown) => T | null;
  fallback: () => T;
  /** migrations[n] upgrades a version-n value to version n + 1. */
  migrations?: Record<number, (value: unknown) => unknown>;
  /** Older storage keys (before envelopes) to import from once, then delete. */
  legacyKeys?: string[];
}

interface Envelope {
  v: number;
  data: unknown;
}

const isEnvelope = (x: unknown): x is Envelope =>
  typeof x === 'object' && x !== null && 'data' in x && typeof (x as { v?: unknown }).v === 'number';

/** localStorage, or null where it is blocked (some private modes, sandboxed frames). */
function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readStore<T>(spec: StoreSpec<T>, storage: Storage | null = getStorage()): T {
  if (!storage) return spec.fallback();
  try {
    const raw = storage.getItem(spec.key);
    if (raw != null) {
      const env: unknown = JSON.parse(raw);
      if (isEnvelope(env)) {
        let { v, data } = env;
        while (v < spec.version) {
          const migrate = spec.migrations?.[v];
          if (!migrate) break;
          data = migrate(data);
          v++;
        }
        if (v === spec.version) {
          const value = spec.parse(data);
          if (value !== null) return value;
        }
      }
      logger.warn(`Stored data for ${spec.key} was unreadable and has been reset`);
      storage.removeItem(spec.key);
      return spec.fallback();
    }

    for (const legacyKey of spec.legacyKeys ?? []) {
      const old = storage.getItem(legacyKey);
      if (old == null) continue;
      storage.removeItem(legacyKey);
      const value = spec.parse(JSON.parse(old));
      if (value !== null) {
        writeStore(spec, value, storage);
        logger.info(`Migrated ${legacyKey} to ${spec.key}`);
        return value;
      }
    }
  } catch (err) {
    logger.warn(`Could not read ${spec.key}; starting fresh`, err);
    try {
      storage.removeItem(spec.key);
    } catch {
      // ignore
    }
  }
  return spec.fallback();
}

export function writeStore<T>(spec: StoreSpec<T>, value: T, storage: Storage | null = getStorage()): void {
  if (!storage) return;
  try {
    const envelope: Envelope = { v: spec.version, data: value };
    storage.setItem(spec.key, JSON.stringify(envelope));
  } catch (err) {
    // Storage full or blocked: the app keeps working, it just won't remember.
    logger.warn(`Could not save ${spec.key}`, err);
  }
}

/** React state that is loaded from and saved to on-device storage. */
export function useStore<T>(spec: StoreSpec<T>): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readStore(spec));
  useEffect(() => {
    writeStore(spec, value);
  }, [spec, value]);
  return [value, setValue];
}
