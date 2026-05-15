import React, { useEffect, useState } from 'react';
import { Box, Typography, Chip, Switch } from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useStrategyStore } from '../../stores/strategyStore';
import { useTradingStore } from '../../stores/tradingStore';
import { useStrategyRunner } from '../../hooks/useStrategyRunner';
import type { SymbolPair } from '../../types/market';

interface StrategyMonitorPanelProps {
  symbol: SymbolPair;
}

const STRATEGY_COLORS: Record<string, string> = {
  'trend-following': '#2196F3',
  'mean-reversion': '#9C27B0',
  'martingale': '#FFD600',
};

const StrategyMonitorPanel: React.FC<StrategyMonitorPanelProps> = ({ symbol }) => {
  const strategies = useStrategyStore((s) => s.strategies);
  const contractPositions = useTradingStore((s) => s.contractPositions);
  const { toggleActive } = useStrategyRunner();

  // ★ 等持久化的策略数据加载完再渲染
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (strategies.length > 0) { setReady(true); return; }
    const timer = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(timer);
  }, [strategies.length]);

  if (!ready) {
    return (
      <Box sx={{ bgcolor: 'var(--bg-secondary)', borderRadius: '10px', p: 2, textAlign: 'center' }}>
        <Typography sx={{ color: '#555', fontSize: 12, py: 1 }}>加载策略配置中...</Typography>
      </Box>
    );
  }

  // 显示所有策略（不过滤交易对，方便加密货币模式使用）
  const relatedStrategies = strategies;

  // 当前持仓
  const activePositions = contractPositions.filter(p => p.symbol === symbol);
  const totalPnl = activePositions.reduce((s, p) => s + p.unrealizedPnl, 0);

  if (relatedStrategies.length === 0) {
    return (
      <Box sx={{ bgcolor: 'var(--bg-secondary)', borderRadius: '10px', p: 2, textAlign: 'center' }}>
        <AccountTreeIcon sx={{ color: '#555', fontSize: 28, mb: 0.5 }} />
        <Typography sx={{ color: '#555', fontSize: 12 }}>
          未开启策略 — 前往 设置→策略 开启自动交易
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'var(--bg-secondary)', borderRadius: '10px', overflow: 'hidden' }}>
      {/* 标题栏 */}
      <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AccountTreeIcon sx={{ color: '#2196F3', fontSize: 16 }} />
          <Typography sx={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>
            自动策略 · {symbol}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label={`${activePositions.length} 持仓`} size="small"
            sx={{ bgcolor: 'rgba(33,150,243,0.12)', color: '#2196F3', fontSize: 10, height: 20 }} />
          <Chip label={totalPnl >= 0 ? `+$${totalPnl.toFixed(2)}` : `-$${Math.abs(totalPnl).toFixed(2)}`} size="small"
            sx={{
              bgcolor: totalPnl >= 0 ? 'rgba(0,200,83,0.15)' : 'rgba(255,23,68,0.15)',
              color: totalPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
              fontSize: 10, height: 20, fontWeight: 600,
            }} />
        </Box>
      </Box>

      {/* 策略列表 */}
      {relatedStrategies.map(config => {
        const isActive = config.isActive;
        const familyColor = STRATEGY_COLORS[config.family] || '#888';
        const strategyPositions = activePositions;
        const strategyPnl = strategyPositions.reduce((s, p) => s + p.unrealizedPnl, 0);

        return (
          <Box key={config.id} sx={{
            px: 1.5, py: 1,
            borderBottom: '1px solid var(--border)',
            borderLeft: `3px solid ${isActive ? familyColor : '#2A2D3A'}`,
            opacity: isActive ? 1 : 0.5,
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {isActive ? (
                  <CheckCircleIcon sx={{ color: familyColor, fontSize: 14 }} />
                ) : (
                  <ErrorIcon sx={{ color: '#555', fontSize: 14 }} />
                )}
                <Typography sx={{ color: isActive ? '#fff' : '#555', fontWeight: 600, fontSize: 12 }}>
                  {config.name}
                </Typography>
                {strategyPositions.length > 0 && (
                  <Chip label={`${strategyPositions.length} 单`} size="small"
                    sx={{ bgcolor: 'rgba(33,150,243,0.1)', color: '#64B5F6', fontSize: 9, height: 18 }} />
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{
                  color: strategyPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                  fontSize: 11, fontWeight: 600,
                }}>
                  {strategyPnl >= 0 ? '+' : ''}${strategyPnl.toFixed(2)}
                </Typography>
                <Switch
                  checked={isActive}
                  onChange={() => toggleActive(config.id)}
                  size="small"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: familyColor },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: familyColor },
                  }}
                />
              </Box>
            </Box>

            {/* 持仓详情 */}
            {strategyPositions.length > 0 && (
              <Box sx={{ mt: 0.5, pl: 2.5 }}>
                {strategyPositions.map(pos => (
                  <Box key={pos.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {pos.positionSide === 'long' ? (
                        <TrendingUpIcon sx={{ color: 'var(--accent-green)', fontSize: 12 }} />
                      ) : (
                        <TrendingDownIcon sx={{ color: 'var(--accent-red)', fontSize: 12 }} />
                      )}
                      <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
                        {pos.positionSide === 'long' ? '多' : '空'} {pos.size}张
                      </Typography>
                    </Box>
                    <Typography className="font-mono" sx={{
                      color: pos.unrealizedPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                      fontSize: 10,
                    }}>
                      {pos.unrealizedPnl >= 0 ? '+' : ''}${pos.unrealizedPnl.toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default StrategyMonitorPanel;
