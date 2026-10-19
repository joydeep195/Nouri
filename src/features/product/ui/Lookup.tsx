import { useEffect, useEffectEvent, useState, type ReactNode } from 'react';
import { Keyboard, PackageSearch, RefreshCw, ScanBarcode, ScanText, WifiOff } from 'lucide-react';
import { canScore } from '@/features/analysis/model/score';
import { LogoMark } from '@/shared/ui/Logo';
import { TopBar } from '@/shared/ui/TopBar';
import { LookupError, lookupBarcode } from '../model/openFoodFacts';
import type { Product } from '../model/types';
import { ProductThumb } from './ProductThumb';

type LookupState =
  | { status: 'loading' }
  | { status: 'notfound' }
  | { status: 'incomplete'; product: Product }
  | { status: 'error'; message: string };

interface LookupProps {
  code: string;
  onFound: (product: Product) => void;
  onBack: () => void;
  onLabel: (base: Partial<Product>) => void;
  onType: (base: Partial<Product>) => void;
  onRescan: () => void;
}

const GENERIC_ERROR = "Couldn't look it up right now. Check your connection and try again.";

/** Looks a barcode up and hands the product on, or explains what to do if it isn't found. */
export default function Lookup({ code, onFound, onBack, onLabel, onType, onRescan }: LookupProps) {
  const [state, setState] = useState<LookupState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const found = useEffectEvent((product: Product) => {
    onFound(product);
  });

  useEffect(() => {
    const ctrl = new AbortController();
    lookupBarcode(code, { signal: ctrl.signal })
      .then((product) => {
        if (!product) setState({ status: 'notfound' });
        else if (!canScore(product)) setState({ status: 'incomplete', product });
        else found(product);
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setState({ status: 'error', message: err instanceof LookupError ? err.message : GENERIC_ERROR });
      });
    return () => {
      ctrl.abort();
    };
  }, [code, attempt]);

  if (state.status === 'loading') {
    return (
      <main className="screen">
        <div className="state" role="status">
          <div className="pulse" style={{ marginBottom: 24 }}>
            <LogoMark size={72} />
          </div>
          <h2>Looking it up…</h2>
          <span className="code-chip">{code}</span>
        </div>
      </main>
    );
  }

  const base: Partial<Product> = state.status === 'incomplete' ? state.product : { code, source: 'barcode' };
  const view: Record<Exclude<LookupState['status'], 'loading'>, { icon: ReactNode; title: string; text: string }> = {
    notfound: {
      icon: <PackageSearch size={38} />,
      title: "We don't know this one yet",
      text: "This product isn't in the Open Food Facts database. You can still check it by reading the ingredients on the pack.",
    },
    incomplete: {
      icon: <ProductThumb product={state.status === 'incomplete' ? state.product : null} size={84} />,
      title: state.status === 'incomplete' ? state.product.name : '',
      text: "We found it, but the database doesn't list its ingredients or nutrition yet. Snap the label and we'll score it.",
    },
    error: {
      icon: <WifiOff size={38} />,
      title: "Couldn't look it up",
      text: state.status === 'error' ? state.message : '',
    },
  };
  const v = view[state.status];

  return (
    <main className="screen has-bar">
      <TopBar onBack={onBack} />
      <div className="state" style={{ minHeight: '64dvh' }}>
        <div
          className={`state-icon ${state.status === 'error' ? 'warn' : ''}`}
          style={state.status === 'incomplete' ? { background: 'none' } : undefined}
        >
          {v.icon}
        </div>
        <h2>{v.title}</h2>
        <span className="code-chip">{code}</span>
        <p role={state.status === 'error' ? 'alert' : undefined}>{v.text}</p>
        <div className="btn-row">
          {state.status === 'error' ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setState({ status: 'loading' });
                setAttempt((a) => a + 1);
              }}
            >
              <RefreshCw size={20} /> Try again
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onLabel(base);
              }}
            >
              <ScanText size={20} /> Read the label
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              onType(base);
            }}
          >
            <Keyboard size={20} /> Type the ingredients
          </button>
          <button type="button" className="btn btn-ghost" onClick={onRescan}>
            <ScanBarcode size={18} /> Scan something else
          </button>
        </div>
      </div>
    </main>
  );
}
