import { additiveInfo } from '../model/ingredients';

interface AdditiveListProps {
  codes: string[];
  abbreviations: { abbr: string; meaning: string; code?: string | undefined }[];
}

/** Each additive code with its name and job ("E471 · Mono- and diglycerides — emulsifier"), plus expanded abbreviations. */
export function AdditiveList({ codes, abbreviations }: AdditiveListProps) {
  const known = [...codes].sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10));
  const abbrByCode = new Map(abbreviations.filter((a) => a.code).map((a) => [a.code, a.abbr]));
  const plainAbbr = abbreviations.filter((a) => !a.code);

  return (
    <div className="additives">
      {known.length === 0 ? (
        <p className="additive-none">None found</p>
      ) : (
        <ul className="additive-list">
          {known.map((code) => {
            const info = additiveInfo(code);
            const abbr = abbrByCode.get(code);
            return (
              <li key={code}>
                <span className="additive-code">{code.toUpperCase()}</span>
                <span className="additive-text">
                  <b>
                    {info?.name ?? 'Unknown additive'}
                    {abbr ? ` (${abbr})` : ''}
                  </b>
                  {info && info.functions.length > 0 && <small>{info.functions.join(', ').toLowerCase()}</small>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {plainAbbr.length > 0 && (
        <p className="additive-abbr">
          {plainAbbr.map((a, i) => (
            <span key={a.abbr}>
              {i > 0 && ' · '}
              <b>{a.abbr}</b> = {a.meaning}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
