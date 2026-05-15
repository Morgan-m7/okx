import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import type { BacktestResult } from '../../types/backtest';

interface StatisticsCardsProps {
  result: BacktestResult | null;
}

const StatCard: React.FC<{ label: string; value: string; color?: string }> = ({
  label,
  value,
  color = 'var(--text-primary)',
}) => (
  <Paper
    sx={{
      p: 1.5,
      bgcolor: 'var(--bg-tertiary)',
      borderRadius: '8px',
      flex: 1,
      minWidth: 'calc(50% - 8px)',
    }}
  >
    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: 10, display: 'block' }}>
      {label}
    </Typography>
    <Typography variant="body2" className="font-mono" sx={{ color, fontWeight: 600, fontSize: 16, mt: 0.3 }}>
      {value}
    </Typography>
  </Paper>
);

const StatisticsCards: React.FC<StatisticsCardsProps> = ({ result }) => {
  if (!result) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
          请先运行回测以查看统计指标
        </Typography>
      </Box>
    );
  }

  const returnColor = result.totalReturn >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

  return (
    <Box sx={{ bgcolor: 'var(--bg-secondary)', borderRadius: '10px', p: 2, mb: 2 }}>
      <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontWeight: 600, mb: 1.5, fontSize: 14 }}>
        统计指标
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        <StatCard label="总收益率" value={`${result.totalReturn}%`} color={returnColor} />
        <StatCard label="年化收益率" value={`${result.annualizedReturn}%`} color={returnColor} />
        <StatCard label="胜率" value={`${result.winRate}%`} color="var(--accent-blue)" />
        <StatCard label="盈亏比" value={`${result.profitFactor}`} />
        <StatCard label="夏普比率" value={`${result.sharpeRatio}`} color={result.sharpeRatio >= 1 ? 'var(--accent-green)' : 'var(--accent-red)'} />
        <StatCard label="最大回撤" value={`${result.maxDrawdown}%`} color="var(--accent-red)" />
        <StatCard label="总交易" value={`${result.totalTrades}`} />
        <StatCard label="胜/负" value={`${result.winningTrades}/${result.losingTrades}`} />
      </Box>
    </Box>
  );
};

export default StatisticsCards;
