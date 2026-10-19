import type { ReactNode } from 'react';
import type { Highlight } from '../model/types';

/** Renders text with <mark>s around the highlighted ranges. Text is never parsed as HTML. */
export function Highlighted({ text, marks }: { text: string; marks: Highlight[] }) {
  const parts: ReactNode[] = [];
  let pos = 0;
  for (const m of marks) {
    if (m.start < pos || m.end > text.length) continue;
    if (m.start > pos) parts.push(text.slice(pos, m.start));
    parts.push(
      <mark key={m.start} className={m.kind}>
        {text.slice(m.start, m.end)}
      </mark>,
    );
    pos = m.end;
  }
  parts.push(text.slice(pos));
  return <>{parts}</>;
}
