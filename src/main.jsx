import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/plus-jakarta-sans';
import './styles.css';
import App from './App.jsx';

// Installs the offline cache and quietly updates the app when a new version is published.
registerSW({ immediate: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
