import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

interface AccountOverviewProps {
  totalPnL: number;
  totalTrades: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

const MetricCard: React.FC<{ label: string; value: string; color?: string }> = ({
  label, value, color = 'var(--text-primary)',
}) => (
  <Paper sx={{ p: 1.5, bgcolor: 'var(--bg-tertiary)', borderRadius: '8px', flex: 1, minWidth: 'calc(50% - 8px)' }}>
    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: 10, display: 'block' }}>{label}</Typography>
    <Typography variant="body2" className="font-mono" sx={{ color, fontWeight: 700, fontSize: 18, mt: 0.3 }}>{value}</Typography>
  </Paper>
);

const AccountOverview: React.FC<AccountOverviewProps> = ({ totalPnL, totalTrades, winRate, maxDrawdown, sharpeRatio }) => {
  const pnlColor = totalPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontWeight: 600, mb: 1.5, fontSize: 14 }}>账户概览</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        <MetricCard label="总盈亏" value={`${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}`} color={pnlColor} />
        <MetricCard label="总交易" value={`${totalTrades}`} />
        <MetricCard label="胜率" value={`${winRate.toFixed(1)}%`} color="var(--accent-blue)" />
        <MetricCard label="最大回撤" value={`${maxDrawdown.toFixed(1)}%`} color="var(--accent-red)" />
        <MetricCard label="夏普比率" value={`${sharpeRatio.toFixed(2)}`} color={sharpeRatio >= 1 ? 'var(--accent-green)' : 'var(--accent-red)'} />
      </Box>
    </Box>
  );
};

export default AccountOverview;
