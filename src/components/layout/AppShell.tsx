import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div
      className="flex flex-col h-full w-full bg-bg-primary"
      style={{
        paddingTop: 'var(--safe-top)',
        paddingBottom: 'var(--safe-bottom)',
      }}
    >
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default AppShell;
