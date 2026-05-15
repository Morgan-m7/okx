import React, { useState } from 'react';
import { Box, Typography, Button, Select, MenuItem, TextField } from '@mui/material';
import { useMarketStore } from '../../stores/marketStore';
import { TIMEFRAMES } from '../../constants/timeframes';
import { useStrategyStore } from '../../stores/strategyStore';
import type { SymbolPair, Timeframe } from '../../types/market';

interface BacktestConfigPanelProps {
  onStart: (config: {
    strategyId: string;
    symbol: SymbolPair;
    timeframe: Timeframe;
    startDate: number;
    endDate: number;
  }) => void;
  isRunning: boolean;
}

const BacktestConfigPanel: React.FC<BacktestConfigPanelProps> = ({ onStart, isRunning }) => {
  const strategies = useStrategyStore((s) => s.strategies);
  const activeSyms = useMarketStore((s) => s.activeSymbols);
  const symbolList = activeSyms.length > 0 ? activeSyms : ['EUR/USD', 'GBP/USD'];
  const [strategyId, setStrategyId] = useState('');
  const [symbol, setSymbol] = useState<SymbolPair>('BTC/USDT');
  const [timeframe, setTimeframe] = useState<Timeframe>('H1');
  const [days, setDays] = useState(180);

  const handleStart = () => {
    if (!strategyId) return;
    const endDate = Date.now();
    const startDate = endDate - days * 24 * 60 * 60 * 1000;
    onStart({ strategyId, symbol, timeframe, startDate, endDate });
  };

  return (
    <Box sx={{ bgcolor: 'var(--bg-secondary)', borderRadius: '10px', p: 2, mb: 2 }}>
      <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontWeight: 600, mb: 1.5, fontSize: 14 }}>
        回测配置
      </Typography>

      <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 0.5 }}>
        策略
      </Typography>
      <Select
        value={strategyId}
        onChange={(e) => setStrategyId(e.target.value)}
        size="small"
        fullWidth
        displayEmpty
        sx={{ bgcolor: 'var(--bg-tertiary)', color: 'var(--text-primary)', mb: 1.5 }}
      >
        <MenuItem value="" disabled>选择策略</MenuItem>
        {strategies.map((s) => (
          <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
        ))}
      </Select>

      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 0.5 }}>
            品种
          </Typography>
          <Select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value as SymbolPair)}
            size="small"
            fullWidth
            sx={{ bgcolor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            {symbolList.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 0.5 }}>
            周期
          </Typography>
          <Select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as Timeframe)}
            size="small"
            fullWidth
            sx={{ bgcolor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            {TIMEFRAMES.map((tf) => (
              <MenuItem key={tf} value={tf}>{tf}</MenuItem>
            ))}
          </Select>
        </Box>
      </Box>

      <TextField
        label="回测天数"
        type="number"
        value={days}
        onChange={(e) => setDays(parseInt(e.target.value) || 30)}
        size="small"
        fullWidth
        sx={{ mb: 1.5, input: { color: 'var(--text-primary)' }, label: { color: 'var(--text-secondary)' } }}
      />

      <Button
        variant="contained"
        onClick={handleStart}
        disabled={!strategyId || isRunning}
        fullWidth
        sx={{ bgcolor: 'var(--accent-blue)' }}
      >
        {isRunning ? '回测运行中...' : '开始回测'}
      </Button>
    </Box>
  );
};

export default BacktestConfigPanel;
