import { CircleAlert, CircleCheck, Info, Lightbulb, TriangleAlert } from 'lucide-react';
import type { Flag } from '../model/types';

export function FlagItem({ flag }: { flag: Flag }) {
  const sev = flag.kind === 'good' ? 'good' : flag.severity;
  const Icon = sev === 'good' ? CircleCheck : sev === 'high' ? TriangleAlert : sev === 'medium' ? CircleAlert : Info;
  return (
    <div className={`flag sev-${sev}`}>
      <span className="flag-icon" aria-hidden="true">
        <Icon size={16} />
      </span>
      <div>
        <h3 className="flag-title">
          {flag.title}
          {flag.dealbreaker && <span className="tag">Your trigger</span>}
          {flag.estimated && <span className="tag">Estimated</span>}
        </h3>
        <p className="flag-detail">{flag.detail}</p>
        {flag.found.length > 0 && (
          <ul className="chips" aria-label="Found on the label">
            {flag.found.map((t) => (
              <li key={t} className="chip found">
                {t}
              </li>
            ))}
          </ul>
        )}
        {flag.tip && (
          <div className="flag-tip">
            <Lightbulb size={15} aria-hidden="true" />
            <span>{flag.tip}</span>
          </div>
        )}
      </div>
    </div>
  );
}
