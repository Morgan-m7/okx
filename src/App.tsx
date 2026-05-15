import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import MarketWatchPage from './components/market-watch/MarketWatchPage';
import ChartPage from './components/chart/ChartPage';
import StrategyCenterPage from './components/strategy/StrategyCenterPage';
import TradingPage from './components/trading/TradingPage';
import PerformancePage from './components/performance/PerformancePage';
import SettingsPage from './components/settings/SettingsPage';
import ErrorBoundary from './components/shared/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppShell>
        <Routes>
          <Route path="/market" element={<MarketWatchPage />} />
          <Route path="/chart" element={<ChartPage />} />
          <Route path="/strategy" element={<StrategyCenterPage />} />
          <Route path="/trading" element={<TradingPage />} />
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/market" replace />} />
        </Routes>
      </AppShell>
    </ErrorBoundary>
  );
};

export default App;
