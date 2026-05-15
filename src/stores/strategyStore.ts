import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StrategyConfig, StrategyFamily, TradeSignal } from '../types/strategy';

interface StrategyState {
  strategies: StrategyConfig[];
  activeStrategyIds: string[];
  signals: TradeSignal[];
  isLoading: boolean;
  error: string | null;

  setStrategies: (strategies: StrategyConfig[]) => void;
  addStrategy: (strategy: StrategyConfig) => void;
  updateStrategy: (id: string, updates: Partial<StrategyConfig>) => void;
  removeStrategy: (id: string) => void;
  toggleActive: (id: string) => void;
  setActiveStrategyIds: (ids: string[]) => void;
  addSignal: (signal: TradeSignal) => void;
  clearSignals: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  getStrategiesByFamily: (family: StrategyFamily) => StrategyConfig[];
}

export const useStrategyStore = create<StrategyState>()(
  persist(
    (set, get) => ({
  strategies: [],
  activeStrategyIds: [],
  signals: [],
  isLoading: false,
  error: null,

  setStrategies: (strategies) => set({
    strategies,
    activeStrategyIds: strategies.filter(s => s.isActive).map(s => s.id),
  }),

  addStrategy: (strategy) => set((state) => ({
    strategies: [...state.strategies, strategy],
    activeStrategyIds: strategy.isActive
      ? [...state.activeStrategyIds, strategy.id]
      : state.activeStrategyIds,
  })),

  updateStrategy: (id, updates) => set((state) => ({
    strategies: state.strategies.map(s =>
      s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
    ),
  })),

  removeStrategy: (id) => set((state) => ({
    strategies: state.strategies.filter(s => s.id !== id),
    activeStrategyIds: state.activeStrategyIds.filter(sid => sid !== id),
  })),

  toggleActive: (id) => set((state) => {
    const strategy = state.strategies.find(s => s.id === id);
    if (!strategy) return state;
    const newActive = !strategy.isActive;
    return {
      strategies: state.strategies.map(s =>
        s.id === id ? { ...s, isActive: newActive, updatedAt: Date.now() } : s
      ),
      activeStrategyIds: newActive
        ? [...state.activeStrategyIds, id]
        : state.activeStrategyIds.filter(sid => sid !== id),
    };
  }),

  setActiveStrategyIds: (ids) => set({ activeStrategyIds: ids }),

  addSignal: (signal) => set((state) => ({
    signals: [signal, ...state.signals].slice(0, 100),
  })),

  clearSignals: () => set({ signals: [] }),

  setError: (error) => set({ error }),
  setLoading: (loading) => set({ isLoading: loading }),

  getStrategiesByFamily: (family) => {
    return get().strategies.filter(s => s.family === family);
  },
    }),
    {
      name: 'forex-ea-strategies',
    }
  )
);
