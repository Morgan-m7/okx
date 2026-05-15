import React, { useState } from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import PageContainer from '../layout/PageContainer';
import AccountOverview from './AccountOverview';
import MonthlyAnalysis from './MonthlyAnalysis';
import RiskAssessment from './RiskAssessment';
import TradeStatistics from './TradeStatistics';
import { useTradingStore } from '../../stores/tradingStore';

type Tab = 'overview' | 'monthly' | 'risk' | 'stats';

const PerformancePage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('overview');
  const account = useTradingStore((s) => s.account);
  const tradeHistory = useTradingStore((s) => s.tradeHistory);

  const totalPnL = tradeHistory.reduce((s, t) => s + t.profit, 0);
  const totalTrades = tradeHistory.length;
  const winningTrades = tradeHistory.filter(t => t.profit > 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const maxDrawdown = 8.3;
  const sharpeRatio = 1.24;

  const monthlyData = [
    { month: '1月', profit: 320, trades: 12 },
    { month: '2月', profit: -150, trades: 8 },
    { month: '3月', profit: 450, trades: 15 },
    { month: '4月', profit: 180, trades: 10 },
    { month: '5月', profit: -80, trades: 6 },
    { month: '6月', profit: 290, trades: 11 },
  ];

  const tradeStats = {
    totalBuys: tradeHistory.filter(t => t.direction === 'buy').length,
    totalSells: tradeHistory.filter(t => t.direction === 'sell').length,
    avgHoldingPeriod: 120,
    avgWinPips: 25.3,
    avgLossPips: -15.7,
    largestWin: 185.50,
    largestLoss: -120.30,
  };

  return (
    <PageContainer>
      <Box sx={{ px: 1, py: 1.5 }}>
        <Typography variant="h6" sx={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 20, mb: 2 }}>
          性能分析
        </Typography>

        <ToggleButtonGroup
          value={tab}
          exclusive
          onChange={(_, v) => v && setTab(v)}
          size="small"
          sx={{
            mb: 2,
            display: 'flex',
            '& .MuiToggleButton-root': {
              flex: 1,
              color: 'var(--text-secondary)',
              borderColor: 'var(--border)',
              fontSize: 11,
              py: 0.5,
              '&.Mui-selected': {
                bgcolor: 'var(--accent-blue)',
                color: '#fff',
              },
            },
          }}
        >
          <ToggleButton value="overview">账户概览</ToggleButton>
          <ToggleButton value="monthly">月度分析</ToggleButton>
          <ToggleButton value="risk">风险评估</ToggleButton>
          <ToggleButton value="stats">交易统计</ToggleButton>
        </ToggleButtonGroup>

        {tab === 'overview' && (
          <AccountOverview
            totalPnL={totalPnL}
            totalTrades={totalTrades}
            winRate={winRate}
            maxDrawdown={maxDrawdown}
            sharpeRatio={sharpeRatio}
          />
        )}
        {tab === 'monthly' && <MonthlyAnalysis data={monthlyData} />}
        {tab === 'risk' && (
          <RiskAssessment
            maxDrawdown={maxDrawdown}
            currentDrawdown={3.2}
            leverageUsed={15}
            volatility={22.5}
            varEstimate={450}
          />
        )}
        {tab === 'stats' && <TradeStatistics stats={tradeStats} />}
      </Box>
    </PageContainer>
  );
};

export default PerformancePage;
