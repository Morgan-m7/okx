import React from 'react';
import { Box, Typography } from '@mui/material';

interface MonthlyData {
  month: string;
  profit: number;
  trades: number;
}

interface MonthlyAnalysisProps {
  data: MonthlyData[];
}

const MonthlyAnalysis: React.FC<MonthlyAnalysisProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>暂无月度数据</Typography>
      </Box>
    );
  }

  const maxProfit = Math.max(...data.map(d => Math.abs(d.profit)), 1);

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontWeight: 600, mb: 1.5, fontSize: 14 }}>月度分析</Typography>
      {data.map((d) => {
        const isPositive = d.profit >= 0;
        const barWidth = (Math.abs(d.profit) / maxProfit) * 100;
        return (
          <Box key={d.month} sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>{d.month}</Typography>
              <Typography variant="caption" className="font-mono" sx={{ color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: 10 }}>
                {isPositive ? '+' : ''}${d.profit.toFixed(0)}
              </Typography>
            </Box>
            <Box sx={{ height: 6, bgcolor: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${barWidth}%`, bgcolor: isPositive ? 'var(--accent-green)' : 'var(--accent-red)', borderRadius: 3 }} />
            </Box>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: 9 }}>{d.trades} 笔交易</Typography>
          </Box>
        );
      })}
    </Box>
  );
};

export default MonthlyAnalysis;
