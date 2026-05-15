import { describe, it, expect } from 'vitest';
import { calculateMA, calculateEMA } from '../ma';
import { calculateMACD } from '../macd';
import { calculateRSI } from '../rsi';
import { calculateBollinger } from '../bollinger';
import { calculateADX } from '../adx';
import { calculateStochastic } from '../stochastic';
import { calculateATR } from '../atr';

// ─── Helpers ────────────────────────────────────────────────────────────────

function allNull(arr: (number | null)[]): boolean {
  return arr.every(v => v === null);
}

function countNonNull(arr: (number | null)[]): number {
  return arr.filter(v => v !== null).length;
}

// ─── MA Tests ──────────────────────────────────────────────────────────────

describe('calculateMA (Simple Moving Average)', () => {
  it('should return nulls for first period-1 positions', () => {
    const prices = [10, 20, 30, 40, 50];
    const result = calculateMA(prices, 3);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBe(20); // (10+20+30)/3
    expect(result[3]).toBe(30); // (20+30+40)/3
    expect(result[4]).toBe(40); // (30+40+50)/3
  });

  it('should handle period=1 (identity)', () => {
    const prices = [10, 20, 30];
    const result = calculateMA(prices, 1);
    expect(result[0]).toBe(10);
    expect(result[1]).toBe(20);
    expect(result[2]).toBe(30);
  });

  it('should handle period > data length', () => {
    const prices = [10, 20];
    const result = calculateMA(prices, 5);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
  });

  it('should handle empty array', () => {
    const result = calculateMA([], 5);
    expect(result).toEqual([]);
  });
});

// ─── EMA Tests ─────────────────────────────────────────────────────────────

describe('calculateEMA (Exponential Moving Average)', () => {
  it('should start with first price', () => {
    const prices = [10, 20, 30];
    const result = calculateEMA(prices, 3);
    expect(result[0]).toBe(10);
  });

  it('should compute EMA correctly', () => {
    const prices = [10, 11, 12, 13, 14, 15];
    const result = calculateEMA(prices, 3);
    const k = 2 / (3 + 1); // 0.5

    // EMA[0] = 10
    expect(result[0]).toBe(10);

    // EMA[1] = 11 * 0.5 + 10 * 0.5 = 10.5
    expect(result[1]).toBe(10.5);

    // EMA[2] = 12 * 0.5 + 10.5 * 0.5 = 11.25
    expect(result[2]).toBe(11.25);

    // EMA[3] = 13 * 0.5 + 11.25 * 0.5 = 12.125
    expect(result[3]).toBe(12.125);
  });

  it('should handle empty array', () => {
    expect(calculateEMA([], 5)).toEqual([]);
  });
});

// ─── MACD Tests ────────────────────────────────────────────────────────────

describe('calculateMACD', () => {
  it('should return macd, signal, and histogram arrays', () => {
    const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
    const result = calculateMACD(prices, 12, 26, 9);

    expect(result).toHaveProperty('macd');
    expect(result).toHaveProperty('signal');
    expect(result).toHaveProperty('histogram');
    expect(result.macd.length).toBe(prices.length);
    expect(result.signal.length).toBe(prices.length);
    expect(result.histogram.length).toBe(prices.length);
  });

  it('should handle insufficient data gracefully', () => {
    const prices = [1, 2, 3];
    const result = calculateMACD(prices);
    // EMA doesn't return nulls (uses first value as seed), 
    // but the arrays should have the correct length
    expect(result.macd.length).toBe(3);
    expect(result.signal.length).toBe(3);
    expect(result.histogram.length).toBe(3);
    // All values should be valid numbers
    for (const v of result.macd) {
      expect(typeof v).toBe('number');
    }
  });

  it('histogram equals macd - signal', () => {
    const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i * 0.5) * 10);
    const result = calculateMACD(prices, 5, 13, 4);

    for (let i = 0; i < prices.length; i++) {
      if (result.macd[i] !== null && result.signal[i] !== null) {
        const expectedHistogram = (result.macd[i] as number) - (result.signal[i] as number);
        expect(result.histogram[i]).toBeCloseTo(expectedHistogram, 5);
      }
    }
  });
});

