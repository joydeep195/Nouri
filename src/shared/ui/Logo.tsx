import { useId } from 'react';
import { APP_NAME } from '@/shared/config/app';

export function LogoMark({ size = 34 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#63c496" />
          <stop offset="1" stopColor="#1b5840" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill={`url(#${id})`} />
      <path d="M12.5 35.5c0-13.2 8.6-22.5 23.5-22.5 0 14.8-9.2 22.8-23.5 22.5z" fill="#fff" />
      <path d="M10.5 37.5 27 21" stroke="#2f7d5b" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      <span>{APP_NAME.toLowerCase()}</span>
    </span>
  );
}
