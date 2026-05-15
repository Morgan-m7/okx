import { create } from 'zustand';
import type { SymbolPair, Timeframe, Candle } from '../types/market';
import type { IndicatorConfig, CrosshairData } from '../types/chart';
import { DEFAULTS } from '../constants/defaults';
import { getDefaultSymbol } from '../constants/symbols';
import { useTradingModeStore } from './tradingModeStore';

interface ChartState {
  symbol: SymbolPair;
  timeframe: Timeframe;
  candles: Candle[];
  visibleRange: { startIndex: number; endIndex: number };
  candleWidth: number;
  offset: number;
  scale: number;
  indicators: IndicatorConfig[];
  crosshair: CrosshairData | null;
  isLoading: boolean;

  setSymbol: (symbol: SymbolPair) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  setCandles: (candles: Candle[]) => void;
  addCandle: (candle: Candle) => void;
  updateLastCandle: (candle: Partial<Candle>) => void;
  setVisibleRange: (range: { startIndex: number; endIndex: number }) => void;
  setCandleWidth: (width: number) => void;
  setOffset: (offset: number) => void;
  setScale: (scale: number) => void;
  toggleIndicator: (type: IndicatorConfig['type'], params?: Record<string, number>) => void;
  setCrosshair: (crosshair: CrosshairData | null) => void;
  setLoading: (loading: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

export const useChartStore = create<ChartState>((set, get) => ({
  symbol: getDefaultSymbol(useTradingModeStore.getState().mode),
  timeframe: 'M15',
  candles: [],
  visibleRange: { startIndex: 0, endIndex: 60 },
  candleWidth: DEFAULTS.defaultCandleWidth,
  offset: 0,
  scale: 1,
  indicators: [],
  crosshair: null,
  isLoading: false,

  setSymbol: (symbol) => set({ symbol, crosshair: null }),
  setTimeframe: (timeframe) => set({ timeframe, crosshair: null }),
  setCandles: (candles) => set({
    candles,
    visibleRange: {
      startIndex: Math.max(0, candles.length - 60),
      endIndex: candles.length,
    },
  }),
  addCandle: (candle) => set((state) => ({
    candles: [...state.candles, candle],
    visibleRange: {
      startIndex: Math.max(0, state.candles.length - 60),
      endIndex: state.candles.length + 1,
    },
  })),
  updateLastCandle: (updates) => set((state) => {
    if (state.candles.length === 0) return state;
    const candles = [...state.candles];
    candles[candles.length - 1] = { ...candles[candles.length - 1], ...updates };
    return { candles };
  }),
  setVisibleRange: (range) => set({ visibleRange: range }),
  setCandleWidth: (width) => set({
    candleWidth: Math.max(DEFAULTS.minCandleWidth, Math.min(DEFAULTS.maxCandleWidth, width)),
  }),
  setOffset: (offset) => set({ offset }),
  setScale: (scale) => set({ scale: Math.max(0.3, Math.min(5, scale)) }),

  toggleIndicator: (type, params) => {
    set((state) => {
      const existing = state.indicators.find(i => i.type === type);
      if (existing) {
        return {
          indicators: state.indicators.map(i =>
            i.type === type ? { ...i, visible: !i.visible } : i
          ),
        };
      }
      const defaultParams: Record<string, IndicatorConfig> = {
        MA: { type: 'MA', params: { period: 10 }, visible: true, pane: 'main' },
        MACD: { type: 'MACD', params: { fast: 12, slow: 26, signal: 9 }, visible: true, pane: 'sub' },
        RSI: { type: 'RSI', params: { period: 14 }, visible: true, pane: 'sub' },
        BOLL: { type: 'BOLL', params: { period: 20, stdDev: 2 }, visible: true, pane: 'main' },
      };
      const config = defaultParams[type];
      if (config) {
        if (params) config.params = { ...config.params, ...params };
        return { indicators: [...state.indicators, config] };
      }
      return state;
    });
  },

  setCrosshair: (crosshair) => set({ crosshair }),
  setLoading: (loading) => set({ isLoading: loading }),

  zoomIn: () => {
    const state = get();
    const newWidth = Math.min(DEFAULTS.maxCandleWidth, state.candleWidth * 1.2);
    set({ candleWidth: newWidth });
  },

  zoomOut: () => {
    const state = get();
    const newWidth = Math.max(DEFAULTS.minCandleWidth, state.candleWidth / 1.2);
    set({ candleWidth: newWidth });
  },

  resetView: () => set((state) => ({
    candleWidth: DEFAULTS.defaultCandleWidth,
    offset: 0,
    scale: 1,
    visibleRange: {
      startIndex: Math.max(0, state.candles.length - 60),
      endIndex: state.candles.length,
    },
    crosshair: null,
  })),
}));