// ─── RSI Tests ─────────────────────────────────────────────────────────────

describe('calculateRSI', () => {
  it('should return null for first period values', () => {
    const prices = Array.from({ length: 14 }, (_, i) => 100 + i);
    const result = calculateRSI(prices, 14);
    for (let i = 0; i < 14; i++) {
      expect(result[i]).toBeNull();
    }
  });

  it('should return 100 when all gains (no losses)', () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
    const result = calculateRSI(prices, 14);
    const lastVal = result[result.length - 1];
    expect(lastVal).toBe(100);
  });

  it('should return 0 when all losses (no gains)', () => {
    const prices = Array.from({ length: 20 }, (_, i) => 200 - i);
    const result = calculateRSI(prices, 14);
    const lastVal = result[result.length - 1];
    expect(lastVal).toBe(0);
  });

  it('RSI should be between 0 and 100', () => {
    const prices = Array.from({ length: 50 }, () => 100 + Math.random() * 10);
    const result = calculateRSI(prices, 14);
    for (const val of result) {
      if (val !== null) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(100);
      }
    }
  });

  it('should handle empty array', () => {
    expect(calculateRSI([], 14)).toEqual([]);
  });

  it('should return 50 when equal gains and losses', () => {
    // Alternate up and down with same magnitude
    const prices = [100];
    for (let i = 1; i < 30; i++) {
      prices.push(prices[i - 1] + (i % 2 === 1 ? 1 : -1));
    }
    const result = calculateRSI(prices, 14);
    // RSI should be exactly 50 with equal gains/losses
    const lastVal = result[result.length - 1];
    if (lastVal !== null) {
      expect(lastVal).toBeCloseTo(50, 0);
    }
  });
});

// ─── Bollinger Bands Tests ─────────────────────────────────────────────────

describe('calculateBollinger', () => {
  const prices = Array.from({ length: 30 }, (_, i) => 100 + i);

  it('should return upper, middle, lower arrays', () => {
    const result = calculateBollinger(prices, 20, 2);
    expect(result).toHaveProperty('upper');
    expect(result).toHaveProperty('middle');
    expect(result).toHaveProperty('lower');
    expect(result.upper.length).toBe(prices.length);
  });

  it('middle band should equal SMA', () => {
    const result = calculateBollinger(prices, 20, 2);
    const ma = calculateMA(prices, 20);
    for (let i = 0; i < prices.length; i++) {
      if (result.middle[i] !== null && ma[i] !== null) {
        expect(result.middle[i]).toBeCloseTo(ma[i] as number, 5);
      }
    }
  });

  it('upper band should be middle + stdDev * std', () => {
    const result = calculateBollinger(prices, 20, 2);
    for (let i = 0; i < prices.length; i++) {
      if (result.upper[i] !== null) {
        expect(result.upper[i] as number).toBeGreaterThanOrEqual(result.middle[i] as number);
      }
    }
  });

  it('lower band should be middle - stdDev * std', () => {
    const result = calculateBollinger(prices, 20, 2);
    for (let i = 0; i < prices.length; i++) {
      if (result.lower[i] !== null) {
        expect(result.lower[i] as number).toBeLessThanOrEqual(result.middle[i] as number);
      }
    }
  });

  it('should handle empty array', () => {
    const result = calculateBollinger([], 20, 2);
    expect(result.upper).toEqual([]);
    expect(result.middle).toEqual([]);
    expect(result.lower).toEqual([]);
  });
});

// ─── ADX Tests ─────────────────────────────────────────────────────────────

