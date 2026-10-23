import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ToastProvider } from './components/Toast';
import { AppShell } from './components/AppShell';
import { HomePage } from './pages/HomePage';
import { SystemPage } from './pages/SystemPage';
import { BorrowPage } from './pages/BorrowPage';
import { WhatIfPage } from './pages/WhatIfPage';
import { MultiplyPage } from './pages/MultiplyPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { PositionPage } from './pages/PositionPage';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/borrow" element={<BorrowPage />} />
              <Route path="/what-if" element={<WhatIfPage />} />
              <Route path="/multiply" element={<MultiplyPage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/position" element={<PositionPage />} />
              <Route path="/system" element={<SystemPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </ToastProvider>
    </MotionConfig>
  </StrictMode>,
);
