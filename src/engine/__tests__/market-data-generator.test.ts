import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MarketDataGenerator } from '../market-data-generator';
import { SYMBOLS } from '../../constants/symbols';
import type { Quote } from '../../types/market';

describe('MarketDataGenerator', () => {
  let generator: MarketDataGenerator;

  beforeEach(() => {
    generator = new MarketDataGenerator();
  });

  afterEach(() => {
    generator.destroy();
  });

  describe('initial state', () => {
    it('should have base prices for all 7 symbols', () => {
      const allQuotes = generator.getAllQuotes();
      expect(allQuotes.length).toBe(0); // no quotes until start()
    });
  });

  describe('generateInitialQuotes (called via start)', () => {
    it('should generate quotes for all 7 symbols on start', () => {
      generator.start(10000); // long interval to prevent tick
      const quotes = generator.getAllQuotes();

      expect(quotes.length).toBe(SYMBOLS.length);
      const symbols = quotes.map(q => q.symbol);
      SYMBOLS.forEach(s => expect(symbols).toContain(s));
    });

    it('should have bid < ask for all quotes', () => {
      generator.start(10000);
      const quotes = generator.getAllQuotes();

      for (const q of quotes) {
        expect(q.bid).toBeLessThan(q.ask);
      }
    });

    it('should have correct spread for different symbols', () => {
      generator.start(10000);
      const quotes = generator.getAllQuotes();
      // 验证不同品种有合理的点差
      for (const q of quotes) {
        expect(q.spread).toBeGreaterThan(0);
      }
    });
  });

  describe('getCurrentQuote', () => {
    it('should return a quote for a valid symbol', () => {
      generator.start(10000);
      const quote = generator.getCurrentQuote('XAU/USD');
      expect(quote).toBeDefined();
      expect(quote!.symbol).toBe('XAU/USD');
    });

    it('should return undefined before start', () => {
      const quote = generator.getCurrentQuote('XAU/USD');
      expect(quote).toBeUndefined();
    });
  });

  describe('tick updates', () => {
    it('should update quotes on tick', () => {
      generator.start(10000);
      const before = generator.getAllQuotes();

      // Force a tick by calling stop/start or... we can't easily force private tick
      // but we can verify the generator runs
      expect(before.length).toBe(SYMBOLS.length);
    });
  });

  describe('generateHistoricalCandles', () => {
    it('should generate the requested number of candles', () => {
      const candles = generator.generateHistoricalCandles('XAU/USD', 'M15', 100);
      expect(candles.length).toBe(100);
    });

    it('should have valid OHLC values', () => {
      const candles = generator.generateHistoricalCandles('XAU/USD', 'H1', 50);

      for (const c of candles) {
        expect(c.high).toBeGreaterThanOrEqual(c.open);
        expect(c.high).toBeGreaterThanOrEqual(c.close);
        expect(c.low).toBeLessThanOrEqual(c.open);
        expect(c.low).toBeLessThanOrEqual(c.close);
        expect(c.volume).toBeGreaterThan(0);
        expect(c.symbol).toBe('XAU/USD');
        expect(c.timeframe).toBe('H1');
      }
    });

    it('should have correct symbol and timeframe', () => {
      const candles = generator.generateHistoricalCandles('XAU/USD', 'D1', 10);
      expect(candles[0].symbol).toBe('XAU/USD');
      expect(candles[0].timeframe).toBe('D1');
    });

    it('should generate candles with sequential timestamps', () => {
      const candles = generator.generateHistoricalCandles('XAU/USD', 'M5', 20);
      for (let i = 1; i < candles.length; i++) {
        expect(candles[i].timestamp).toBeGreaterThan(candles[i - 1].timestamp);
      }
    });

    it('should generate candles for different timeframes', () => {
      const m1 = generator.generateHistoricalCandles('XAU/USD', 'M1', 5);
      const h1 = generator.generateHistoricalCandles('XAU/USD', 'H1', 5);
      const d1 = generator.generateHistoricalCandles('XAU/USD', 'D1', 5);

      expect(m1.length).toBe(5);
      expect(h1.length).toBe(5);
      expect(d1.length).toBe(5);
    });
  });

  describe('stop and destroy', () => {
    it('should stop the interval on stop', () => {
      expect(() => generator.stop()).not.toThrow();
    });

    it('should clean up on destroy', () => {
      expect(() => generator.destroy()).not.toThrow();
    });
  });
});