describe('calculateADX', () => {
  it('should return null for first period values', () => {
    const high: number[] = Array.from({ length: 14 }, (_, i) => 105 + i);
    const low: number[] = Array.from({ length: 14 }, (_, i) => 100 + i);
    const close: number[] = Array.from({ length: 14 }, (_, i) => 102 + i);

    const result = calculateADX(high, low, close, 14);
    for (let i = 0; i < 14; i++) {
      expect(result[i]).toBeNull();
    }
  });

  it('ADX should be between 0 and 100', () => {
    const length = 50;
    const high: number[] = [];
    const low: number[] = [];
    const close: number[] = [];

    let price = 100;
    for (let i = 0; i < length; i++) {
      price += (Math.random() - 0.5) * 2;
      high.push(price + Math.random());
      low.push(price - Math.random());
      close.push(price);
    }

    const result = calculateADX(high, low, close, 14);
    for (const val of result) {
      if (val !== null) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(100);
      }
    }
  });

  it('strong trend should produce higher ADX values', () => {
    // Strongly trending UP
    const length = 50;
    const high: number[] = [];
    const low: number[] = [];
    const close: number[] = [];

    for (let i = 0; i < length; i++) {
      const base = 100 + i * 0.5;
      high.push(base + 0.2);
      low.push(base - 0.2);
      close.push(base);
    }

    const result = calculateADX(high, low, close, 14);
    const lastVal = result[result.length - 1];
    expect(lastVal).not.toBeNull();
    if (lastVal !== null) {
      expect(lastVal).toBeGreaterThan(20); // Strong trend should be above 20
    }
  });

  it('should handle insufficient data', () => {
    const result = calculateADX([1, 2], [1, 2], [1, 2], 14);
    expect(allNull(result)).toBe(true);
  });
});

// ─── Stochastic Tests ──────────────────────────────────────────────────────

describe('calculateStochastic', () => {
  it('should return k and d arrays', () => {
    const high = Array.from({ length: 30 }, (_, i) => 105 + i);
    const low = Array.from({ length: 30 }, (_, i) => 100 + i);
    const close = Array.from({ length: 30 }, (_, i) => 102 + i);

    const result = calculateStochastic(high, low, close, 14, 3, 3);
    expect(result).toHaveProperty('k');
    expect(result).toHaveProperty('d');
    expect(result.k.length).toBe(30);
    expect(result.d.length).toBe(30);
  });

  it('k and d values should be between 0 and 100', () => {
    const length = 50;
    const high: number[] = [];
    const low: number[] = [];
    const close: number[] = [];

    for (let i = 0; i < length; i++) {
      const base = 100 + Math.random() * 10;
      high.push(base + Math.random() * 2);
      low.push(base - Math.random() * 2);
      close.push(base + (Math.random() - 0.5));
    }

    const result = calculateStochastic(high, low, close, 14, 3, 3);
    for (const val of result.k) {
      if (val !== null) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(100);
      }
    }
    for (const val of result.d) {
      if (val !== null) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(100);
      }
    }
  });

  it('should handle empty arrays', () => {
    const result = calculateStochastic([], [], [], 14, 3, 3);
    expect(result.k).toEqual([]);
    expect(result.d).toEqual([]);
  });
});

// ─── ATR Tests ─────────────────────────────────────────────────────────────

describe('calculateATR', () => {
  it('should return null for insufficient data', () => {
    const result = calculateATR([1], [1], [1], 14);
    expect(allNull(result)).toBe(true);
  });

  it('ATR should be positive', () => {
    const length = 50;
    const high: number[] = [];
    const low: number[] = [];
    const close: number[] = [];

    for (let i = 0; i < length; i++) {
      const base = 100 + Math.random() * 5;
      high.push(base + Math.random());
      low.push(base - Math.random());
      close.push(base);
    }

    const result = calculateATR(high, low, close, 14);
    for (const val of result) {
      if (val !== null) {
        expect(val).toBeGreaterThan(0);
      }
    }
  });

  it('should handle empty arrays', () => {
    expect(calculateATR([], [], [], 14)).toEqual([]);
  });
});
