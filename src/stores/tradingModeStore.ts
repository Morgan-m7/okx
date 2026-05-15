import { create } from 'zustand';
import type { TradingMode } from '../types/market';

interface TradingModeState {
  mode: TradingMode;
  /** 设置交易模式 */
  setMode: (mode: TradingMode) => void;
  /** 切换交易模式（自动处理持仓清除等） */
  switchMode: (newMode: TradingMode) => void;
  /** 是否处于加密货币模式 */
  isCrypto: () => boolean;
  /** 是否处于外汇模式 */
  isForex: () => boolean;
}

export const useTradingModeStore = create<TradingModeState>((set, get) => ({
  mode: 'forex',

  setMode: (mode) => set({ mode }),

  switchMode: (newMode) => {
    const current = get().mode;
    if (current === newMode) return;
    set({ mode: newMode });
  },

  isCrypto: () => get().mode === 'crypto',
  isForex: () => get().mode === 'forex',
}));
