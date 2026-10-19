import { useState, type Dispatch, type SetStateAction, type SyntheticEvent } from 'react';
import { Feather, HeartPulse, Plus, Scale, Target, X } from 'lucide-react';
import { APP_NAME, APP_VERSION } from '@/shared/config/app';
import { Toggle } from '@/shared/ui/Toggle';
import { TopBar } from '@/shared/ui/TopBar';
import type { Profile as ProfileData } from '../model/profile';
import { checkTrigger, MAX_TRIGGER_LENGTH } from '../model/triggers';
import { SENSITIVITIES } from './sensitivities';
import './profile.css';

interface ProfileProps {
  profile: ProfileData;
  setProfile: Dispatch<SetStateAction<ProfileData>>;
  onBack: () => void;
  onReset: () => void;
}

export default function Profile({ profile, setProfile, onBack, onReset }: ProfileProps) {
  const [trigger, setTrigger] = useState('');
  const [triggerError, setTriggerError] = useState('');
  const update = (patch: Partial<ProfileData>) => {
    setProfile((p) => ({ ...p, ...patch }));
  };

  const addTrigger = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const check = checkTrigger(trigger, profile.triggers);
    if (!check.ok) {
      setTriggerError(check.reason);
      return;
    }
    update({ triggers: [...profile.triggers, check.value] });
    setTrigger('');
    setTriggerError('');
  };

  return (
    <main className="screen has-bar no-tabs">
      <TopBar title="Your profile" onBack={onBack} />

      <section className="settings-group">
        <h2>About you</h2>
        <div className="settings-card">
          <div className="field name-field">
            <label htmlFor="name">Your first name</label>
            <input
              id="name"
              className="input"
              value={profile.name}
              maxLength={40}
              onChange={(e) => {
                update({ name: e.target.value });
              }}
              placeholder="So we can say hi"
              autoComplete="given-name"
            />
          </div>
        </div>
      </section>

      <section className="settings-group">
        <h2>Your goal</h2>
        <div className="settings-card">
          <Toggle
            icon={Target}
            title="Losing weight"
            desc="Pay closer attention to calories, sugar and how filling food is"
            checked={profile.weightLoss}
            onChange={(v) => {
              update({ weightLoss: v });
            }}
          />
        </div>
      </section>

      <section className="settings-group">
        <h2>Your gut</h2>
        <div className="settings-card">
          {SENSITIVITIES.map((s) => (
            <Toggle
              key={s.key}
              icon={s.icon}
              title={s.title}
              desc={s.desc}
              checked={profile[s.key]}
              onChange={(v) => {
                update({ [s.key]: v });
              }}
            />
          ))}
        </div>
      </section>

      <section className="settings-group">
        <h2>Personal triggers</h2>
        <div className="settings-card">
          <form className="trigger-add" onSubmit={addTrigger} noValidate>
            <input
              className="input"
              value={trigger}
              maxLength={MAX_TRIGGER_LENGTH}
              onChange={(e) => {
                setTrigger(e.target.value);
                setTriggerError('');
              }}
              placeholder="e.g. corn, peanuts, mushroom"
              aria-label="Add a trigger food"
              aria-invalid={!!triggerError}
              aria-describedby={triggerError ? 'trigger-error' : undefined}
            />
            <button className="icon-btn" type="submit" aria-label="Add trigger">
              <Plus size={22} />
            </button>
          </form>
          {triggerError && (
            <p id="trigger-error" className="field-error" role="alert" style={{ marginTop: -4, paddingBottom: 10 }}>
              {triggerError}
            </p>
          )}
          {profile.triggers.length ? (
            <ul className="trigger-chips">
              {profile.triggers.map((t) => (
                <li key={t}>
                  <button
                    type="button"
                    className="trigger-chip"
                    onClick={() => {
                      update({ triggers: profile.triggers.filter((x) => x !== t) });
                    }}
                    aria-label={`Remove ${t}`}
                  >
                    {t} <X size={15} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              Add any food or ingredient that bothers you. Anything containing it will be marked &quot;Best
              avoided&quot;.
            </p>
          )}
        </div>
      </section>

      <section className="settings-group">
        <h2>How scoring works</h2>
        <div className="settings-card">
          <div className="how">
            <div className="how-item">
              <span>
                <HeartPulse size={17} />
              </span>
              <div>
                <b>Overall health</b>: how processed it is, additives, salt, saturated and trans fats, and fibre.
              </div>
            </div>
            <div className="how-item">
              <span>
                <Feather size={17} />
              </span>
              <div>
                <b>Gut comfort</b>: ingredients linked to IBD symptoms, like emulsifiers, carrageenan, sugar alcohols
                and FODMAPs, plus your own sensitivities.
              </div>
            </div>
            <div className="how-item">
              <span>
                <Scale size={17} />
              </span>
              <div>
                <b>Weight goals</b>: calories, sugar, and whether it will keep you full (protein and fibre).
              </div>
            </div>
            <p className="muted" style={{ padding: 0 }}>
              The overall score leans towards the weakest of the three, so one big problem can&apos;t hide behind good
              numbers. Anything you&apos;ve marked as a trigger is always &quot;Best avoided&quot;.
            </p>
          </div>
        </div>
      </section>

      <section className="settings-group">
        <h2>About</h2>
        <div className="settings-card">
          <p className="about">
            {APP_NAME} gives general guidance based on ingredients and nutrition. It is not medical advice. Everyone
            with IBD reacts differently, so please follow your doctor&apos;s or dietitian&apos;s advice, especially
            during a flare.
          </p>
          <p className="about">
            Product data comes from{' '}
            <a
              href="https://world.openfoodfacts.org"
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
            >
              Open Food Facts
            </a>
            . Your profile and history stay on this phone. Version {APP_VERSION}.
          </p>
          <p className="about">
            <button
              type="button"
              className="btn btn-ghost danger"
              style={{ padding: 0, minHeight: 0 }}
              onClick={() => {
                if (window.confirm('Reset the app? This clears your profile and scan history on this phone.'))
                  onReset();
              }}
            >
              Reset app
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
