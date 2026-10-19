import { Check, CirclePlus, CircleQuestionMark } from 'lucide-react';
import { checkTrigger } from '@/features/profile/model/triggers';
import { normName } from '../model/ingredients';

interface UnrecognisedCardProps {
  items: { text: string }[];
  triggers: string[];
  onAddTrigger?: ((name: string) => void) | undefined;
}

/** Lists ingredients the app couldn't identify, each with a one-tap "add as my trigger". */
export function UnrecognisedCard({ items, triggers, onAddTrigger }: UnrecognisedCardProps) {
  if (!items.length) return null;
  return (
    <section className="card" aria-labelledby="unknown-heading">
      <h2 id="unknown-heading">
        <CircleQuestionMark size={18} color="var(--text-3)" aria-hidden="true" /> Not recognised{' '}
        <span className="count">{items.length}</span>
      </h2>
      <p className="card-sub">
        We don&apos;t know {items.length === 1 ? 'this ingredient' : 'these ingredients'} yet, so{' '}
        {items.length === 1 ? 'it isn’t' : 'they aren’t'} part of the score. If one bothers you, add it as a trigger and
        Nouri will flag it from now on.
      </p>
      <ul className="unknown-list">
        {items.map((u) => {
          const value = normName(u.text);
          const added = triggers.includes(value);
          const check = checkTrigger(value, triggers);
          return (
            <li key={u.text}>
              <span className="unknown-name">{u.text}</span>
              {onAddTrigger &&
                (added ? (
                  <span className="unknown-added">
                    <Check size={15} aria-hidden="true" /> Added
                  </span>
                ) : (
                  <button
                    type="button"
                    className="unknown-add"
                    disabled={!check.ok}
                    title={check.ok ? undefined : check.reason}
                    aria-label={`Add ${u.text} as a trigger`}
                    onClick={() => {
                      if (check.ok) onAddTrigger(check.value);
                    }}
                  >
                    <CirclePlus size={15} aria-hidden="true" /> Add as trigger
                  </button>
                ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
