import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { AppDataProvider } from './context/AppDataContext';
import { V4PlatformProvider } from './context/V4PlatformContext';
import { V16PlatformProvider } from './context/V16PlatformContext';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { ensureDailyRestorePoint } from './lib/mobileSafety';
import './styles/index.css';

ensureDailyRestorePoint();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppDataProvider>
            <V4PlatformProvider>
              <V16PlatformProvider>
                <App />
              </V16PlatformProvider>
            </V4PlatformProvider>
          </AppDataProvider>
        </AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}
