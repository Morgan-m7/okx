import { create } from 'zustand';
import type { BacktestConfig, BacktestResult, EquityPoint } from '../types/backtest';
import type { TradeRecord } from '../types/trading';

interface BacktestState {
  config: BacktestConfig | null;
  isRunning: boolean;
  progress: number;
  currentStep: number;
  totalSteps: number;
  result: BacktestResult | null;
  results: BacktestResult[];
  equityCurve: EquityPoint[];
  tradeDetails: TradeRecord[];
  error: string | null;

  setConfig: (config: BacktestConfig) => void;
  updateConfig: (updates: Partial<BacktestConfig>) => void;
  setRunning: (running: boolean) => void;
  setProgress: (progress: number, current: number, total: number) => void;
  setResult: (result: BacktestResult) => void;
  setResults: (results: BacktestResult[]) => void;
  setEquityCurve: (curve: EquityPoint[]) => void;
  setTradeDetails: (trades: TradeRecord[]) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useBacktestStore = create<BacktestState>((set) => ({
  config: null,
  isRunning: false,
  progress: 0,
  currentStep: 0,
  totalSteps: 0,
  result: null,
  results: [],
  equityCurve: [],
  tradeDetails: [],
  error: null,

  setConfig: (config) => set({ config }),
  updateConfig: (updates) => set((state) => ({
    config: state.config ? { ...state.config, ...updates } : null,
  })),
  setRunning: (running) => set({ isRunning: running }),
  setProgress: (progress, current, total) => set({
    progress,
    currentStep: current,
    totalSteps: total,
  }),
  setResult: (result) => set({ result, equityCurve: result.equityCurve, tradeDetails: result.tradeDetails }),
  setResults: (results) => set({ results }),
  setEquityCurve: (curve) => set({ equityCurve: curve }),
  setTradeDetails: (trades) => set({ tradeDetails: trades }),
  setError: (error) => set({ error }),
  reset: () => set({
    config: null,
    isRunning: false,
    progress: 0,
    currentStep: 0,
    totalSteps: 0,
    result: null,
    equityCurve: [],
    tradeDetails: [],
    error: null,
  }),
}));
