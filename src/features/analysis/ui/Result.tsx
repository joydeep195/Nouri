import { useMemo, useState } from 'react';
import {
  Barcode,
  ChevronDown,
  CircleCheck,
  Feather,
  HeartPulse,
  Info,
  Keyboard,
  Pencil,
  Scale,
  ScanBarcode,
  ScanText,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { productPageUrl } from '@/features/product/model/openFoodFacts';
import type { Product, ProductSource } from '@/features/product/model/types';
import { ProductThumb } from '@/features/product/ui/ProductThumb';
import type { Profile } from '@/features/profile/model/profile';
import { stagger } from '@/shared/lib/style';
import { TopBar } from '@/shared/ui/TopBar';
import { analyze } from '../model/score';
import type { Pillar } from '../model/types';
import { FlagItem } from './FlagItem';
import { Highlighted } from './Highlighted';
import { NutritionCard } from './NutritionCard';
import { ScoreRing } from './ScoreRing';
import { verdictClass } from './ScorePill';
import './result.css';

const PILLAR_ICONS: Record<Pillar, LucideIcon> = { health: HeartPulse, gut: Feather, weight: Scale };
const SOURCE: Record<ProductSource, { icon: LucideIcon; label: string }> = {
  barcode: { icon: Barcode, label: 'Scanned barcode' },
  label: { icon: ScanText, label: 'From a label photo' },
  typed: { icon: Keyboard, label: 'Typed in' },
};
const NOVA: Record<number, string> = {
  1: 'Unprocessed',
  2: 'Processed ingredient',
  3: 'Processed',
  4: 'Ultra-processed',
};
const SHOW_BAD = 4;
const SHOW_GOOD = 3;

interface ResultProps {
  product: Product;
  profile: Profile;
  onBack: () => void;
  onScanAgain: () => void;
  onEdit: (product: Product) => void;
  onLabel: (product: Product) => void;
}

export default function Result({ product, profile, onBack, onScanAgain, onEdit, onLabel }: ResultProps) {
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
          <p>There&apos;s no ingredient list or nutrition info to score yet. Snap the label or type the ingredients.</p>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onLabel(product);
              }}
            >
              <ScanText size={20} /> Read the label
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                onEdit(product);
              }}
            >
              <Keyboard size={20} /> Type the ingredients
            </button>
          </div>
        </div>
      </main>
    );
  }

  const source = SOURCE[product.source];
  const SourceIcon = source.icon;
  const bad = allBad ? r.bad : r.bad.slice(0, SHOW_BAD);
  const good = allGood ? r.good : r.good.slice(0, SHOW_GOOD);
  const showBrand = !!product.brand && product.brand.toLowerCase() !== product.name.toLowerCase();

  return (
    <main className={`screen has-bar no-tabs result ${verdictClass(r.overall)}`}>
      <TopBar onBack={onBack} />

      <div className="product-head fade-up">
        <ProductThumb product={product} size={76} />
        <div style={{ minWidth: 0 }}>
          <h1 className="product-name">{product.name}</h1>
          <div className="product-meta">
            {showBrand && <span>{product.brand}</span>}
            {product.quantity && <span>{product.quantity}</span>}
            <span className="source-tag">
              <SourceIcon size={13} aria-hidden="true" /> {source.label}
            </span>
          </div>
        </div>
      </div>

      <section className="score-card fade-up" style={stagger(1)} aria-live="polite" aria-label="Verdict">
        <ScoreRing score={r.overall} />
        <div>
          <div className="verdict-label">{r.verdict.label}</div>
          <p className="verdict-line">{r.verdict.line}</p>
          {r.confidence !== 'high' && (
            <span className="confidence">
              <Info size={14} aria-hidden="true" />
              {!r.hasNutrition ? 'No nutrition facts, so this is a best guess' : 'Based on nutrition only'}
            </span>
          )}
        </div>
      </section>

      <div className="pillars fade-up" style={stagger(2)}>
        {Object.values(r.pillars).map((p) => {
          const Icon = PILLAR_ICONS[p.key];
          return (
            <div
              key={p.key}
              className={`pillar ${verdictClass(p.score)}`}
              aria-label={`${p.label}: ${p.score} out of 100`}
            >
              <div className="pillar-top" title={p.label}>
                <Icon size={15} aria-hidden="true" /> {p.short}
              </div>
              <div className="pillar-score">
                <b>{p.score}</b>
                <span>{p.estimated ? 'Est.' : p.word}</span>
              </div>
              <div className="bar" aria-hidden="true">
                <i style={{ width: `${Math.max(4, p.score)}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {r.bad.length > 0 && (
        <section className="card fade-up" style={stagger(3)}>
          <h2>
            <TriangleAlert size={19} color="var(--caution)" aria-hidden="true" /> Heads up{' '}
            <span className="count">{r.bad.length}</span>
          </h2>
          {bad.map((f) => (
            <FlagItem key={f.id} flag={f} />
          ))}
          {r.bad.length > bad.length && (
            <button
              type="button"
              className="more-btn"
              onClick={() => {
                setAllBad(true);
              }}
            >
              Show {r.bad.length - bad.length} more <ChevronDown size={16} />
            </button>
          )}
        </section>
      )}

      {r.good.length > 0 && (
        <section className="card fade-up" style={stagger(4)}>
          <h2>
            <CircleCheck size={19} color="var(--great)" aria-hidden="true" /> The good stuff{' '}
            <span className="count">{r.good.length}</span>
          </h2>
          {good.map((f) => (
            <FlagItem key={f.id} flag={f} />
          ))}
          {r.good.length > good.length && (
            <button
              type="button"
              className="more-btn"
              onClick={() => {
                setAllGood(true);
              }}
            >
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

      {r.nutrition && <NutritionCard n={r.nutrition} isBeverage={r.isBeverage} />}

      <section className="card">
        <h2>
          <Info size={18} color="var(--text-3)" aria-hidden="true" /> Details
        </h2>
        <div className="facts">
          {r.nova != null && (
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
          {product.allergens && product.allergens.length > 0 && (
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

      <button
        type="button"
        className="btn btn-ghost edit-link"
        onClick={() => {
          onEdit(product);
        }}
      >
        <Pencil size={16} /> Something wrong? Edit ingredients
      </button>

      <p className="footnote">
        {product.source === 'barcode' && product.code && (
          <>
            Product data from{' '}
            <a
              href={productPageUrl(product.code)}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
            >
              Open Food Facts
            </a>
            , a free database anyone can improve.{' '}
          </>
        )}
        This is general guidance based on ingredients and nutrition, not medical advice. Everyone with IBD reacts
        differently, so check with your doctor or dietitian, especially during a flare.
      </p>

      <div className="action-bar">
        <button type="button" className="btn btn-primary" onClick={onScanAgain}>
          <ScanBarcode size={20} /> Scan another
        </button>
      </div>
    </main>
  );
}
