import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

interface TradeStats {
  totalBuys: number;
  totalSells: number;
  avgHoldingPeriod: number;
  avgWinPips: number;
  avgLossPips: number;
  largestWin: number;
  largestLoss: number;
}

interface TradeStatisticsProps {
  stats: TradeStats;
}

const TradeStatistics: React.FC<TradeStatisticsProps> = ({ stats }) => {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontWeight: 600, mb: 1.5, fontSize: 14 }}>交易统计</Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Paper sx={{ flex: 1, p: 1.5, bgcolor: 'rgba(0,200,83,0.1)', borderRadius: '8px', textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'var(--accent-green)', fontWeight: 600, fontSize: 11 }}>多头</Typography>
          <Typography variant="body1" className="font-mono" sx={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: 22 }}>{stats.totalBuys}</Typography>
        </Paper>
        <Paper sx={{ flex: 1, p: 1.5, bgcolor: 'rgba(255,23,68,0.1)', borderRadius: '8px', textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'var(--accent-red)', fontWeight: 600, fontSize: 11 }}>空头</Typography>
          <Typography variant="body1" className="font-mono" sx={{ color: 'var(--accent-red)', fontWeight: 700, fontSize: 22 }}>{stats.totalSells}</Typography>
        </Paper>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        <StatItem label="平均持仓" value={`${stats.avgHoldingPeriod.toFixed(0)} min`} />
        <StatItem label="平均盈利(pips)" value={stats.avgWinPips.toFixed(1)} color="var(--accent-green)" />
        <StatItem label="平均亏损(pips)" value={stats.avgLossPips.toFixed(1)} color="var(--accent-red)" />
        <StatItem label="最大盈利" value={`$${stats.largestWin.toFixed(2)}`} color="var(--accent-green)" />
        <StatItem label="最大亏损" value={`$${Math.abs(stats.largestLoss).toFixed(2)}`} color="var(--accent-red)" />
      </Box>
    </Box>
  );
};

const StatItem: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = 'var(--text-primary)' }) => (
  <Paper sx={{ p: 1.5, bgcolor: 'var(--bg-tertiary)', borderRadius: '8px', flex: 1, minWidth: 'calc(50% - 8px)' }}>
    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: 10, display: 'block' }}>{label}</Typography>
    <Typography variant="body2" className="font-mono" sx={{ color, fontWeight: 600, fontSize: 14, mt: 0.3 }}>{value}</Typography>
  </Paper>
);

export default TradeStatistics;
