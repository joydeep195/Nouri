import { useCallback, useEffect, useState } from 'react';
import type { Product } from '@/features/product/model/types';
import type { Tab } from './TabBar';

/** Every screen in the app and the data it needs. */
export type Route =
  | { name: 'home' }
  | { name: 'history' }
  | { name: 'profile' }
  | { name: 'scan' }
  | { name: 'code' }
  | { name: 'lookup'; code: string }
  | { name: 'qr'; url?: string; text?: string }
  | { name: 'label'; base?: Partial<Product> | undefined }
  | { name: 'type'; base?: Partial<Product> | undefined }
  | { name: 'result'; product: Product };

export interface Navigator {
  route: Route;
  depth: number;
  /** Opens a screen on top (the phone's back gesture returns to the previous one). */
  go: (route: Route) => void;
  /** Swaps the current screen, e.g. scanner → lookup → result. */
  replace: (route: Route) => void;
  back: () => void;
  /** Switches bottom tab, clearing the stack. */
  tab: (tab: Tab) => void;
}

/** A small screen stack that also follows the browser/phone back button. */
export function useNavigator(initial: Route = { name: 'home' }): Navigator {
  const [stack, setStack] = useState<Route[]>([initial]);

  useEffect(() => {
    const onPop = () => {
      setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  const go = useCallback((route: Route) => {
    window.history.pushState({ nouri: true }, '');
    setStack((s) => [...s, route]);
  }, []);
  const replace = useCallback((route: Route) => {
    setStack((s) => [...s.slice(0, -1), route]);
  }, []);
  const back = useCallback(() => {
    window.history.back();
  }, []);
  const tab = useCallback((name: Tab) => {
    setStack([{ name }]);
  }, []);

  const route = stack[stack.length - 1] ?? initial;
  return { route, depth: stack.length, go, replace, back, tab };
}
