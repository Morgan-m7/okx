import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import CandlestickChartIcon from '@mui/icons-material/CandlestickChart';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CurrencyBitcoinIcon from '@mui/icons-material/CurrencyBitcoin';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTradingModeStore } from '../../stores/tradingModeStore';
import { useUIStore } from '../../stores/uiStore';

/** Forex 模式底部导航 */
const forexTabs = [
  { label: '行情', icon: <ShowChartIcon />, path: '/market', id: 'market' },
  { label: '图表', icon: <CandlestickChartIcon />, path: '/chart', id: 'chart' },
  { label: '策略', icon: <AccountTreeIcon />, path: '/strategy', id: 'strategy' },
  { label: '交易', icon: <AccountBalanceWalletIcon />, path: '/trading', id: 'trading' },
  { label: '分析', icon: <AssessmentIcon />, path: '/performance', id: 'performance' },
  { label: '设置', icon: <SettingsIcon />, path: '/settings', id: 'settings' },
] as const;

/** Crypto 模式底部导航 */
const cryptoTabs = [
  { label: '行情', icon: <ShowChartIcon />, path: '/market', id: 'market' },
  { label: '图表', icon: <CandlestickChartIcon />, path: '/chart', id: 'chart' },
  { label: '合约', icon: <CurrencyBitcoinIcon />, path: '/trading', id: 'trading' },
  { label: '资产', icon: <AccountBalanceIcon />, path: '/performance', id: 'performance' },
  { label: '设置', icon: <SettingsIcon />, path: '/settings', id: 'settings' },
] as const;

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mode = useTradingModeStore((s) => s.mode);
  const setActiveTab = useUIStore((state) => state.setActiveTab);

  const tabs = mode === 'crypto' ? cryptoTabs : forexTabs;

  const currentValue = tabs.findIndex(t => t.path === location.pathname);
  const activeValue = currentValue >= 0 ? currentValue : 0;

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    const tab = tabs[newValue];
    if (tab) {
      setActiveTab(tab.id as any);
      navigate(tab.path);
    }
  };

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingBottom: 'var(--safe-bottom)',
      }}
      elevation={4}
    >
      <BottomNavigation
        value={activeValue}
        onChange={handleChange}
        sx={{
          height: 'var(--tab-bar-height)',
          bgcolor: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border)',
        }}
      >
        {tabs.map((tab) => (
          <BottomNavigationAction
            key={tab.id}
            label={tab.label}
            icon={tab.icon}
            sx={{
              color: 'var(--text-secondary)',
              '&.Mui-selected': { color: 'var(--accent-blue)' },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '11px',
                fontWeight: 500,
              },
            }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
};

export default BottomNav;
