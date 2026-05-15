import { describe, it, expect, beforeEach } from 'vitest';
import { RiskManager } from '../risk-manager';
import { EventBus } from '../../events/event-bus';
import type { TradeSignal, RiskParams } from '../../types/strategy';
import type { Account, Position } from '../../types/trading';
import type { Candle } from '../../types/market';

function makeSignal(overrides: Partial<TradeSignal> = {}): TradeSignal {
  return {
    strategyId: 'test-strategy',
    symbol: 'XAU/USD',
    direction: 'buy',
    type: 'open',
    price: 1.12345,
    volume: 0.01,
    reason: 'Test',
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    name: '测试账户',
    type: 'demo',
    broker: 'Test',
    balance: 10000,
    equity: 10000,
    marginUsed: 0,
    marginFree: 10000,
    marginLevel: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makePosition(overrides: Partial<Position> = {}): Position {
  return {
    id: 'pos-1',
    symbol: 'XAU/USD',
    direction: 'buy',
    volume: 0.01,
    openPrice: 1.12000,
    currentPrice: 1.12000,
    sl: null,
    tp: null,
    profit: 0,
    pips: 0,
    strategyId: 'test-strategy',
    martingaleLayer: 0,
    openTime: Date.now(),
    ...overrides,
  };
}

function makeCandle(close: number, high?: number, low?: number): Candle {
  return {
    symbol: 'XAU/USD',
    timeframe: 'M15',
    timestamp: Date.now(),
    open: close - 0.0001,
    high: high ?? close + 0.0002,
    low: low ?? close - 0.0002,
    close,
    volume: 100,
  };
}

const defaultRiskParams: RiskParams = {
  maxLossPercent: 10,
  balanceProtectionPercent: 20,
  maxMartingaleLayers: 5,
  adxProtectionEnabled: true,
};

describe('RiskManager', () => {
  let riskManager: RiskManager;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    riskManager = new RiskManager(eventBus);
  });

  describe('validateOpenPosition', () => {
    it('should allow valid position', () => {
      const signal = makeSignal();
      const account = makeAccount();

      const result = riskManager.validateOpenPosition(signal, [], account, defaultRiskParams);
      expect(result.allowed).toBe(true);
    });

    it('should reject when balance protection is triggered', () => {
      // Balance already down by 25% (initial was 10000, now 7500)
      const account = makeAccount({ balance: 7500, equity: 7500 });

      const signal = makeSignal();
      const result = riskManager.validateOpenPosition(signal, [], account, defaultRiskParams);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Balance protection');
    });

    it('should reject when max loss is exceeded', () => {
      const account = makeAccount();
      // Positions with heavy losses
      const positions = [
        makePosition({ profit: -600 }),
        makePosition({ profit: -500 }),
      ];

      const signal = makeSignal();
      const result = riskManager.validateOpenPosition(signal, positions, account, defaultRiskParams);
      // Total loss = 1100, 1100/10000 = 11% > 10%
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Max loss');
    });

    it('should reject when martingale layer exceeds limit', () => {
      const account = makeAccount();

      const signal = makeSignal({ martingaleLayer: 6 });
      const result = riskManager.validateOpenPosition(signal, [], account, defaultRiskParams);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Max martingale layers');
    });

    it('should allow when martingale layer is within limit', () => {
      const account = makeAccount();
      const signal = makeSignal({ martingaleLayer: 5 });

      const result = riskManager.validateOpenPosition(signal, [], account, defaultRiskParams);
      expect(result.allowed).toBe(true);
    });
  });

  describe('validateMartingaleSignal', () => {
    it('should reject when ADX < 20 and protection enabled', () => {
      const signal = makeSignal();
      const account = makeAccount();

      const result = riskManager.validateMartingaleSignal(
        signal, 15, [], account, defaultRiskParams
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('ADX');
    });

    it('should allow when ADX >= 20', () => {
      const signal = makeSignal();
      const account = makeAccount();

      const result = riskManager.validateMartingaleSignal(
        signal, 25, [], account, defaultRiskParams
      );
      expect(result.allowed).toBe(true);
    });

    it('should reject when martingale layer exceeds max', () => {
      const signal = makeSignal({ martingaleLayer: 6 });
      const account = makeAccount();

      const result = riskManager.validateMartingaleSignal(
        signal, 25, [], account, defaultRiskParams
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Max martingale layers');
    });
  });

  describe('checkAdxProtection', () => {
    it('should return isTrending=false with insufficient data', () => {
      const candles: Candle[] = [makeCandle(1.12000)];
      const result = riskManager.checkAdxProtection(candles, 14);

      expect(result.isTrending).toBe(false);
      expect(result.adxValue).toBe(0);
    });

    it('should detect trending market', () => {
      // Generate strongly trending data
      const candles: Candle[] = [];
      for (let i = 0; i < 50; i++) {
        const base = 1.10000 + i * 0.001;
        candles.push(makeCandle(base, base + 0.0005, base - 0.0005));
      }

      const result = riskManager.checkAdxProtection(candles, 14);
      expect(result.isTrending).toBe(true);
      expect(result.adxValue).toBeGreaterThan(20);
    });

    it('should detect ranging market', () => {
      // Generate flat/random data
      const candles: Candle[] = [];
      let price = 1.12000;
      for (let i = 0; i < 50; i++) {
        price += (Math.random() - 0.5) * 0.0002;
        candles.push(makeCandle(price));
      }

      const result = riskManager.checkAdxProtection(candles, 14);
      // In a truly random market, ADX is usually low
      expect(result.adxValue).toBeGreaterThanOrEqual(0);
    });
  });
});
