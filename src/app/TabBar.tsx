import { Clock, House, ScanBarcode } from 'lucide-react';
import './tabbar.css';

export type Tab = 'home' | 'history';

interface TabBarProps {
  active: Tab;
  onTab: (tab: Tab) => void;
  onScan: () => void;
}

export default function TabBar({ active, onTab, onScan }: TabBarProps) {
  return (
    <nav className="tabbar" aria-label="Main">
      <button
        type="button"
        className={`tab ${active === 'home' ? 'active' : ''}`}
        aria-current={active === 'home' ? 'page' : undefined}
        onClick={() => {
          onTab('home');
        }}
      >
        <House size={23} />
        Home
      </button>
      <button type="button" className="fab" onClick={onScan} aria-label="Scan food">
        <ScanBarcode size={28} />
      </button>
      <button
        type="button"
        className={`tab ${active === 'history' ? 'active' : ''}`}
        aria-current={active === 'history' ? 'page' : undefined}
        onClick={() => {
          onTab('history');
        }}
      >
        <Clock size={23} />
        History
      </button>
    </nav>
  );
}
