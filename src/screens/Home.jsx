import { useMemo } from 'react';
import { Camera, ChevronRight, Hash, Keyboard, Lightbulb, ScanBarcode, Sparkles } from 'lucide-react';
import { analyze } from '../lib/score.js';
import { Logo, ProductThumb, ScorePill, timeAgo } from '../components/ui.jsx';
import { TIPS } from '../components/sensitivities.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Hello';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home({ profile, history, onScan, onLabel, onType, onCode, onOpen, onProfile, onHistory }) {
  const recent = useMemo(
    () => history.slice(0, 4).map((e) => ({ ...e, result: analyze(e.product, profile) })),
    [history, profile],
  );
  const tip = TIPS[Math.floor(Date.now() / 86400000) % TIPS.length];
  const name = profile.name?.trim();

  return (
    <main className="screen">
      <div className="home-head">
        <Logo />
        <button className="avatar" onClick={onProfile} aria-label="Your profile">
          {name ? name[0].toUpperCase() : <Sparkles size={18} />}
        </button>
      </div>

      <div className="greeting fade-up">
        <p>
          {greeting()}
          {name ? `, ${name}` : ''} 👋
        </p>
        <h1>What are we eating today?</h1>
      </div>

      <section className="hero fade-up" style={{ '--i': 1 }}>
        <ScanBarcode className="hero-art" size={120} strokeWidth={1.4} />
        <div className="hero-eyebrow">Packaged food check</div>
        <h2>Is it a good choice?</h2>
        <p>Scan the barcode or QR code to see how it suits your gut, your health and your goals.</p>
        <button className="btn btn-white" onClick={onScan}>
          <ScanBarcode size={20} /> Scan food
        </button>
      </section>

      <div className="tiles fade-up" style={{ '--i': 2 }}>
        <button className="tile" onClick={onLabel}>
          <span className="tile-icon">
            <Camera size={20} />
          </span>
          <h3>Read a label</h3>
          <p>No barcode? Snap the ingredients.</p>
        </button>
        <button className="tile" onClick={onType}>
          <span className="tile-icon">
            <Keyboard size={20} />
          </span>
          <h3>Type it in</h3>
          <p>Paste or type an ingredient list.</p>
        </button>
      </div>
      <button className="link-row fade-up" style={{ '--i': 3 }} onClick={onCode}>
        <Hash size={18} /> Enter a barcode number <ChevronRight size={18} />
      </button>

      <div className="section-head">
        <h2>Recent</h2>
        {history.length > 0 && <button onClick={onHistory}>See all</button>}
      </div>
      {recent.length ? (
        <div className="rows">
          {recent.map((e, i) => (
            <button key={e.id} className="row fade-up" style={{ '--i': i }} onClick={() => onOpen(e)}>
              <ProductThumb product={e.product} />
              <span className="row-text">
                <span className="row-title">{e.product.name}</span>
                <span className="row-sub">
                  {e.result.verdict?.label ?? 'Not enough info'} · {timeAgo(e.at)}
                </span>
              </span>
              {e.result.insufficient ? null : <ScorePill score={e.result.overall} />}
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
          <p>{tip}</p>
        </div>
      </div>
    </main>
  );
}
