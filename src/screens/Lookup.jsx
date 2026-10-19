import { useEffect, useState } from 'react';
import { ExternalLink, Keyboard, Link, PackageSearch, RefreshCw, ScanBarcode, ScanText, WifiOff } from 'lucide-react';
import { lookupBarcode } from '../lib/openfoodfacts.js';
import { analyze } from '../lib/score.js';
import { LogoMark, ProductThumb, TopBar } from '../components/ui.jsx';

/** Looks a barcode up and hands the product on, or explains what to do if it isn't found. */
export default function Lookup({ code, profile, onFound, onBack, onLabel, onType, onRescan }) {
  const [state, setState] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: 'loading' });
    lookupBarcode(code, { signal: ctrl.signal })
      .then((product) => {
        if (!product) setState({ status: 'notfound' });
        else if (analyze(product, profile).insufficient) setState({ status: 'incomplete', product });
        else onFound(product);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setState({ status: 'error', message: err.message });
      });
    return () => ctrl.abort();
    // profile/onFound are read once per lookup on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, attempt]);

  if (state.status === 'loading') {
    return (
      <main className="screen">
        <div className="state">
          <div className="pulse" style={{ marginBottom: 24 }}>
            <LogoMark size={72} />
          </div>
          <h2>Looking it up…</h2>
          <span className="code-chip">{code}</span>
        </div>
      </main>
    );
  }

  const base = state.product ?? { code, source: 'barcode' };
  const states = {
    notfound: {
      icon: <PackageSearch size={38} />,
      title: "We don't know this one yet",
      text: "This product isn't in the Open Food Facts database. You can still check it by reading the ingredients on the pack.",
    },
    incomplete: {
      icon: <ProductThumb product={state.product} size={84} />,
      title: state.product?.name,
      text: "We found it, but the database doesn't list its ingredients or nutrition yet. Snap the label and we'll score it.",
    },
    error: {
      icon: <WifiOff size={38} />,
      title: "Couldn't look it up",
      text: state.message,
    },
  }[state.status];

  return (
    <main className="screen has-bar">
      <TopBar onBack={onBack} />
      <div className="state" style={{ minHeight: '64dvh' }}>
        <div className={`state-icon ${state.status === 'error' ? 'warn' : ''}`} style={state.status === 'incomplete' ? { background: 'none' } : undefined}>
          {states.icon}
        </div>
        <h2>{states.title}</h2>
        <span className="code-chip">{code}</span>
        <p>{states.text}</p>
        <div className="btn-row">
          {state.status === 'error' ? (
            <button className="btn btn-primary" onClick={() => setAttempt((a) => a + 1)}>
              <RefreshCw size={20} /> Try again
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => onLabel(base)}>
              <ScanText size={20} /> Read the label
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => onType(base)}>
            <Keyboard size={20} /> Type the ingredients
          </button>
          <button className="btn btn-ghost" onClick={onRescan}>
            <ScanBarcode size={18} /> Scan something else
          </button>
        </div>
      </div>
    </main>
  );
}

export function QrLink({ url, text, onBack, onLabel, onRescan }) {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    host = '';
  }
  return (
    <main className="screen has-bar">
      <TopBar onBack={onBack} />
      <div className="state" style={{ minHeight: '64dvh' }}>
        <div className="state-icon">
          <Link size={36} />
        </div>
        <h2>{url ? 'This QR code opens a website' : "This code isn't a product"}</h2>
        {url ? <span className="code-chip">{host}</span> : <span className="code-chip">{text?.slice(0, 40)}</span>}
        <p>
          It doesn't carry a product barcode, so we can't score it directly. Scan the regular barcode on the pack, or read the
          ingredients label.
        </p>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={onRescan}>
            <ScanBarcode size={20} /> Scan the barcode instead
          </button>
          <button className="btn btn-secondary" onClick={() => onLabel()}>
            <ScanText size={20} /> Read the label
          </button>
          {url && (
            <a className="btn btn-ghost" href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={18} /> Open the link
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
