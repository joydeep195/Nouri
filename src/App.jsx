import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PROFILE } from './lib/score.js';
import { parseScan } from './lib/scan.js';
import { KEYS, addToHistory, usePersistentState } from './lib/storage.js';
import TabBar from './components/TabBar.jsx';
import Home from './screens/Home.jsx';
import History from './screens/History.jsx';
import Profile from './screens/Profile.jsx';
import Onboarding from './screens/Onboarding.jsx';
import Scanner from './screens/Scanner.jsx';
import Lookup, { QrLink } from './screens/Lookup.jsx';
import LabelReader from './screens/LabelReader.jsx';
import IngredientsForm from './screens/IngredientsForm.jsx';
import BarcodeEntry from './screens/BarcodeEntry.jsx';
import Result from './screens/Result.jsx';

/** A tiny screen stack that also works with the phone's back gesture/button. */
function useNavigator() {
  const [stack, setStack] = useState([{ name: 'home', params: {} }]);
  useEffect(() => {
    const onPop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const go = useCallback((name, params = {}) => {
    window.history.pushState({ nouri: true }, '');
    setStack((s) => [...s, { name, params }]);
  }, []);
  const replace = useCallback((name, params = {}) => setStack((s) => [...s.slice(0, -1), { name, params }]), []);
  const back = useCallback(() => window.history.back(), []);
  const tab = useCallback((name) => setStack([{ name, params: {} }]), []);
  return { route: stack[stack.length - 1], depth: stack.length, go, replace, back, tab };
}

export default function App() {
  const [profile, setProfile] = usePersistentState(KEYS.profile, DEFAULT_PROFILE);
  const [history, setHistory] = usePersistentState(KEYS.history, []);
  const nav = useNavigator();
  const { route } = nav;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  if (!profile.onboarded) {
    return <Onboarding initial={{ ...DEFAULT_PROFILE, ...profile }} onDone={(p) => setProfile({ ...p, onboarded: true })} />;
  }

  const showResult = (product) => {
    setHistory((h) => addToHistory(h, product));
    nav.replace('result', { product });
  };
  const onDetected = (raw) => {
    const scan = parseScan(raw);
    if (scan.type === 'barcode') nav.replace('lookup', { code: scan.code });
    else nav.replace('qr', scan);
  };
  const openEntry = (entry) => nav.go('result', { product: entry.product });
  const scan = () => nav.go('scan');
  const toLabel = (base) => nav.replace('label', { base });
  const toType = (base) => nav.replace('type', { base });

  const p = route.params;
  switch (route.name) {
    case 'scan':
      return <Scanner onDetected={onDetected} onClose={nav.back} onLabel={() => toLabel()} onCode={() => nav.replace('code')} />;
    case 'lookup':
      return (
        <Lookup
          code={p.code}
          profile={profile}
          onFound={showResult}
          onBack={nav.back}
          onLabel={toLabel}
          onType={toType}
          onRescan={() => nav.replace('scan')}
        />
      );
    case 'qr':
      return <QrLink {...p} onBack={nav.back} onLabel={() => toLabel()} onRescan={() => nav.replace('scan')} />;
    case 'code':
      return <BarcodeEntry onBack={nav.back} onSubmit={(code) => nav.replace('lookup', { code })} />;
    case 'label':
      return <LabelReader base={p.base} onResult={showResult} onBack={nav.back} onType={toType} />;
    case 'type':
      return (
        <IngredientsForm
          title={p.base?.ingredientsText ? 'Edit ingredients' : 'Type ingredients'}
          source="typed"
          base={p.base}
          initial={p.base ? { name: p.base.name, ingredients: p.base.ingredientsText, nutrition: p.base.nutrition, isBeverage: p.base.isBeverage } : {}}
          onSubmit={showResult}
          onBack={nav.back}
        />
      );
    case 'result':
      return (
        <Result
          key={p.product.code ?? p.product.name}
          product={p.product}
          profile={profile}
          onBack={nav.back}
          onScanAgain={() => nav.replace('scan')}
          onEdit={(product) => nav.go('type', { base: product })}
          onLabel={(product) => nav.go('label', { base: product })}
        />
      );
    case 'profile':
      return (
        <Profile
          profile={profile}
          setProfile={setProfile}
          onBack={nav.back}
          onReset={() => {
            setHistory([]);
            setProfile(DEFAULT_PROFILE);
            nav.tab('home');
          }}
        />
      );
    default:
      return (
        <>
          {route.name === 'history' ? (
            <History
              history={history}
              profile={profile}
              onOpen={openEntry}
              onDelete={(id) => setHistory((h) => h.filter((e) => e.id !== id))}
              onClear={() => setHistory([])}
            />
          ) : (
            <Home
              profile={profile}
              history={history}
              onScan={scan}
              onLabel={() => nav.go('label')}
              onType={() => nav.go('type')}
              onCode={() => nav.go('code')}
              onOpen={openEntry}
              onProfile={() => nav.go('profile')}
              onHistory={() => nav.tab('history')}
            />
          )}
          <TabBar active={route.name === 'history' ? 'history' : 'home'} onTab={nav.tab} onScan={scan} />
        </>
      );
  }
}
