import { useEffect } from 'react';
import Result from '@/features/analysis/ui/Result';
import { addToHistory, HISTORY_STORE, type HistoryEntry } from '@/features/history/model/history';
import History from '@/features/history/ui/History';
import Home from '@/features/home/ui/Home';
import IngredientsForm from '@/features/label/ui/IngredientsForm';
import LabelReader from '@/features/label/ui/LabelReader';
import type { Product } from '@/features/product/model/types';
import Lookup from '@/features/product/ui/Lookup';
import QrLink from '@/features/product/ui/QrLink';
import { DEFAULT_PROFILE } from '@/features/profile/model/profile';
import Onboarding from '@/features/profile/ui/Onboarding';
import Profile from '@/features/profile/ui/Profile';
import { PROFILE_STORE } from '@/features/profile/model/profileStore';
import { parseScan } from '@/features/scan/model/scan';
import BarcodeEntry from '@/features/scan/ui/BarcodeEntry';
import Scanner from '@/features/scan/ui/Scanner';
import { useStore } from '@/shared/lib/storage';
import { useNavigator } from './navigation';
import TabBar from './TabBar';

export default function App() {
  const [profile, setProfile] = useStore(PROFILE_STORE);
  const [history, setHistory] = useStore(HISTORY_STORE);
  const nav = useNavigator();
  const { route } = nav;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  if (!profile.onboarded) {
    return (
      <Onboarding
        initial={{ ...DEFAULT_PROFILE, ...profile }}
        onDone={(p) => {
          setProfile({ ...p, onboarded: true });
        }}
      />
    );
  }

  const showResult = (product: Product) => {
    setHistory((h) => addToHistory(h, product));
    nav.replace({ name: 'result', product });
  };
  const onDetected = (raw: string) => {
    const scan = parseScan(raw);
    if (scan.type === 'barcode') nav.replace({ name: 'lookup', code: scan.code });
    else if (scan.type === 'url') nav.replace({ name: 'qr', url: scan.url });
    else nav.replace({ name: 'qr', text: scan.text });
  };
  const openEntry = (entry: HistoryEntry) => {
    nav.go({ name: 'result', product: entry.product });
  };
  const scan = () => {
    nav.go({ name: 'scan' });
  };
  const rescan = () => {
    nav.replace({ name: 'scan' });
  };
  const toLabel = (base?: Partial<Product>) => {
    nav.replace({ name: 'label', base });
  };
  const toType = (base?: Partial<Product>) => {
    nav.replace({ name: 'type', base });
  };

  switch (route.name) {
    case 'scan':
      return (
        <Scanner
          onDetected={onDetected}
          onClose={nav.back}
          onLabel={() => {
            toLabel();
          }}
          onCode={() => {
            nav.replace({ name: 'code' });
          }}
        />
      );
    case 'lookup':
      return (
        <Lookup
          code={route.code}
          onFound={showResult}
          onBack={nav.back}
          onLabel={toLabel}
          onType={toType}
          onRescan={rescan}
        />
      );
    case 'qr':
      return (
        <QrLink
          url={route.url}
          text={route.text}
          onBack={nav.back}
          onLabel={() => {
            toLabel();
          }}
          onRescan={rescan}
        />
      );
    case 'code':
      return (
        <BarcodeEntry
          onBack={nav.back}
          onSubmit={(code) => {
            nav.replace({ name: 'lookup', code });
          }}
        />
      );
    case 'label':
      return <LabelReader base={route.base} onResult={showResult} onBack={nav.back} onType={toType} />;
    case 'type': {
      const base = route.base;
      return (
        <IngredientsForm
          title={base?.ingredientsText ? 'Edit ingredients' : 'Type ingredients'}
          source="typed"
          base={base}
          initial={
            base
              ? {
                  name: base.name,
                  ingredients: base.ingredientsText,
                  nutrition: base.nutrition,
                  isBeverage: base.isBeverage,
                }
              : {}
          }
          onSubmit={showResult}
          onBack={nav.back}
        />
      );
    }
    case 'result':
      return (
        <Result
          key={route.product.code ?? route.product.name}
          product={route.product}
          profile={profile}
          onBack={nav.back}
          onScanAgain={rescan}
          onEdit={(product) => {
            nav.go({ name: 'type', base: product });
          }}
          onLabel={(product) => {
            nav.go({ name: 'label', base: product });
          }}
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
            setProfile({ ...DEFAULT_PROFILE });
            nav.tab('home');
          }}
        />
      );
    case 'home':
    case 'history':
      return (
        <>
          {route.name === 'history' ? (
            <History
              history={history}
              profile={profile}
              onOpen={openEntry}
              onDelete={(id) => {
                setHistory((h) => h.filter((e) => e.id !== id));
              }}
              onClear={() => {
                setHistory([]);
              }}
            />
          ) : (
            <Home
              profile={profile}
              history={history}
              onScan={scan}
              onLabel={() => {
                nav.go({ name: 'label' });
              }}
              onType={() => {
                nav.go({ name: 'type' });
              }}
              onCode={() => {
                nav.go({ name: 'code' });
              }}
              onOpen={openEntry}
              onProfile={() => {
                nav.go({ name: 'profile' });
              }}
              onHistory={() => {
                nav.tab('history');
              }}
            />
          )}
          <TabBar active={route.name} onTab={nav.tab} onScan={scan} />
        </>
      );
  }
}
