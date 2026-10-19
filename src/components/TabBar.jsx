import { Clock, House, ScanBarcode } from 'lucide-react';

export default function TabBar({ active, onTab, onScan }) {
  return (
    <nav className="tabbar" aria-label="Main">
      <button className={`tab ${active === 'home' ? 'active' : ''}`} onClick={() => onTab('home')}>
        <House size={23} />
        Home
      </button>
      <button className="fab" onClick={onScan} aria-label="Scan food">
        <ScanBarcode size={28} />
      </button>
      <button className={`tab ${active === 'history' ? 'active' : ''}`} onClick={() => onTab('history')}>
        <Clock size={23} />
        History
      </button>
    </nav>
  );
}
