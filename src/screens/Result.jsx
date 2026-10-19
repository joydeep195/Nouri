import { useMemo, useState } from 'react';
import {
  Barcode,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Feather,
  HeartPulse,
  Info,
  Keyboard,
  Lightbulb,
  Pencil,
  Scale,
  ScanBarcode,
  ScanText,
  TriangleAlert,
} from 'lucide-react';
import { analyze, nutrientLevel } from '../lib/score.js';
import { productPageUrl } from '../lib/openfoodfacts.js';
import { ProductThumb, ScoreRing, TopBar, verdictClass } from '../components/ui.jsx';

const PILLAR_ICONS = { health: HeartPulse, gut: Feather, weight: Scale };
const SOURCE = {
  barcode: { icon: Barcode, label: 'Scanned barcode' },
  label: { icon: ScanText, label: 'From a label photo' },
  typed: { icon: Keyboard, label: 'Typed in' },
};
const NOVA = { 1: 'Unprocessed', 2: 'Processed ingredient', 3: 'Processed', 4: 'Ultra-processed' };

export default function Result({ product, profile, onBack, onScanAgain, onEdit, onLabel }) {
  const r = useMemo(() => analyze(product, profile), [product, profile]);
  const [allBad, setAllBad] = useState(false);
  const [allGood, setAllGood] = useState(false);

  if (r.insufficient) {
    return (
      <main className="screen has-bar">
        <TopBar onBack={onBack} />
        <div className="state">
          <ProductThumb product={product} size={84} />
          <h2 style={{ marginTop: 20 }}>{product.name}</h2>
          <p>There's no ingredient list or nutrition info to score yet. Snap the label or type the ingredients.</p>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => onLabel(product)}>
              <ScanText size={20} /> Read the label
            </button>
            <button className="btn btn-secondary" onClick={() => onEdit(product)}>
              <Keyboard size={20} /> Type the ingredients
            </button>
          </div>
        </div>
      </main>
    );
  }

  const source = SOURCE[product.source] ?? SOURCE.typed;
  const SourceIcon = source.icon;
  const bad = allBad ? r.bad : r.bad.slice(0, 4);
  const good = allGood ? r.good : r.good.slice(0, 3);

  return (
    <main className={`screen has-bar no-tabs result ${verdictClass(r.overall)}`}>
      <TopBar onBack={onBack} />

      <div className="product-head fade-up">
        <ProductThumb product={product} size={76} />
        <div style={{ minWidth: 0 }}>
          <h1 className="product-name">{product.name}</h1>
          <div className="product-meta">
            {product.brand && product.brand.toLowerCase() !== product.name.toLowerCase() && <span>{product.brand}</span>}
            {product.quantity && <span>{product.quantity}</span>}
            <span className="source-tag">
              <SourceIcon size={13} /> {source.label}
            </span>
          </div>
        </div>
      </div>

      <section className="score-card fade-up" style={{ '--i': 1 }} aria-live="polite">
        <ScoreRing score={r.overall} />
        <div>
          <div className="verdict-label">{r.verdict.label}</div>
          <p className="verdict-line">{r.verdict.line}</p>
          {r.confidence !== 'high' && (
            <span className="confidence">
              <Info size={14} />
              {!r.hasNutrition ? 'No nutrition facts, so this is a best guess' : 'Based on nutrition only'}
            </span>
          )}
        </div>
      </section>

      <div className="pillars fade-up" style={{ '--i': 2 }}>
        {Object.values(r.pillars).map((p) => {
          const Icon = PILLAR_ICONS[p.key];
          return (
            <div key={p.key} className={`pillar ${verdictClass(p.score)}`}>
              <div className="pillar-top" title={p.label}>
                <Icon size={15} /> {p.short}
              </div>
              <div className="pillar-score">
                <b>{p.score}</b>
                <span>{p.estimated ? 'Est.' : p.word}</span>
              </div>
              <div className="bar">
                <i style={{ width: `${Math.max(4, p.score)}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {r.bad.length > 0 && (
        <section className="card fade-up" style={{ '--i': 3 }}>
          <h2>
            <TriangleAlert size={19} color="var(--caution)" /> Heads up <span className="count">{r.bad.length}</span>
          </h2>
          {bad.map((f) => (
            <Flag key={f.id} flag={f} />
          ))}
          {r.bad.length > bad.length && (
            <button className="more-btn" onClick={() => setAllBad(true)}>
              Show {r.bad.length - bad.length} more <ChevronDown size={16} />
            </button>
          )}
        </section>
      )}

      {r.good.length > 0 && (
        <section className="card fade-up" style={{ '--i': 4 }}>
          <h2>
            <CircleCheck size={19} color="var(--great)" /> The good stuff <span className="count">{r.good.length}</span>
          </h2>
          {good.map((f) => (
            <Flag key={f.id} flag={f} />
          ))}
          {r.good.length > good.length && (
            <button className="more-btn" onClick={() => setAllGood(true)}>
              Show {r.good.length - good.length} more <ChevronDown size={16} />
            </button>
          )}
        </section>
      )}

      {r.bad.length === 0 && r.good.length === 0 && (
        <section className="card">
          <p className="card-sub" style={{ margin: 0 }}>
            Nothing stood out, good or bad, in what we could read.
          </p>
        </section>
      )}

      {r.nutrition && <Nutrition n={r.nutrition} isBeverage={r.isBeverage} />}

      <section className="card">
        <h2>
          <Info size={18} color="var(--text-3)" /> Details
        </h2>
        <div className="facts">
          {r.nova && (
            <div className="fact">
              <span>Processing</span>
              <b>
                {NOVA[r.nova]}
                {r.novaEstimated ? ' (estimated)' : ''}
              </b>
            </div>
          )}
          {product.nutriscore && (
            <div className="fact">
              <span>Nutri-Score</span>
              <span className={`nutriscore ns-${product.nutriscore}`}>{product.nutriscore}</span>
            </div>
          )}
          <div className="fact">
            <span>Additives</span>
            <b>{r.additives.length ? r.additives.map((a) => a.toUpperCase()).join(', ') : 'None found'}</b>
          </div>
          {product.allergens?.length > 0 && (
            <div className="fact">
              <span>Allergens</span>
              <b>{product.allergens.map((a) => a.replace(/-/g, ' ')).join(', ')}</b>
            </div>
          )}
        </div>
      </section>

      {product.ingredientsText && (
        <section className="card">
          <h2>Ingredients</h2>
          <p className="ingredients">
            <Highlighted text={product.ingredientsText} marks={r.highlights} />
          </p>
          {r.highlights.length > 0 && (
            <div className="legend">
              {r.highlights.some((h) => h.kind === 'bad') && (
                <span>
                  <i /> Watch out
                </span>
              )}
              {r.highlights.some((h) => h.kind === 'good') && (
                <span>
                  <i className="good" /> Good for you
                </span>
              )}
            </div>
          )}
        </section>
      )}

      <button className="btn btn-ghost edit-link" onClick={() => onEdit(product)}>
        <Pencil size={16} /> Something wrong? Edit ingredients
      </button>

      <p className="footnote">
        {product.source === 'barcode' && product.code && (
          <>
            Product data from{' '}
            <a href={productPageUrl(product.code)} target="_blank" rel="noopener noreferrer">
              Open Food Facts
            </a>
            , a free database anyone can improve.{' '}
          </>
        )}
        This is general guidance based on ingredients and nutrition, not medical advice. Everyone with IBD reacts
        differently, so check with your doctor or dietitian, especially during a flare.
      </p>

      <div className="action-bar">
        <button className="btn btn-primary" onClick={onScanAgain}>
          <ScanBarcode size={20} /> Scan another
        </button>
      </div>
    </main>
  );
}

function Flag({ flag }) {
  const sev = flag.kind === 'good' ? 'good' : flag.severity;
  const Icon = sev === 'good' ? CircleCheck : sev === 'high' ? TriangleAlert : sev === 'medium' ? CircleAlert : Info;
  return (
    <div className={`flag sev-${sev}`}>
      <span className="flag-icon">
        <Icon size={16} />
      </span>
      <div>
        <div className="flag-title">
          {flag.title}
          {flag.dealbreaker && <span className="tag">Your trigger</span>}
          {flag.estimated && <span className="tag">Estimated</span>}
        </div>
        <p className="flag-detail">{flag.detail}</p>
        {flag.found.length > 0 && (
          <div className="chips">
            {flag.found.map((t) => (
              <span key={t} className="chip found">
                {t}
              </span>
            ))}
          </div>
        )}
        {flag.tip && (
          <div className="flag-tip">
            <Lightbulb size={15} />
            <span>{flag.tip}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Nutrition({ n, isBeverage }) {
  const unit = isBeverage ? '100 ml' : '100 g';
  const kcalLevel = n.kcal == null ? null : isBeverage ? (n.kcal <= 10 ? 'low' : n.kcal <= 40 ? 'medium' : 'high') : n.kcal <= 150 ? 'low' : n.kcal <= 400 ? 'medium' : 'high';
  const items = [
    { key: 'kcal', label: 'Calories', unit: 'kcal', level: kcalLevel },
    { key: 'sugars', label: 'Sugar', unit: 'g', level: nutrientLevel('sugars', n.sugars, isBeverage) },
    { key: 'fat', label: 'Fat', unit: 'g', level: nutrientLevel('fat', n.fat, isBeverage) },
    { key: 'satFat', label: 'Saturated fat', unit: 'g', level: nutrientLevel('satFat', n.satFat, isBeverage) },
    { key: 'salt', label: 'Salt', unit: 'g', level: nutrientLevel('salt', n.salt, isBeverage) },
    { key: 'protein', label: 'Protein', unit: 'g', level: n.protein >= 8 ? 'good' : null },
    { key: 'fiber', label: 'Fibre', unit: 'g', level: n.fiber >= 3 ? 'good' : null },
  ].filter((i) => n[i.key] != null);
  const fmt = (v) => (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10);

  return (
    <section className="card">
      <h2>Nutrition</h2>
      <p className="card-sub">Per {unit}</p>
      <div className="nutri">
        {items.map((i) => (
          <div key={i.key} className="nutri-item">
            <div className="label">{i.label}</div>
            <div className="value">
              <b>
                {fmt(n[i.key])}
                <small>{i.unit}</small>
              </b>
              {i.level && <span className={`lvl lvl-${i.level}`}>{i.level === 'good' ? 'Good' : i.level === 'medium' ? 'Med' : i.level}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Highlighted({ text, marks }) {
  const parts = [];
  let pos = 0;
  for (const m of marks) {
    if (m.start > pos) parts.push(text.slice(pos, m.start));
    parts.push(
      <mark key={m.start} className={m.kind}>
        {text.slice(m.start, m.end)}
      </mark>,
    );
    pos = m.end;
  }
  parts.push(text.slice(pos));
  return parts;
}
