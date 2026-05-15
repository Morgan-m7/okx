import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Slider,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import { useMarketStore } from '../../stores/marketStore';
import { getActiveSymbols } from '../../constants/symbols';
import { useStrategyStore } from '../../stores/strategyStore';
import { DEFAULTS } from '../../constants/defaults';
import type { StrategyConfig, StrategyId, StrategyFamily } from '../../types/strategy';
import type { SymbolPair } from '../../types/market';

interface StrategyConfigModalProps {
  open: boolean;
  strategy: StrategyConfig | null;
  onClose: () => void;
}

const STRATEGY_PARAM_META: Record<string, Record<string, { label: string; min: number; max: number; step: number }>> = {
  'ma-cross': {
    fastPeriod: { label: '快线周期', min: 5, max: 50, step: 1 },
    slowPeriod: { label: '慢线周期', min: 10, max: 200, step: 1 },
  },
  'macd': {
    fast: { label: '快线', min: 5, max: 30, step: 1 },
    slow: { label: '慢线', min: 15, max: 60, step: 1 },
    signal: { label: '信号线', min: 5, max: 20, step: 1 },
  },
  'turtle': {
    period: { label: '突破周期', min: 10, max: 50, step: 1 },
    atrMultiplier: { label: 'ATR倍数', min: 1, max: 5, step: 0.5 },
  },
  'classic-martingale': {
    baseVolume: { label: '初始手数', min: 0.01, max: 1, step: 0.01 },
    multiplier: { label: '加仓倍数', min: 1.5, max: 3, step: 0.1 },
    maxLayers: { label: '最大层数', min: 1, max: 5, step: 1 },
    takeProfitPips: { label: '止盈点数', min: 10, max: 200, step: 5 },
  },
  'grid': {
    gridCount: { label: '网格层数', min: 5, max: 30, step: 1 },
    rangePercent: { label: '区间范围%', min: 1, max: 10, step: 0.5 },
    volumePerGrid: { label: '每层手数', min: 0.01, max: 1, step: 0.01 },
  },
  'rsi': {
    period: { label: 'RSI周期', min: 7, max: 28, step: 1 },
    overbought: { label: '超买阈值', min: 60, max: 90, step: 1 },
    oversold: { label: '超卖阈值', min: 10, max: 40, step: 1 },
  },
  'bollinger-reversal': {
    period: { label: '布林带周期', min: 10, max: 50, step: 1 },
    stdDev: { label: '标准差', min: 1, max: 3, step: 0.5 },
    confirmationCandles: { label: '确认K线数', min: 1, max: 3, step: 1 },
  },
};

const StrategyConfigModal: React.FC<StrategyConfigModalProps> = ({ open, strategy, onClose }) => {
  const updateStrategy = useStrategyStore((s) => s.updateStrategy);

  // Hooks 必须在条件返回之前声明（React规则）
  const [params, setParams] = useState<Record<string, any>>(strategy?.params ?? {});
  const [symbols, setSymbols] = useState<SymbolPair[]>(strategy?.symbols ?? []);
  const [riskParams, setRiskParams] = useState(strategy?.riskParams ?? {
    maxLossPercent: 10,
    balanceProtectionPercent: 20,
    maxMartingaleLayers: 5,
    adxProtectionEnabled: false,
  });

  const paramMeta = strategy ? (STRATEGY_PARAM_META[strategy.strategyId] || {}) : {};
  const isMartingale = strategy?.family === 'martingale';
  const activeSymbolsList = useMarketStore((s) => s.activeSymbols);
  const symbolsList = activeSymbolsList.length > 0 ? activeSymbolsList : getActiveSymbols('forex');

  if (!strategy) return null;

  const handleParamChange = (key: string, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleSymbolToggle = (symbol: SymbolPair) => {
    setSymbols((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  };

  const handleSave = () => {
    updateStrategy(strategy.id, {
      params,
      symbols,
      riskParams,
      updatedAt: Date.now(),
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 600 }}>
        {strategy.name} - 配置
      </DialogTitle>
      <DialogContent sx={{ pb: 1 }}>
        {Object.entries(paramMeta).map(([key, meta]) => (
          <Box key={key} sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 0.5, fontSize: 12 }}>
              {meta.label}: {params[key] ?? meta.min}
            </Typography>
            <Slider
              value={params[key] ?? meta.min}
              onChange={(_, val) => handleParamChange(key, val as number)}
              min={meta.min}
              max={meta.max}
              step={meta.step}
              size="small"
            />
          </Box>
        ))}

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 1, fontSize: 12 }}>
            绑定货币对
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {symbolsList.map((symbol) => (
              <Chip
                key={symbol}
                label={symbol}
                size="small"
                onClick={() => handleSymbolToggle(symbol)}
                sx={{
                  bgcolor: symbols.includes(symbol) ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                  color: symbols.includes(symbol) ? '#fff' : 'var(--text-secondary)',
                  fontSize: 11,
                }}
              />
            ))}
          </Box>
        </Box>

        {isMartingale && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(255,214,0,0.1)', borderRadius: '8px', border: '1px solid rgba(255,214,0,0.3)' }}>
            <Typography variant="caption" sx={{ color: 'var(--accent-yellow)', fontWeight: 600, display: 'block', mb: 1 }}>
              风控参数
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>余额保护比例</Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-primary)' }}>{riskParams.balanceProtectionPercent}%</Typography>
            </Box>
            <Slider
              value={riskParams.balanceProtectionPercent}
              onChange={(_, val) => setRiskParams((p) => ({ ...p, balanceProtectionPercent: val as number }))}
              min={10}
              max={50}
              step={5}
              size="small"
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>单策略最大亏损</Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-primary)' }}>{riskParams.maxLossPercent}%</Typography>
            </Box>
            <Slider
              value={riskParams.maxLossPercent}
              onChange={(_, val) => setRiskParams((p) => ({ ...p, maxLossPercent: val as number }))}
              min={5}
              max={30}
              step={5}
              size="small"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={riskParams.adxProtectionEnabled}
                  size="small"
                  disabled
                />
              }
              label={
                <Typography variant="caption" sx={{ color: 'var(--accent-yellow)', fontSize: 11 }}>
                  ADX震荡保护 (强制开启)
                </Typography>
              }
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onClose} sx={{ color: 'var(--text-secondary)' }}>取消</Button>
        <Button onClick={handleSave} variant="contained" color="primary">保存</Button>
      </DialogActions>
    </Dialog>
  );
};

export default StrategyConfigModal;
