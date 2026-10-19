import type { CSSProperties } from 'react';

/** Sets the --i custom property used by `.fade-up` to stagger entrance animations. */
export const stagger = (i: number): CSSProperties => ({ '--i': i }) as CSSProperties;
