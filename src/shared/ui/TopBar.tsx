import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';

interface TopBarProps {
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function TopBar({ title, onBack, right }: TopBarProps) {
  return (
    <header className="topbar">
      {onBack && (
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
      )}
      {title ? <h1 style={right ? { marginRight: 0 } : undefined}>{title}</h1> : <span className="spacer" />}
      {right}
    </header>
  );
}
