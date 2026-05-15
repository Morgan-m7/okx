import { describe, it, expect } from 'vitest';
import { StatisticsCalculator } from '../statistics-calculator';
import type { TradeRecord } from '../../types/trading';
import type { EquityPoint } from '../../types/backtest';

const calculator = new StatisticsCalculator();

function makeTrade(overrides: Partial<TradeRecord> = {}): TradeRecord {
  return {
    id: 'trade-1',
    symbol: 'XAU/USD',
    direction: 'buy',
    volume: 0.01,
    openPrice: 1.12000,
    closePrice: 1.13000,
    openTime: 1000000,
    closeTime: 2000000,
    profit: 10,
    pips: 100,
    strategyId: 'test',
    closeReason: 'signal',
    martingaleLayer: 0,
    ...overrides,
  };
}

function makeEquityPoint(
  timestamp: number,
  equity: number,
  drawdown: number = 0
): EquityPoint {
  return { timestamp, equity, drawdown };
}

describe('StatisticsCalculator', () => {
  describe('with no trades', () => {
    it('should return zeros for all metrics', () => {
      const equityCurve = [makeEquityPoint(0, 10000)];
      const result = calculator.calculate([], equityCurve, 10000);

      expect(result.totalTrades).toBe(0);
      expect(result.winRate).toBe(0);
      expect(result.totalReturn).toBe(0);
      expect(result.profitFactor).toBe(0);
      expect(result.sharpeRatio).toBe(0);
      expect(result.maxDrawdown).toBe(0);
      expect(result.avgProfit).toBe(0);
      expect(result.avgLoss).toBe(0);
    });

    it('should handle empty equity curve', () => {
      const result = calculator.calculate([], [], 10000);
      expect(result.totalTrades).toBe(0);
    });
  });

  describe('win rate calculation', () => {
    it('should calculate win rate correctly', () => {
      const trades = [
        makeTrade({ profit: 10 }),   // win
        makeTrade({ profit: 20 }),   // win
        makeTrade({ profit: -5 }),   // loss
        makeTrade({ profit: -10 }),  // loss
        makeTrade({ profit: 15 }),   // win
      ];
      const equityCurve = [
        makeEquityPoint(0, 10000),
        makeEquityPoint(1, 10030),
      ];

      const result = calculator.calculate(trades, equityCurve, 10000);
      expect(result.totalTrades).toBe(5);
      expect(result.winningTrades).toBe(3);
      expect(result.losingTrades).toBe(2);
      expect(result.winRate).toBe(60); // 3/5 * 100
    });

    it('should treat zero profit as losing trade', () => {
      const trades = [
        makeTrade({ profit: 0 }),
        makeTrade({ profit: 10 }),
      ];
      const equityCurve = [
        makeEquityPoint(0, 10000),
        makeEquityPoint(1, 10010),
      ];

      const result = calculator.calculate(trades, equityCurve, 10000);
      expect(result.losingTrades).toBe(1);
      expect(result.winningTrades).toBe(1);
    });
  });

  describe('profit factor calculation', () => {
    it('should calculate profit factor correctly', () => {
      const trades = [
        makeTrade({ profit: 100 }),   // win
        makeTrade({ profit: 200 }),   // win
        makeTrade({ profit: -50 }),   // loss
      ];
      const equityCurve = [
        makeEquityPoint(0, 10000),
        makeEquityPoint(1, 10250),
      ];

      const result = calculator.calculate(trades, equityCurve, 10000);
      expect(result.profitFactor).toBe(6); // 300/50
    });

    it('should return Infinity when no losses', () => {
      const trades = [
        makeTrade({ profit: 100 }),
      ];
      const equityCurve = [
        makeEquityPoint(0, 10000),
        makeEquityPoint(1, 10100),
      ];

      const result = calculator.calculate(trades, equityCurve, 10000);
      expect(result.profitFactor).toBe(Infinity);
    });
  });

  describe('total return calculation', () => {
    it('should calculate positive return', () => {
      const equityCurve = [
        makeEquityPoint(0, 10000),
        makeEquityPoint(1, 12000),
      ];

      const result = calculator.calculate([], equityCurve, 10000);
      expect(result.totalReturn).toBe(20); // (12000-10000)/10000 * 100
    });

    it('should calculate negative return', () => {
      const equityCurve = [
        makeEquityPoint(0, 10000),
        makeEquityPoint(1, 8000),
      ];

      const result = calculator.calculate([], equityCurve, 10000);
      expect(result.totalReturn).toBe(-20);
    });
  });

  describe('max drawdown calculation', () => {
    it('should calculate max drawdown correctly', () => {
      const equityCurve = [
        makeEquityPoint(0, 10000),   // peak
        makeEquityPoint(1, 11000),   // new peak
        makeEquityPoint(2, 10500),   // -4.5% from 11000
        makeEquityPoint(3, 10000),   // -9.1% from 11000
        makeEquityPoint(4, 12000),   // new peak
        makeEquityPoint(5, 11500),   // -4.2% from 12000
      ];

      const result = calculator.calculate([], equityCurve, 10000);
      // Max drawdown = (11000 - 10000) / 11000 * 100 = 9.09...%
      expect(result.maxDrawdown).toBeCloseTo(9.09, 0);
    });

    it('should return 0 for continuously rising curve', () => {
      const equityCurve = [
        makeEquityPoint(0, 10000),
        makeEquityPoint(1, 11000),
        makeEquityPoint(2, 12000),
      ];

      const result = calculator.calculate([], equityCurve, 10000);
      expect(result.maxDrawdown).toBe(0);
    });
  });

  describe('sharpe ratio', () => {
    it('should return 0 when no return variance', () => {
      const equityCurve = [
        makeEquityPoint(0, 10000),
        makeEquityPoint(1, 10000),
        makeEquityPoint(2, 10000),
      ];

      const result = calculator.calculate([], equityCurve, 10000);
      expect(result.sharpeRatio).toBe(0);
    });
  });

  describe('avg profit and avg loss', () => {
    it('should calculate average profit and loss correctly', () => {
      const trades = [
        makeTrade({ profit: 100 }),
        makeTrade({ profit: 200 }),
        makeTrade({ profit: -50 }),
        makeTrade({ profit: -30 }),
      ];
      const equityCurve = [
        makeEquityPoint(0, 10000),
        makeEquityPoint(1, 10220),
      ];

      const result = calculator.calculate(trades, equityCurve, 10000);
      expect(result.avgProfit).toBe(150); // (100+200)/2
      expect(result.avgLoss).toBe(40); // (50+30)/2
    });
  });
});
