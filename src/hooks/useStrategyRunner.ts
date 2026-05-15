import { useCallback } from 'react';
import { useStrategyStore } from '../stores/strategyStore';
import { useTradingModeStore } from '../stores/tradingModeStore';
import { strategyRepo } from '../db/strategy.repo';
import { getDefaultSymbol } from '../constants/symbols';
import { v4 as uuidv4 } from 'uuid';
import type { StrategyConfig, StrategyFamily, StrategyId } from '../types/strategy';
import type { Timeframe } from '../types/market';

export function useStrategyRunner() {
  const strategies = useStrategyStore((s) => s.strategies);
  const addStrategy = useStrategyStore((s) => s.addStrategy);
  const updateStrategy = useStrategyStore((s) => s.updateStrategy);
  const removeStrategy = useStrategyStore((s) => s.removeStrategy);

  const createStrategy = useCallback(async (
    strategyId: StrategyId,
    family: StrategyFamily,
    name: string,
    params: Record<string, any>,
    timeframe?: Timeframe
  ) => {
    const mode = useTradingModeStore.getState().mode;
    const defaultSym = getDefaultSymbol(mode);
    const config: StrategyConfig = {
      id: uuidv4(),
      strategyId,
      family,
      name,
      params,
      isActive: false,
      symbols: [defaultSym],
      timeframe: timeframe || 'M15',
      riskParams: {
        maxLossPercent: 10,
        balanceProtectionPercent: 20,
        maxMartingaleLayers: 5,
        adxProtectionEnabled: family === 'martingale',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await strategyRepo.create(config);
    addStrategy(config);
    return config;
  }, [addStrategy]);

  const toggleActive = useCallback(async (id: string) => {
    const strategy = strategies.find(s => s.id === id);
    if (strategy) {
      const newActive = !strategy.isActive;
      await strategyRepo.update(id, { isActive: newActive });
      updateStrategy(id, { isActive: newActive });
    }
  }, [strategies, updateStrategy]);

  const deleteStrategy = useCallback(async (id: string) => {
    await strategyRepo.delete(id);
    removeStrategy(id);
  }, [removeStrategy]);

  return { createStrategy, toggleActive, deleteStrategy };
}
