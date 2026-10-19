import { useState } from 'react';
import { ArrowRight, Check, Feather, HeartPulse, Scale, Target } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '../config.js';
import { LogoMark } from '../components/ui.jsx';
import { SENSITIVITIES } from '../components/sensitivities.js';

const STEPS = 4;

export default function Onboarding({ initial, onDone }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState(initial);
  const set = (patch) => setP((x) => ({ ...x, ...patch }));
  const next = () => (step < STEPS - 1 ? setStep(step + 1) : onDone(p));

  return (
    <main className="onboard">
      <div className="onboard-top">
        <div className="dots" aria-hidden="true">
          {Array.from({ length: STEPS }, (_, i) => (
            <i key={i} className={i === step ? 'on' : ''} />
          ))}
        </div>
        {step > 0 && (
          <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
      </div>

      <div className="onboard-body" key={step}>
        {step === 0 && (
          <>
            <div className="welcome-art">
              <LogoMark size={104} />
            </div>
            <h1>
              Meet {APP_NAME}.
              <br />
              {APP_TAGLINE}.
            </h1>
            <p>Scan any packaged food and instantly see if it's a good choice for you.</p>
            <div className="welcome-points">
              <Point icon={HeartPulse} title="Overall health" text="Processing, additives, salt and fats" />
              <Point icon={Feather} title="Gut comfort" text="Ingredients known to upset IBD and Crohn's" />
              <Point icon={Scale} title="Weight goals" text="Calories, sugar and how filling it is" />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1>What should we call you?</h1>
            <p>Just your first name, so we can say hi. It stays on your phone.</p>
            <input
              className="input"
              style={{ marginTop: 22, fontSize: 20, fontWeight: 600, padding: '16px 18px' }}
              placeholder="Your name"
              value={p.name}
              onChange={(e) => set({ name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && next()}
              autoComplete="given-name"
              autoFocus
            />
            <div className="choices">
              <Choice icon={Target} title="I'm trying to lose weight" desc="Be stricter on calories and sugar" on={p.weightLoss} onClick={() => set({ weightLoss: !p.weightLoss })} />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1>Anything your gut doesn't like?</h1>
            <p>Pick all that apply. You can change these any time in your profile.</p>
            <div className="choices">
              {SENSITIVITIES.map((s) => (
                <Choice key={s.key} icon={s.icon} title={s.title} desc={s.desc} on={p[s.key]} onClick={() => set({ [s.key]: !p[s.key] })} />
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="welcome-art" style={{ width: 160, height: 160, marginBottom: 28 }}>
              <span style={{ position: 'relative', zIndex: 1, width: 76, height: 76, borderRadius: '50%', background: 'var(--brand)', color: 'var(--brand-ink)', display: 'grid', placeItems: 'center' }}>
                <Check size={40} strokeWidth={3} />
              </span>
            </div>
            <h1 style={{ textAlign: 'center' }}>You're all set{p.name.trim() ? `, ${p.name.trim()}` : ''}!</h1>
            <p style={{ textAlign: 'center' }}>
              Scan a barcode, or snap the ingredients when there isn't one. We'll tell you if it's a good choice and why.
            </p>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
              {APP_NAME} gives general guidance, not medical advice. Your doctor or dietitian knows you best.
            </p>
          </>
        )}
      </div>

      <div className="onboard-foot">
        <button className="btn btn-primary btn-block" onClick={next}>
          {step === 0 ? 'Get started' : step === STEPS - 1 ? 'Start scanning' : 'Continue'} <ArrowRight size={20} />
        </button>
        {step === 2 && !SENSITIVITIES.some((s) => p[s.key]) && (
          <button className="btn btn-ghost" onClick={next}>
            Nothing in particular
          </button>
        )}
      </div>
    </main>
  );
}

function Point({ icon: Icon, title, text }) {
  return (
    <div className="how-item">
      <span>
        <Icon size={17} />
      </span>
      <div>
        <b>{title}</b>
        <br />
        {text}
      </div>
    </div>
  );
}

function Choice({ icon: Icon, title, desc, on, onClick }) {
  return (
    <button type="button" className={`choice ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={!!on}>
      <span className="choice-icon">
        <Icon size={19} />
      </span>
      <span className="choice-text">
        <b>{title}</b>
        {desc && <small>{desc}</small>}
      </span>
      <span className="check">
        <Check size={15} strokeWidth={3} />
      </span>
    </button>
  );
}
