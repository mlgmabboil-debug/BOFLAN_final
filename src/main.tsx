// Safeguard against third-party extensions/wallets attempting to modify window.fetch in sandboxed/iframe environments.
try {
  if (typeof window !== 'undefined') {
    const originalFetch = window.fetch;
    let currentFetch = originalFetch;
    
    // Only redefine if the descriptor doesn't allow setting
    const desc = Object.getOwnPropertyDescriptor(window, 'fetch') || 
                 Object.getOwnPropertyDescriptor(Window.prototype, 'fetch');
                 
    if (desc && (!desc.writable || !desc.set)) {
      Object.defineProperty(window, 'fetch', {
        get() {
          return currentFetch;
        },
        set(value) {
          currentFetch = value;
        },
        configurable: true,
        enumerable: true
      });
    }
  }
} catch (e) {
  console.warn('Sandbox fetch setter safeguard initialization failed:', e);
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
