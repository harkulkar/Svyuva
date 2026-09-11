import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ScrollToTop } from './components/common/ScrollToTop';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { registerServiceWorker } from './pwa/register';
import './index.css';

registerServiceWorker();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root was not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <ScrollToTop />
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>
);
