import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './ui/App';
import './index.css';

// Versi baru langsung dipakai; kalau ada pembaruan, halaman dimuat ulang otomatis.
registerSW({ immediate: true });

const root = document.getElementById('root');
if (!root) throw new Error('Elemen #root tidak ditemukan');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
