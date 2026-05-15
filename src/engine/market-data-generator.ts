import type { Quote, Candle, SymbolPair, Timeframe, TradingMode } from '../types/market';
import { getActiveSymbols, getBasePrices, SYMBOL_BASE_PIPS, SYMBOL_DIGITS } from '../constants/symbols';
import { DEFAULTS } from '../constants/defaults';
import { useTradingModeStore } from '../stores/tradingModeStore';
import globalEventBus from '../events/event-bus';
import { EventType } from '../types/events';

export class MarketDataGenerator {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private quotes: Record<string, Quote> = {};
  private candleBuffer: Record<string, Candle> = {};
  private listeners: (() => void)[] = [];
  private currentCandles: Record<string, Candle[]> = {};
  private basePrices: Record<string, number> = {};
  private currentBids: Record<string, number> = {};
  private onQuoteUpdate: ((quotes: Quote[]) => void) | null = null;
  private currentSymbols: SymbolPair[] = [];

  constructor() {
    // 默认使用外汇符号初始化
    this.currentSymbols = getActiveSymbols('forex');
    const prices = getBasePrices('forex');
    Object.assign(this.basePrices, prices);
    this.currentSymbols.forEach(symbol => {
      this.currentBids[symbol] = prices[symbol] ?? 1.0;
    });
  }

  /** 根据交易模式重新初始化 */
  reinitialize(mode: TradingMode): void {
    this.currentSymbols = getActiveSymbols(mode);
    const prices = getBasePrices(mode);
    this.basePrices = {};
    Object.assign(this.basePrices, prices);
    this.currentSymbols.forEach(symbol => {
      this.currentBids[symbol] = prices[symbol] ?? 1.0;
    });
  }

  setOnQuoteUpdate(callback: (quotes: Quote[]) => void): void {
    this.onQuoteUpdate = callback;
  }

