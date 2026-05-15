import { useCallback, useState } from 'react';
import { useBacktestStore } from '../stores/backtestStore';
import globalEventBus from '../events/event-bus';
import { EventType } from '../types/events';
import { PaperTradingEngine } from '../engine/paper-trading-engine';
import { RiskManager } from '../engine/risk-manager';
import { StrategyManager } from '../engine/strategy-manager';
import { BacktestEngine } from '../engine/backtest-engine';
import { marketDataRepo } from '../db/market-data.repo';
import type { BacktestConfig } from '../types/backtest';

export function useBacktestRunner() {
  const setConfig = useBacktestStore((s) => s.setConfig);
  const setRunning = useBacktestStore((s) => s.setRunning);
  const setProgress = useBacktestStore((s) => s.setProgress);
  const setResult = useBacktestStore((s) => s.setResult);
  const setError = useBacktestStore((s) => s.setError);

  const runBacktest = useCallback(async (config: BacktestConfig) => {
    setConfig(config);
    setRunning(true);
    setError(null);

    try {
      const paperEngine = new PaperTradingEngine(globalEventBus);
      const riskManager = new RiskManager(globalEventBus);
      const strategyManager = new StrategyManager(globalEventBus);

      const backtestEngine = new BacktestEngine(
        globalEventBus,
        paperEngine,
        riskManager,
        strategyManager
      );

      const result = await backtestEngine.run(config);
      setResult(result);
      setRunning(false);
      return result;
    } catch (err: any) {
      setError(err.message || 'Backtest failed');
      setRunning(false);
      return null;
    }
  }, [setConfig, setRunning, setResult, setError]);

  const loadResults = useCallback(async () => {
    // Load from DB
  }, []);

  return { runBacktest, loadResults };
}
