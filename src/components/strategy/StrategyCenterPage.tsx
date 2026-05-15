import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import PageContainer from '../layout/PageContainer';
import StrategyFamilyPanel from './StrategyFamilyPanel';
import StrategyConfigModal from './StrategyConfigModal';
import { useStrategyStore } from '../../stores/strategyStore';
import { strategyRepo } from '../../db/strategy.repo';
import { v4 as uuidv4 } from 'uuid';
import { useAutoTrader } from '../../hooks/useAutoTrader';
import type { StrategyConfig, StrategyFamily, StrategyId } from '../../types/strategy';
import type { SymbolPair } from '../../types/market';

const STRATEGY_DEFINITIONS: Array<{
  id: StrategyId;
  family: StrategyFamily;
  name: string;
  defaultParams: Record<string, any>;
}> = [
  // 📈 趋势跟踪
  { id: 'ma-cross', family: 'trend-following', name: '双均线交叉', defaultParams: { fastPeriod: 10, slowPeriod: 30 } },
  { id: 'macd', family: 'trend-following', name: 'MACD金叉死叉', defaultParams: { fast: 12, slow: 26, signal: 9 } },
  { id: 'turtle', family: 'trend-following', name: '海龟交易法则', defaultParams: { period: 20, atrMultiplier: 2 } },
  // 🔄 网格/马丁格尔
  { id: 'classic-martingale', family: 'martingale', name: '经典马丁格尔', defaultParams: { baseVolume: 0.01, multiplier: 2, maxLayers: 5, takeProfitPips: 50 } },
  { id: 'grid', family: 'martingale', name: '网格交易', defaultParams: { gridCount: 10, rangePercent: 2, volumePerGrid: 0.01 } },
  // 📉 均值回归
  { id: 'rsi', family: 'mean-reversion', name: 'RSI超买超卖', defaultParams: { period: 14, overbought: 70, oversold: 30 } },
  { id: 'bollinger-reversal', family: 'mean-reversion', name: '布林带反转', defaultParams: { period: 20, stdDev: 2, confirmationCandles: 2 } },
];

const FAMILY_CONFIG: Record<StrategyFamily, { label: string; icon: string }> = {
  'trend-following': { label: '趋势跟踪', icon: '📈' },
  'martingale': { label: '网格/马丁格尔', icon: '⚙️' },
  'mean-reversion': { label: '均值回归', icon: '🔄' },
};

const StrategyCenterPage: React.FC = () => {
  const strategies = useStrategyStore((s) => s.strategies);
  const setStrategies = useStrategyStore((s) => s.setStrategies);
  const toggleActive = useStrategyStore((s) => s.toggleActive);
  const [configModal, setConfigModal] = useState<{ open: boolean; strategy: StrategyConfig | null }>({
    open: false,
    strategy: null,
  });

  useEffect(() => {
    let cancelled = false;
    const initStrategies = async () => {
      const existing = await strategyRepo.getAll();
      if (cancelled) return;
      
      const currentIds = STRATEGY_DEFINITIONS.map(d => d.id);

      // 清理不再使用的旧策略 + 重复策略
      const seenIds = new Set<string>();
      const toRemove = existing.filter(s => {
        // 删除不在当前定义中的策略
        if (!currentIds.includes(s.strategyId)) return true;
        // 删除重复的策略（保留第一个）
        if (seenIds.has(s.strategyId)) return true;
        seenIds.add(s.strategyId);
        return false;
      });
      for (const s of toRemove) {
        await strategyRepo.delete(s.id);
      }

      // 检查是否有新增的策略定义尚未创建
      const existingIds = [...seenIds];
      const toAdd = STRATEGY_DEFINITIONS.filter(d => !existingIds.includes(d.id));

      const allStrategies: StrategyConfig[] = [];

      // 已有的有效策略（去重，保留每个 strategyId 的第一条）
      const validExisting: StrategyConfig[] = [];
      const addedIds = new Set<string>();
      for (const s of existing) {
        if (!currentIds.includes(s.strategyId)) continue;
        if (addedIds.has(s.strategyId)) continue;
        addedIds.add(s.strategyId);
        validExisting.push(s);
      }
      allStrategies.push(...validExisting);

      // 新增策略
      for (const def of toAdd) {
        const newStrategy: StrategyConfig = {
          id: uuidv4(),
          strategyId: def.id,
          family: def.family,
          name: def.name,
          params: { ...def.defaultParams },
          isActive: false,
          symbols: ['BTC/USDT'] as SymbolPair[],
          riskParams: {
            maxLossPercent: 10,
            balanceProtectionPercent: 20,
            maxMartingaleLayers: 5,
            adxProtectionEnabled: def.family === 'martingale',
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await strategyRepo.create(newStrategy);
        allStrategies.push(newStrategy);
      }

      if (!cancelled) {
        setStrategies(allStrategies);
      }
    };
    initStrategies();
    return () => { cancelled = true; };
  }, []);

  // 启动自动交易引擎
  useAutoTrader();

  const handleConfigure = (strategy: StrategyConfig) => {
    setConfigModal({ open: true, strategy });
  };

  const handleToggle = async (id: string) => {
    toggleActive(id);
    const s = strategies.find((st) => st.id === id);
    if (s) {
      await strategyRepo.update(id, { isActive: !s.isActive });
    }
  };

  return (
    <PageContainer>
      <Box sx={{ px: 1, py: 1.5 }}>
        <Typography variant="h6" sx={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 20 }}>
          策略中心
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
            {strategies.filter((s) => s.isActive).length}/{strategies.length} 策略运行中
          </Typography>
          {strategies.some(s => s.isActive) && (
            <Typography variant="caption" sx={{ color: 'var(--accent-green)', fontWeight: 600, fontSize: 10 }}>
              ● 自动交易中
            </Typography>
          )}
        </Box>
      </Box>

      {(Object.keys(FAMILY_CONFIG) as StrategyFamily[]).map((family) => {
        const familyStrategies = strategies.filter((s) => s.family === family);
        const config = FAMILY_CONFIG[family];
        const hasADXWarning = family === 'martingale';

        return (
          <StrategyFamilyPanel
            key={family}
            family={family}
            label={config.label}
            icon={config.icon}
            strategies={familyStrategies}
            onConfigure={handleConfigure}
            onToggle={handleToggle}
            defaultExpanded={family === 'trend-following' || family === 'martingale'}
            warning={hasADXWarning ? 'ADX保护' : undefined}
          />
        );
      })}

      <StrategyConfigModal
        open={configModal.open}
        strategy={configModal.strategy}
        onClose={() => setConfigModal({ open: false, strategy: null })}
      />
    </PageContainer>
  );
};

export default StrategyCenterPage;
