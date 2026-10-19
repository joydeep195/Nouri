import { useMemo, useState } from 'react';
import { Clock, Trash, X } from 'lucide-react';
import { VERDICTS, analyze } from '@/features/analysis/model/score';
import type { ScoredAnalysis } from '@/features/analysis/model/types';
import { ScorePill } from '@/features/analysis/ui/ScorePill';
import { ProductThumb } from '@/features/product/ui/ProductThumb';
import type { Profile } from '@/features/profile/model/profile';
import { dayLabel, timeAgo } from '@/shared/lib/time';
import type { HistoryEntry } from '../model/history';
import './history.css';

type FilterKey = 'all' | 'good' | 'meh' | 'avoid';

const FILTERS: { key: FilterKey; label: string; test: (score: number) => boolean }[] = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'good', label: 'Good picks', test: (s) => s >= VERDICTS.good.min },
  { key: 'meh', label: 'Not ideal', test: (s) => s >= VERDICTS.caution.min && s < VERDICTS.good.min },
  { key: 'avoid', label: 'Avoid', test: (s) => s < VERDICTS.caution.min },
];

interface ScoredEntry extends HistoryEntry {
  result: ScoredAnalysis;
}

interface HistoryProps {
  history: HistoryEntry[];
  profile: Profile;
  onOpen: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

export default function History({ history, profile, onOpen, onDelete, onClear }: HistoryProps) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const scored = useMemo(
    () =>
      history.flatMap((e): ScoredEntry[] => {
        const result = analyze(e.product, profile);
        return result.insufficient ? [] : [{ ...e, result }];
      }),
    [history, profile],
  );
  const test = FILTERS.find((f) => f.key === filter)?.test ?? (() => true);
  const shown = scored.filter((e) => test(e.result.overall));

  const groups: { label: string; items: ScoredEntry[] }[] = [];
  for (const e of shown) {
    const label = dayLabel(e.at);
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(e);
    else groups.push({ label, items: [e] });
  }

  return (
    <main className="screen">
      <h1 className="page-title">History</h1>
      {history.length > 0 && (
        <div className="filters" role="group" aria-label="Filter scans">
          {FILTERS.map((f) => (
            <button
              type="button"
              key={f.key}
              className={`filter ${filter === f.key ? 'on' : ''}`}
              aria-pressed={filter === f.key}
              onClick={() => {
                setFilter(f.key);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {history.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">
            <Clock size={24} />
          </div>
          Nothing here yet. Everything you scan is saved on this phone so you can look back at it.
        </div>
      ) : shown.length === 0 ? (
        <div className="empty">No scans in this group yet.</div>
      ) : (
        groups.map((g) => (
          <section key={g.label} aria-label={g.label}>
            <h2 className="group-label">{g.label}</h2>
            <ul className="rows">
              {g.items.map((e) => (
                <li key={e.id} className="row split">
                  <button
                    type="button"
                    className="row-main"
                    onClick={() => {
                      onOpen(e);
                    }}
                  >
                    <ProductThumb product={e.product} />
                    <span className="row-text">
                      <span className="row-title">{e.product.name}</span>
                      <span className="row-sub">
                        {e.result.verdict.label} · {timeAgo(e.at)}
                      </span>
                    </span>
                    <ScorePill score={e.result.overall} />
                  </button>
                  <button
                    type="button"
                    className="row-del"
                    aria-label={`Remove ${e.product.name}`}
                    onClick={() => {
                      onDelete(e.id);
                    }}
                  >
                    <X size={17} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {history.length > 0 && (
        <button
          type="button"
          className="btn btn-ghost clear-btn danger"
          onClick={() => {
            if (window.confirm('Clear your whole scan history? This cannot be undone.')) onClear();
          }}
        >
          <Trash size={17} /> Clear history
        </button>
      )}
    </main>
  );
}
