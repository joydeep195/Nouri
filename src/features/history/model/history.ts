import { z } from '@/shared/lib/zod';
import { parseProduct } from '@/features/product/model/schema';
import type { Product } from '@/features/product/model/types';
import type { StoreSpec } from '@/shared/lib/storage';

export interface HistoryEntry {
  id: string;
  /** Epoch milliseconds. */
  at: number;
  product: Product;
}

export const MAX_HISTORY = 60;

const newId = () => globalThis.crypto.randomUUID();

/** Adds a scan to the top of the history, replacing an earlier scan of the same barcode. */
export function addToHistory(history: readonly HistoryEntry[], product: Product, now = Date.now()): HistoryEntry[] {
  const entry: HistoryEntry = { id: newId(), at: now, product };
  const rest = history.filter((e) => !(product.code && e.product.code === product.code));
  return [entry, ...rest].slice(0, MAX_HISTORY);
}

const EntrySchema = z.object({
  id: z.string().min(1).max(64),
  at: z.number().int().nonnegative(),
  product: z.unknown(),
});

/** Validates stored history. Bad entries are dropped one by one; returns null if it isn't a list. */
export function parseHistory(raw: unknown): HistoryEntry[] | null {
  if (!Array.isArray(raw)) return null;
  const out: HistoryEntry[] = [];
  for (const item of raw.slice(0, MAX_HISTORY)) {
    const entry = EntrySchema.safeParse(item);
    if (!entry.success) continue;
    const product = parseProduct(entry.data.product);
    if (product) out.push({ id: entry.data.id, at: entry.data.at, product });
  }
  return out;
}

export const HISTORY_STORE: StoreSpec<HistoryEntry[]> = {
  key: 'nouri.history',
  version: 2,
  parse: parseHistory,
  fallback: () => [],
  // v1 (Nouri 1.0) stored the bare array under this key.
  legacyKeys: ['nouri.history.v1'],
};
