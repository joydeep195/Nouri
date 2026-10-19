import { verdictFor } from '../model/score';

/** CSS class that sets the --v / --v-soft colour variables for a score. */
export const verdictClass = (score: number): string => `v-${verdictFor(score).key}`;

export function ScorePill({ score }: { score: number }) {
  return (
    <span className={`pill ${verdictClass(score)}`} aria-label={`Score ${score} out of 100`}>
      {score}
    </span>
  );
}
