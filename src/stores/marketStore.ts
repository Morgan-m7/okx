import { create } from 'zustand';
import type { Quote, SymbolPair, TradingMode } from '../types/market';
import { getActiveSymbols, getBasePrices, SYMBOL_DIGITS } from '../constants/symbols';

interface MarketState {
  quotes: Record<SymbolPair, Quote>;
  favorites: SymbolPair[];
  activeSymbols: SymbolPair[];
  isLoading: boolean;
  error: string | null;

  updateQuote: (symbol: SymbolPair, quote: Quote) => void;
  updateQuotes: (quotes: Quote[]) => void;
  toggleFavorite: (symbol: SymbolPair) => void;
  setFavorites: (favorites: SymbolPair[]) => void;
  setError: (error: string | null) => void;
  initializeQuotes: () => void;
  initializeSymbols: (mode: TradingMode) => void;
}

function createInitialQuote(symbol: SymbolPair, mode: TradingMode): Quote {
  const basePrices = getBasePrices(mode);
  const price = basePrices[symbol] ?? 1.0;
  const digits = SYMBOL_DIGITS[symbol] ?? 2;
  const spread = price * 0.0002; // 0.02% spread

  return {
    symbol,
    bid: price,
    ask: price + spread,
    spread,
    changePips: 0,
    changePercent: 0,
    high24h: price * 1.005,
    low24h: price * 0.995,
    volume24h: mode === 'crypto' ? Math.random() * 1000000000 : undefined,
    updatedAt: Date.now(),
    previousBid: price,
  };
}

export const useMarketStore = create<MarketState>((set) => ({
  quotes: {} as Record<SymbolPair, Quote>,
  favorites: [],
  activeSymbols: [],
  isLoading: false,
  error: null,

  initializeSymbols: (mode: TradingMode) => {
    const symbols = getActiveSymbols(mode);
    const quotes = {} as Record<SymbolPair, Quote>;
    symbols.forEach(symbol => {
      quotes[symbol] = createInitialQuote(symbol, mode);
    });
    set({
      activeSymbols: symbols,
      quotes,
      favorites: mode === 'crypto' ? ['BTC/USDT', 'ETH/USDT'] : [],
    });
  },

  initializeQuotes: () => {
    // 兼容旧代码，默认创建外汇初始报价
    const symbols = getActiveSymbols('forex');
    const quotes = {} as Record<SymbolPair, Quote>;
    symbols.forEach(symbol => {
      quotes[symbol] = createInitialQuote(symbol, 'forex');
    });
    set({ activeSymbols: symbols, quotes });
  },

  updateQuote: (symbol, quote) => {
    set((state) => ({
      quotes: {
        ...state.quotes,
        [symbol]: {
          ...quote,
          previousBid: state.quotes[symbol]?.bid ?? quote.bid,
        },
      },
    }));
  },

  updateQuotes: (quotes) => {
    set((state) => {
      const updated = { ...state.quotes };
      quotes.forEach(quote => {
        updated[quote.symbol] = {
          ...quote,
          previousBid: state.quotes[quote.symbol]?.bid ?? quote.bid,
        };
      });
      return { quotes: updated };
    });
  },

  toggleFavorite: (symbol) => {
    set((state) => {
      const exists = state.favorites.includes(symbol);
      return {
        favorites: exists
          ? state.favorites.filter(s => s !== symbol)
          : [...state.favorites, symbol],
      };
    });
  },

  setFavorites: (favorites) => set({ favorites }),

  setError: (error) => set({ error }),
}));
