import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '@/shared/lib/motion';

const R = 52;
const C = 2 * Math.PI * R;
const DURATION_MS = 1100;

/** Animated circular score that counts up from zero. */
export function ScoreRing({ score, size = 128 }: { score: number; size?: number }) {
  const reduceMotion = usePrefersReducedMotion();
  const [counted, setCounted] = useState(0);

  useEffect(() => {
    if (reduceMotion) return undefined;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      setCounted(Math.round(score * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [score, reduceMotion]);

  const shown = reduceMotion ? score : counted;
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`Score ${score} out of 100`}>
      <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--surface-3)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="var(--v)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - shown / 100)}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="ring-num" aria-hidden="true">
        <b>{shown}</b>
        <span>out of 100</span>
      </div>
    </div>
  );
}
