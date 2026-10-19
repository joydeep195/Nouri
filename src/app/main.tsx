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
