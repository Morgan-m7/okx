import { describe, it, expect, beforeEach } from 'vitest';
import { PaperTradingEngine } from '../paper-trading-engine';
import { EventBus } from '../../events/event-bus';
import type { TradeSignal, SymbolPair } from '../../types';
import type { Candle } from '../../types/market';

function makeSignal(overrides: Partial<TradeSignal> = {}): TradeSignal {
  return {
    strategyId: 'test-strategy',
    symbol: 'XAU/USD',
    direction: 'buy',
    type: 'open',
    price: 1.12345,
    volume: 0.01,
    reason: 'Test signal',
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeCandle(
  close: number,
  high?: number,
  low?: number,
  symbol: string = 'XAU/USD'
): Candle {
  return {
    symbol: symbol as any,
    timeframe: 'M15',
    timestamp: Date.now(),
    open: close - 0.0001,
    high: high ?? close + 0.0002,
    low: low ?? close - 0.0002,
    close,
    volume: 100,
  };
}

describe('PaperTradingEngine', () => {
  let engine: PaperTradingEngine;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    engine = new PaperTradingEngine(eventBus);
  });

  describe('initial state', () => {
    it('should start with $10,000 balance', () => {
      const account = engine.getAccount();
      expect(account.balance).toBe(10000);
      expect(account.equity).toBe(10000);
      expect(account.marginUsed).toBe(0);
      expect(account.marginFree).toBe(10000);
    });

    it('should have no positions initially', () => {
      expect(engine.getPositions()).toEqual([]);
    });

    it('should have no trade history initially', () => {
      expect(engine.getTradeHistory()).toEqual([]);
    });
  });

  describe('openPosition', () => {
    it('should open a buy position', () => {
      const signal = makeSignal();
      const position = engine.openPosition(signal);

      expect(position.symbol).toBe('XAU/USD');
      expect(position.direction).toBe('buy');
      expect(position.volume).toBe(0.01);
      expect(position.openPrice).toBe(1.12345);
      expect(position.currentPrice).toBe(1.12345);
      expect(position.profit).toBe(0);
      expect(position.pips).toBe(0);
    });

    it('should open a sell position', () => {
      const signal = makeSignal({ direction: 'sell', price: 1.12000 });
      const position = engine.openPosition(signal);

      expect(position.direction).toBe('sell');
    });

    it('should reduce margin free after opening', () => {
      const signal = makeSignal({ volume: 0.1, price: 1.12345 });
      engine.openPosition(signal);

      const account = engine.getAccount();
      expect(account.marginUsed).toBeGreaterThan(0);
      expect(account.marginFree).toBeLessThan(10000);
    });

    it('should throw when insufficient margin', () => {
      const signal = makeSignal({ volume: 1000, price: 1.12345 });
      expect(() => engine.openPosition(signal)).toThrow('INSUFFICIENT_MARGIN');
    });

    it('should track multiple positions', () => {
      engine.openPosition(makeSignal({ symbol: 'XAU/USD', volume: 0.01 }));
      engine.openPosition(makeSignal({ symbol: 'XAU/USD', volume: 0.02 }));

      expect(engine.getPositions().length).toBe(2);
    });
  });

  describe('closePosition', () => {
    it('should close a position and record trade', () => {
      const pos = engine.openPosition(makeSignal());
      expect(engine.getPositions().length).toBe(1);

      const trade = engine.closePosition(pos.id, 1.12500, 'manual');
      expect(trade).not.toBeNull();
      expect(engine.getPositions().length).toBe(0);
      expect(engine.getTradeHistory().length).toBe(1);

      if (trade) {
        expect(trade.closeReason).toBe('manual');
        expect(trade.closePrice).toBe(1.12500);
      }
    });

    it('should return null for non-existent position', () => {
      const trade = engine.closePosition('non-existent', 1.12000, 'manual');
      expect(trade).toBeNull();
    });

    it('should update account balance after close', () => {
      const pos = engine.openPosition(makeSignal({ price: 1.12000 }));
      engine.closePosition(pos.id, 1.13000, 'manual');

      const account = engine.getAccount();
      expect(account.balance).toBeGreaterThan(10000);
    });
  });

  describe('checkSLTP', () => {
    it('should trigger SL for buy position when low <= sl', () => {
      const signal = makeSignal({ price: 1.12000, sl: 1.11800 });
      const pos = engine.openPosition(signal);

      const candle = makeCandle(1.11900, 1.11950, 1.11750);
      engine.checkSLTP(candle);

      expect(engine.getPositions().length).toBe(0);
    });

    it('should trigger TP for buy position when high >= tp', () => {
      const signal = makeSignal({ price: 1.12000, tp: 1.12500 });
      const pos = engine.openPosition(signal);

      const candle = makeCandle(1.12600, 1.12700, 1.12400);
      engine.checkSLTP(candle);

      expect(engine.getPositions().length).toBe(0);
    });

    it('should trigger SL for sell position when high >= sl', () => {
      const signal = makeSignal({
        direction: 'sell',
        price: 1.12000,
        sl: 1.12500,
      });
      const pos = engine.openPosition(signal);

      const candle = makeCandle(1.12400, 1.12600, 1.12300);
      engine.checkSLTP(candle);

      expect(engine.getPositions().length).toBe(0);
    });

    it('should trigger TP for sell position when low <= tp', () => {
      const signal = makeSignal({
        direction: 'sell',
        price: 1.12000,
        tp: 1.11500,
      });
      const pos = engine.openPosition(signal);

      const candle = makeCandle(1.11600, 1.11700, 1.11400);
      engine.checkSLTP(candle);

      expect(engine.getPositions().length).toBe(0);
    });

    it('should not trigger SL/TP for positions on different symbols', () => {
      const signal = makeSignal({
        symbol: 'XAU/USD',
        price: 1.12000,
        sl: 1.11800,
      });
      engine.openPosition(signal);

      const candle = makeCandle(1.10000, 1.10100, 1.09900, 'BTC/USDT');
      engine.checkSLTP(candle);

      expect(engine.getPositions().length).toBe(1);
    });
  });

  describe('updatePrices', () => {
    it('should update position price and profit', () => {
      const pos = engine.openPosition(makeSignal({ price: 1.12000 }));

      const candle = makeCandle(1.12500);
      engine.updatePrices(candle);

      const updatedPos = engine.getPosition(pos.id);
      expect(updatedPos).not.toBeNull();
      if (updatedPos) {
        expect(updatedPos.currentPrice).toBe(1.12500);
        expect(updatedPos.profit).toBeGreaterThan(0);
      }
    });

    it('should update account equity', () => {
      engine.openPosition(makeSignal({ price: 1.12000, volume: 0.1 }));

      const candle = makeCandle(1.13000);
      engine.updatePrices(candle);

      const account = engine.getAccount();
      expect(account.equity).toBeGreaterThan(10000);
    });
  });

  describe('updatePositionSLTP', () => {
    it('should update SL and TP for a position', () => {
      const pos = engine.openPosition(makeSignal());

      engine.updatePositionSLTP(pos.id, 1.12000, 1.13000);

      const updated = engine.getPosition(pos.id);
      expect(updated?.sl).toBe(1.12000);
      expect(updated?.tp).toBe(1.13000);
    });

    it('should do nothing for non-existent position', () => {
      expect(() => engine.updatePositionSLTP('nope', 1.1, 1.2)).not.toThrow();
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      engine.openPosition(makeSignal());
      engine.reset();

      expect(engine.getPositions().length).toBe(0);
      expect(engine.getTradeHistory().length).toBe(0);
      expect(engine.getAccount().balance).toBe(10000);
    });

    it('should reset with custom balance', () => {
      engine.reset(5000);
      expect(engine.getAccount().balance).toBe(5000);
    });
  });
});
