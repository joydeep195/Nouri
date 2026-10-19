import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/plus-jakarta-sans';
import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/components.css';
import { installGlobalErrorHandlers } from '@/shared/lib/logger';
import App from './App';
import { ErrorBoundary } from './ErrorBoundary';

installGlobalErrorHandlers();

// Ask the browser not to evict the profile and history when the phone is low on space.
void (navigator as { storage?: Partial<StorageManager> }).storage?.persist?.().catch(() => false);

// Installs the offline cache and quietly updates the app when a new version is published.
registerSW({ immediate: true });

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