  start(intervalMs: number = DEFAULTS.quoteRefreshIntervalMs): void {
    // 根据当前交易模式重新初始化
    const mode = useTradingModeStore.getState().mode;
    this.reinitialize(mode);
    this.generateInitialQuotes();
    this.intervalId = setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private generateInitialQuotes(): void {
    const quotes: Quote[] = [];
    this.currentSymbols.forEach(symbol => {
      const basePrice = this.basePrices[symbol] ?? 1.0;
      const spread = this.calculateSpread(symbol, basePrice);
      this.currentBids[symbol] = basePrice;
      const quote: Quote = {
        symbol,
        bid: basePrice,
        ask: basePrice + spread,
        spread,
        changePips: 0,
        changePercent: 0,
        high24h: basePrice * 1.005,
        low24h: basePrice * 0.995,
        volume24h: Math.random() * 1000000000,
        updatedAt: Date.now(),
        previousBid: basePrice,
      };
      this.quotes[symbol] = quote;
      quotes.push(quote);
    });
    this.onQuoteUpdate?.(quotes);
  }

  private calculateSpread(symbol: SymbolPair, price: number): number {
    if (symbol === 'XAU/USD') return 0.5;
    if (symbol.startsWith('BTC')) return 50;
    if (symbol.startsWith('ETH')) return 5;
    if (symbol.startsWith('SOL')) return 0.5;
    if (symbol.startsWith('XRP') || symbol.startsWith('ADA')) return 0.001;
    if (symbol.startsWith('DOGE') || symbol.startsWith('SHIB')) return 0.0001;
    if (symbol.startsWith('TRX') || symbol.startsWith('XLM')) return 0.0001;
    // 对于其他加密货币，使用 0.02% 的点差
    return price * 0.0002;
  }

  private tick(): void {
    const now = Date.now();
    const quotes: Quote[] = [];

    this.currentSymbols.forEach(symbol => {
      const basePip = SYMBOL_BASE_PIPS[symbol] || 0.01;
      const prevBid = this.currentBids[symbol];
      const walk = (Math.random() - 0.5) * basePip * 2;
      const newBid = prevBid + walk;
      const clampedBid = Math.max(prevBid * 0.99, Math.min(prevBid * 1.01, newBid));

      this.currentBids[symbol] = clampedBid;

      const spread = this.calculateSpread(symbol, clampedBid);
      const change = clampedBid - (this.basePrices[symbol] ?? clampedBid);
      const changePips = basePip > 0 ? change / basePip : 0;
      const changePercent = ((change) / (this.basePrices[symbol] ?? 1)) * 100;

      const prevQuote = this.quotes[symbol];
      const currentHigh = prevQuote?.high24h ?? clampedBid;
      const currentLow = prevQuote?.low24h ?? clampedBid;

      const quote: Quote = {
        symbol,
        bid: clampedBid,
        ask: clampedBid + spread,
        spread,
        changePips: Math.round(changePips * 10) / 10,
        changePercent: Math.round(changePercent * 100) / 100,
        high24h: Math.max(currentHigh, clampedBid),
        low24h: Math.min(currentLow, clampedBid),
        volume24h: prevQuote?.volume24h ?? Math.random() * 1000000000,
        updatedAt: now,
        previousBid: prevBid,
      };

      this.quotes[symbol] = quote;
      quotes.push(quote);

      this.updateCandle(symbol, 'M1', clampedBid, now);
    });

    this.onQuoteUpdate?.(quotes);

    quotes.forEach(q => {
      globalEventBus.emit(EventType.QUOTE_UPDATED, { symbol: q.symbol, quote: q });
    });
  }

  private updateCandle(symbol: SymbolPair, timeframe: Timeframe, price: number, timestamp: number): void {
    const key = `${symbol}-${timeframe}`;
    const minuteMs = 60 * 1000;
    const candleTimestamp = Math.floor(timestamp / minuteMs) * minuteMs;

    if (!this.candleBuffer[key] || this.candleBuffer[key].timestamp !== candleTimestamp) {
      if (this.candleBuffer[key]) {
        const closedCandle = this.candleBuffer[key];
        globalEventBus.emit(EventType.CANDLE_CLOSED, {
          symbol,
          timeframe,
          candle: closedCandle,
        });
        globalEventBus.emit(EventType.CANDLE_UPDATE, {
          symbol,
          timeframe,
          candle: closedCandle,
        });
      }

      this.candleBuffer[key] = {
        symbol,
        timeframe,
        timestamp: candleTimestamp,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 1,
      };
    } else {
      const candle = this.candleBuffer[key];
      candle.high = Math.max(candle.high, price);
      candle.low = Math.min(candle.low, price);
      candle.close = price;
      candle.volume += 1;
    }
  }

  getCurrentQuote(symbol: SymbolPair): Quote | undefined {
    return this.quotes[symbol];
  }

  getAllQuotes(): Quote[] {
    return Object.values(this.quotes);
  }

  generateHistoricalCandles(
    symbol: SymbolPair,
    timeframe: Timeframe,
    count: number
  ): Candle[] {
    const candles: Candle[] = [];
    const basePrice = this.basePrices[symbol] ?? 100;
    const minuteMs = 60 * 1000;
    const timeframeMinutes = timeframe === 'M1' ? 1 : timeframe === 'M5' ? 5 : timeframe === 'M15' ? 15 : timeframe === 'M30' ? 30 : timeframe === 'H1' ? 60 : timeframe === 'H4' ? 240 : timeframe === 'D1' ? 1440 : 10080;
    const intervalMs = timeframeMinutes * minuteMs;
    const now = Date.now();
    let price = basePrice * (1 + (Math.random() - 0.5) * 0.1);

    for (let i = count - 1; i >= 0; i--) {
      const timestamp = now - i * intervalMs;
      const open = price;
      const pip = SYMBOL_BASE_PIPS[symbol] ?? 0.01;
      const change = (Math.random() - 0.5) * pip * 10;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * Math.abs(change) * 0.5;
      const low = Math.min(open, close) - Math.random() * Math.abs(change) * 0.5;
      const volume = Math.floor(Math.random() * 1000) + 100;

      candles.push({
        symbol,
        timeframe,
        timestamp,
        open,
        high,
        low,
        close,
        volume,
      });
      price = close;
    }

    return candles;
  }

  destroy(): void {
    this.stop();
    this.listeners.forEach(unsub => unsub());
    this.listeners = [];
  }
}

export const marketDataGenerator = new MarketDataGenerator();
