import { useMemo } from 'react';
import { Camera, ChevronRight, Hash, Keyboard, Lightbulb, ScanBarcode, Sparkles } from 'lucide-react';
import { analyze } from '@/features/analysis/model/score';
import { ScorePill } from '@/features/analysis/ui/ScorePill';
import type { HistoryEntry } from '@/features/history/model/history';
import { ProductThumb } from '@/features/product/ui/ProductThumb';
import type { Profile } from '@/features/profile/model/profile';
import { stagger } from '@/shared/lib/style';
import { timeAgo } from '@/shared/lib/time';
import { Logo } from '@/shared/ui/Logo';
import { tipOfTheDay } from '../model/tips';
import './home.css';

function greeting(hour = new Date().getHours()): string {
  if (hour < 5) return 'Hello';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

interface HomeProps {
  profile: Profile;
  history: HistoryEntry[];
  onScan: () => void;
  onLabel: () => void;
  onType: () => void;
  onCode: () => void;
  onOpen: (entry: HistoryEntry) => void;
  onProfile: () => void;
  onHistory: () => void;
}

export default function Home({
  profile,
  history,
  onScan,
  onLabel,
  onType,
  onCode,
  onOpen,
  onProfile,
  onHistory,
}: HomeProps) {
  const recent = useMemo(
    () => history.slice(0, 4).map((e) => ({ ...e, result: analyze(e.product, profile) })),
    [history, profile],
  );
  const name = profile.name.trim();

  return (
    <main className="screen">
      <div className="home-head">
        <Logo />
        <button type="button" className="avatar" onClick={onProfile} aria-label="Your profile">
          {name ? name.charAt(0).toUpperCase() : <Sparkles size={18} />}
        </button>
      </div>

      <div className="greeting fade-up">
        <p>
          {greeting()}
          {name ? `, ${name}` : ''} <span aria-hidden="true">👋</span>
        </p>
        <h1>What are we eating today?</h1>
      </div>

      <section className="hero fade-up" style={stagger(1)}>
        <ScanBarcode className="hero-art" size={120} strokeWidth={1.4} aria-hidden="true" />
        <div className="hero-eyebrow">Packaged food check</div>
        <h2>Is it a good choice?</h2>
        <p>Scan the barcode or QR code to see how it suits your gut, your health and your goals.</p>
        <button type="button" className="btn btn-white" onClick={onScan}>
          <ScanBarcode size={20} /> Scan food
        </button>
      </section>

      <div className="tiles fade-up" style={stagger(2)}>
        <button type="button" className="tile" onClick={onLabel}>
          <span className="tile-icon">
            <Camera size={20} />
          </span>
          <h3>Read a label</h3>
          <p>No barcode? Snap the ingredients.</p>
        </button>
        <button type="button" className="tile" onClick={onType}>
          <span className="tile-icon">
            <Keyboard size={20} />
          </span>
          <h3>Type it in</h3>
          <p>Paste or type an ingredient list.</p>
        </button>
      </div>
      <button type="button" className="link-row fade-up" style={stagger(3)} onClick={onCode}>
        <Hash size={18} /> Enter a barcode number <ChevronRight size={18} />
      </button>

      <div className="section-head">
        <h2>Recent</h2>
        {history.length > 0 && (
          <button type="button" onClick={onHistory}>
            See all
          </button>
        )}
      </div>
      {recent.length ? (
        <div className="rows">
          {recent.map((e, i) => (
            <button
              type="button"
              key={e.id}
              className="row fade-up"
              style={stagger(i)}
              onClick={() => {
                onOpen(e);
              }}
            >
              <ProductThumb product={e.product} />
              <span className="row-text">
                <span className="row-title">{e.product.name}</span>
                <span className="row-sub">
                  {e.result.insufficient ? 'Not enough info' : e.result.verdict.label} · {timeAgo(e.at)}
                </span>
              </span>
              {!e.result.insufficient && <ScorePill score={e.result.overall} />}
            </button>
          ))}
        </div>
      ) : (
        <div className="empty">
          <div className="empty-icon">
            <ScanBarcode size={24} />
          </div>
          Your scans will show up here.
          <br />
          Try scanning something from your kitchen!
        </div>
      )}

      <div className="tip-card">
        <span className="tip-icon">
          <Lightbulb size={18} />
        </span>
        <div>
          <b>Tip of the day</b>
          <p>{tipOfTheDay()}</p>
        </div>
      </div>
    </main>
  );
}
