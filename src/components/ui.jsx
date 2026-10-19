import { useEffect, useId, useState } from 'react';
import { ChevronLeft, ScanText, Keyboard, Package } from 'lucide-react';
import { APP_NAME } from '../config.js';
import { verdictFor } from '../lib/score.js';

export function LogoMark({ size = 34 }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#63c496" />
          <stop offset="1" stopColor="#1b5840" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill={`url(#${id})`} />
      <path d="M12.5 35.5c0-13.2 8.6-22.5 23.5-22.5 0 14.8-9.2 22.8-23.5 22.5z" fill="#fff" />
      <path d="M10.5 37.5 27 21" stroke="#2f7d5b" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      <span>{APP_NAME.toLowerCase()}</span>
    </span>
  );
}

export function TopBar({ title, onBack, right }) {
  return (
    <header className="topbar">
      {onBack && (
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
      )}
      {title ? <h1 style={right ? { marginRight: 0 } : undefined}>{title}</h1> : <span className="spacer" />}
      {right}
    </header>
  );
}

export const verdictClass = (score) => `v-${verdictFor(score).key}`;

export function ScorePill({ score }) {
  return <span className={`pill ${verdictClass(score)}`}>{score}</span>;
}

export function ProductThumb({ product, size = 52 }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size, borderRadius: size > 60 ? 18 : 14 };
  if (product?.image && !broken) {
    return (
      <span className="thumb" style={style}>
        <img src={product.image} alt="" loading="lazy" onError={() => setBroken(true)} />
      </span>
    );
  }
  const Icon = product?.source === 'label' ? ScanText : product?.source === 'typed' ? Keyboard : Package;
  return (
    <span className="thumb placeholder" style={style}>
      <Icon size={size * 0.42} />
    </span>
  );
}

/** Animated circular score. */
export function ScoreRing({ score, size = 128 }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setShown(score);
      return;
    }
    let raf;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 1100);
      setShown(Math.round(score * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`Score ${score} out of 100`}>
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--v)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="ring-num">
        <b>{shown}</b>
        <span>out of 100</span>
      </div>
    </div>
  );
}

export function Toggle({ icon: Icon, title, desc, checked, onChange }) {
  return (
    <label className="switch-row">
      {Icon && (
        <span className="row-icon">
          <Icon size={18} />
        </span>
      )}
      <span className="switch-text">
        <b>{title}</b>
        {desc && <small>{desc}</small>}
      </span>
      <input type="checkbox" className="switch" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function timeAgo(ts) {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
