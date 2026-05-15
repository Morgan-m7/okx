import React from 'react';
import { Box, Typography, Chip, Switch, IconButton } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useStrategyStore } from '../../stores/strategyStore';
import type { StrategyConfig, StrategyFamily } from '../../types/strategy';

interface StrategyCardProps {
  strategy: StrategyConfig;
  onConfigure: (strategy: StrategyConfig) => void;
  onToggle: (id: string) => void;
}

const StrategyCard: React.FC<StrategyCardProps> = ({ strategy, onConfigure, onToggle }) => {
  const getStrategyDescription = (sid: string): string => {
    const descriptions: Record<string, string> = {
      'ma-cross': '快慢均线交叉信号',
      'macd': 'MACD金叉死叉信号',
      'turtle': '唐奇安通道突破',
      'channel-breakout': '布林带通道突破',
      'adx-trend': 'ADX趋势强度跟踪',
      'classic-martingale': '亏损双倍加仓',
      'anti-martingale': '盈利按比例加仓',
      'fibonacci-martingale': '斐波那契序列加仓',
      'grid': '等距网格高抛低吸',
      'hedge-grid': '多空双向网格',
      'rsi': 'RSI超买超卖反转',
      'bollinger-reversal': '布林带触碰反转',
      'stochastic': '随机指标交叉',
      'momentum-scalper': '短周期动量突破',
      'tick-scalper': 'Tick级超短线',
      'multi-indicator': '多指标共振确认',
      'multi-timeframe': '多时间框架分析',
    };
    return descriptions[sid] || '';
  };

  const isMartingale = strategy.family === 'martingale';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 2,
        py: 1.5,
        borderBottom: '1px solid var(--border)',
        '&:active': { bgcolor: 'var(--bg-tertiary)' },
      }}
    >
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>
            {strategy.name}
          </Typography>
          {isMartingale && (
            <Chip
              label="ADX保护"
              size="small"
              sx={{ height: 18, fontSize: 9, bgcolor: 'var(--accent-yellow)', color: '#000' }}
            />
          )}
        </Box>
        <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: 11, mt: 0.3, display: 'block' }}>
          {getStrategyDescription(strategy.strategyId)}
        </Typography>
      </Box>

      <IconButton size="small" onClick={() => onConfigure(strategy)} sx={{ color: 'var(--text-secondary)', mr: 0.5 }}>
        <SettingsIcon fontSize="small" />
      </IconButton>

      <Switch
        checked={strategy.isActive}
        onChange={() => onToggle(strategy.id)}
        size="small"
        sx={{
          '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--accent-green)' },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'var(--accent-green)' },
        }}
      />
    </Box>
  );
};

export default StrategyCard;
