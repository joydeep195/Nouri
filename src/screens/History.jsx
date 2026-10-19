import { useMemo, useState } from 'react';
import { Clock, Trash, X } from 'lucide-react';
import { analyze } from '../lib/score.js';
import { ProductThumb, ScorePill, timeAgo } from '../components/ui.jsx';

const FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'good', label: 'Good picks', test: (s) => s >= 65 },
  { key: 'meh', label: 'Not ideal', test: (s) => s >= 40 && s < 65 },
  { key: 'avoid', label: 'Avoid', test: (s) => s < 40 },
];

function dayLabel(ts) {
  const d = new Date(ts);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

export default function History({ history, profile, onOpen, onDelete, onClear }) {
  const [filter, setFilter] = useState('all');
  const scored = useMemo(() => history.map((e) => ({ ...e, result: analyze(e.product, profile) })), [history, profile]);
  const test = FILTERS.find((f) => f.key === filter).test;
  const shown = scored.filter((e) => !e.result.insufficient && test(e.result.overall));

  const groups = [];
  for (const e of shown) {
    const label = dayLabel(e.at);
    if (groups.at(-1)?.label !== label) groups.push({ label, items: [] });
    groups.at(-1).items.push(e);
  }

  return (
    <main className="screen">
      <h1 className="page-title">History</h1>
      {history.length > 0 && (
        <div className="filters" role="tablist">
          {FILTERS.map((f) => (
            <button key={f.key} className={`filter ${filter === f.key ? 'on' : ''}`} onClick={() => setFilter(f.key)} role="tab" aria-selected={filter === f.key}>
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
          <div key={g.label}>
            <div className="group-label">{g.label}</div>
            <div className="rows">
              {g.items.map((e) => (
                <div key={e.id} className="row split">
                  <button className="row-main" onClick={() => onOpen(e)}>
                    <ProductThumb product={e.product} />
                    <span className="row-text">
                      <span className="row-title">{e.product.name}</span>
                      <span className="row-sub">
                        {e.result.verdict.label} · {timeAgo(e.at)}
                      </span>
                    </span>
                    <ScorePill score={e.result.overall} />
                  </button>
                  <button className="row-del" aria-label={`Remove ${e.product.name}`} onClick={() => onDelete(e.id)}>
                    <X size={17} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {history.length > 0 && (
        <button
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
