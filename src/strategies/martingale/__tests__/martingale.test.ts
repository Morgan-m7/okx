import { describe, it, expect, beforeEach } from 'vitest';
import type { Candle } from '../../../types/market';
import type { Position } from '../../../types/trading';
import type { StrategyConfig } from '../../../types/strategy';
import { EventBus } from '../../../events/event-bus';
import { ClassicMartingaleStrategy } from '../classic-martingale';
import { FibonacciMartingaleStrategy } from '../fibonacci-martingale';
import { AntiMartingaleStrategy } from '../anti-martingale';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createConfig(overrides: Partial<StrategyConfig> = {}): StrategyConfig {
  return {
    id: 'mg-test-001',
    strategyId: 'classic-martingale',
    family: 'martingale',
    name: 'Test Martingale',
    params: {
      baseVolume: 0.01,
      multiplier: 2,
      maxLayers: 5,
      takeProfitPips: 50,
    },
    isActive: true,
    symbols: ['XAU/USD'],
    riskParams: {
      maxLossPercent: 10,
      balanceProtectionPercent: 20,
      maxMartingaleLayers: 5,
      adxProtectionEnabled: true,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
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

function makePosition(
  symbol: string,
  direction: 'buy' | 'sell',
  volume: number,
  openPrice: number,
  currentPrice: number,
  strategyId: string,
  layer: number = 1,
  profit?: number
): Position {
  const pipValue = symbol === 'XAU/USD' ? 0.01 : 0.0001;
  const pips = direction === 'buy'
    ? (currentPrice - openPrice) / pipValue
    : (openPrice - currentPrice) / pipValue;
  const calcProfit = Math.round(volume * 100000 * pips * pipValue * 100) / 100;

  return {
    id: `pos-${Math.random().toString(36).slice(2)}`,
    symbol: symbol as any,
    direction,
    volume,
    openPrice,
    currentPrice,
    sl: null,
    tp: null,
    profit: profit ?? calcProfit,
    pips: Math.round(pips * 10) / 10,
    strategyId,
    martingaleLayer: layer,
    openTime: Date.now(),
  };
}

/**
 * Generate strongly trending history with ADX > 20 guaranteed.
 * Uses large, consistent directional moves.
 */
function generateTrendingHistory(count: number, startPrice: number): Candle[] {
  const candles: Candle[] = [];
  let price = startPrice;
  for (let i = 0; i < count; i++) {
    price += 0.002; // Strong consistent up-trend
    candles.push(makeCandle(price, price + 0.0005, price - 0.0005));
  }
  return candles;
}

/**
 * Generate flat/ranging history guaranteed to produce ADX < 20.
 * Alternates tiny ups and downs to keep TR small and directional movement near zero.
 */
function generateFlatHistory(count: number, startPrice: number): Candle[] {
  const candles: Candle[] = [];
  let price = startPrice;
  for (let i = 0; i < count; i++) {
    // Very small oscillation to keep ADX low
    price += (i % 2 === 0 ? 0.00005 : -0.00005);
    candles.push(makeCandle(price, price + 0.00005, price - 0.00005));
  }
  return candles;
}

// ─── Classic Martingale Tests ───────────────────────────────────────────────

describe('ClassicMartingaleStrategy', () => {
  let eventBus: EventBus;
  let config: StrategyConfig;
  let strategy: ClassicMartingaleStrategy;

  beforeEach(() => {
    eventBus = new EventBus();
    config = createConfig();
    strategy = new ClassicMartingaleStrategy(config, eventBus);
    strategy.onInit();
  });

  it('should open initial position when no existing positions and ADX is high enough', () => {
    const history = generateTrendingHistory(30, 1.12000);
    const candle = makeCandle(1.12500);
    const signals = strategy.onBar(candle, history, []);

    expect(signals.length).toBe(1);
    expect(signals[0].type).toBe('open');
    expect(signals[0].direction).toBe('buy');
    expect(signals[0].volume).toBe(0.01);
    expect(signals[0].martingaleLayer).toBe(1);
  });

  it('should NOT open initial position when ADX < 20 (ranging market)', () => {
    const history = generateFlatHistory(30, 1.12000);
    const candle = makeCandle(1.12010);
    const signals = strategy.onBar(candle, history, []);
    // Flat market → ADX < 20 → no signals
    expect(signals.length).toBe(0);
  });

  it('should add position on consecutive loss', () => {
    const history = generateTrendingHistory(30, 1.12000);

    // Step 1: open initial position (layer 1, volume 0.01)
    const signals1 = strategy.onBar(makeCandle(1.12000), history, []);
    expect(signals1.length).toBe(1);

    // Step 2: losing position exists → strategy adds layer 2
    const losingPos = makePosition(
      'XAU/USD', 'buy', 0.01, 1.12000, 1.11800,
      'mg-test-001', 1, -2
    );
    const signals2 = strategy.onBar(makeCandle(1.11800), history, [losingPos]);

    expect(signals2.length).toBe(1);
    expect(signals2[0].type).toBe('open');
    expect(signals2[0].martingaleLayer).toBe(2);
  });

  it('should close all positions when total pips reach takeProfitPips', () => {
    const history = generateTrendingHistory(30, 1.12000);

    // Open initial position
    strategy.onBar(makeCandle(1.12000), history, []);

    // Profitable position with 60 pips profit (> 50 TP)
    const profitablePos = makePosition(
      'XAU/USD', 'buy', 0.01, 1.12000, 1.12600,
      'mg-test-001', 1, 60
    );
    const signals = strategy.onBar(makeCandle(1.12600), history, [profitablePos]);

    expect(signals.length).toBe(1);
    expect(signals[0].type).toBe('close');
  });

  it('should enforce maxLayers hard limit when called sequentially', () => {
    const restrictedConfig = createConfig({
      params: { baseVolume: 0.01, multiplier: 2, maxLayers: 3, takeProfitPips: 500 },
    });
    const s = new ClassicMartingaleStrategy(restrictedConfig, eventBus);
    s.onInit();
    const history = generateTrendingHistory(30, 1.12000);

    // Layer 1: initial open
    const s1 = s.onBar(makeCandle(1.12000), history, []);
    expect(s1.filter(sig => sig.type === 'open').length).toBe(1);

    const p1 = makePosition('XAU/USD', 'buy', 0.01, 1.12000, 1.11800, 'mg-test-001', 1, -2);
    // Layer 2: first add
    const s2 = s.onBar(makeCandle(1.11800), history, [p1]);
    expect(s2.filter(sig => sig.type === 'open').length).toBe(1);

    const p2 = makePosition('XAU/USD', 'buy', 0.01, 1.11800, 1.11600, 'mg-test-001', 2, -2);
    // Layer 3: second add
    const s3 = s.onBar(makeCandle(1.11600), history, [p1, p2]);
    expect(s3.filter(sig => sig.type === 'open').length).toBe(1);

    const p3 = makePosition('XAU/USD', 'buy', 0.01, 1.11600, 1.11400, 'mg-test-001', 3, -2);
    // Layer 4 should be blocked (maxLayers=3)
    const s4 = s.onBar(makeCandle(1.11400), history, [p1, p2, p3]);
    expect(s4.filter(sig => sig.type === 'open').length).toBe(0);
  });

  it('should NOT add new position when ADX < 20 and existing positions are losing', () => {
    const flatHistory = generateFlatHistory(30, 1.12000);

    // First call to open initial position (but with trending history to pass ADX check)
    const trendHistory = generateTrendingHistory(30, 1.12000);
    strategy.onBar(makeCandle(1.12000), trendHistory, []);

    // Now with flat history (ADX < 20), should block new positions
    const losingPos = makePosition(
      'XAU/USD', 'buy', 0.01, 1.12000, 1.11950,
      'mg-test-001', 1, -0.5
    );
    const signals = strategy.onBar(makeCandle(1.11950), flatHistory, [losingPos]);
    const openSignals = signals.filter(s => s.type === 'open');
    expect(openSignals.length).toBe(0);
  });
});

// ─── Fibonacci Martingale Tests ─────────────────────────────────────────────

describe('FibonacciMartingaleStrategy', () => {
  let eventBus: EventBus;
  let config: StrategyConfig;
  let strategy: FibonacciMartingaleStrategy;

  beforeEach(() => {
    eventBus = new EventBus();
    config = createConfig({
      strategyId: 'fibonacci-martingale' as any,
      name: 'Test Fibonacci Martingale',
      params: { baseVolume: 0.01, maxLayers: 5, takeProfitPips: 50 },
    });
    strategy = new FibonacciMartingaleStrategy(config, eventBus);
    strategy.onInit();
  });

  it('should open initial position with baseVolume', () => {
    const history = generateTrendingHistory(30, 1.12000);
    const candle = makeCandle(1.12500);
    const signals = strategy.onBar(candle, history, []);
    expect(signals.length).toBe(1);
    expect(signals[0].volume).toBe(0.01);
    expect(signals[0].martingaleLayer).toBe(1);
  });

  it('should use Fibonacci sequence for volume', () => {
    const history = generateTrendingHistory(30, 1.12000);

    // Layer 1: initial — volume = 0.01
    strategy.onBar(makeCandle(1.12000), history, []);

    // Layer 2: fib multiplier 2x → 0.02
    const p1 = makePosition('XAU/USD', 'buy', 0.01, 1.12000, 1.11800, 'mg-test-001', 1, -2);
    const s2 = strategy.onBar(makeCandle(1.11800), history, [p1]);
    expect(s2[0].volume).toBeCloseTo(0.02, 5);
    expect(s2[0].martingaleLayer).toBe(2);

    // Layer 3: fib multiplier 3x → 0.03
    const p2 = makePosition('XAU/USD', 'buy', 0.02, 1.11800, 1.11600, 'mg-test-001', 2, -4);
    const s3 = strategy.onBar(makeCandle(1.11600), history, [p1, p2]);
    expect(s3[0].volume).toBeCloseTo(0.03, 5);
    expect(s3[0].martingaleLayer).toBe(3);

    // Layer 4: fib multiplier 5x → 0.05
    const p3 = makePosition('XAU/USD', 'buy', 0.03, 1.11600, 1.11400, 'mg-test-001', 3, -6);
    const s4 = strategy.onBar(makeCandle(1.11400), history, [p1, p2, p3]);
    expect(s4[0].volume).toBeCloseTo(0.05, 5);
    expect(s4[0].martingaleLayer).toBe(4);

    // Layer 5: fib multiplier 8x → 0.08
    const p4 = makePosition('XAU/USD', 'buy', 0.05, 1.11400, 1.11200, 'mg-test-001', 4, -10);
    const s5 = strategy.onBar(makeCandle(1.11200), history, [p1, p2, p3, p4]);
    expect(s5[0].volume).toBeCloseTo(0.08, 5);
    expect(s5[0].martingaleLayer).toBe(5);
  });

  it('should NOT exceed layer 5 when called sequentially', () => {
    const s = new FibonacciMartingaleStrategy(createConfig({
      strategyId: 'fibonacci-martingale' as any,
      name: 'Test Fib',
      params: { baseVolume: 0.01, maxLayers: 3, takeProfitPips: 500 },
    }), eventBus);
    s.onInit();
    const history = generateTrendingHistory(30, 1.12000);

    // Layer 1
    s.onBar(makeCandle(1.12000), history, []);
    const p1 = makePosition('XAU/USD', 'buy', 0.01, 1.12000, 1.11800, 'mg-test-001', 1, -2);
    // Layer 2
    s.onBar(makeCandle(1.11800), history, [p1]);
    const p2 = makePosition('XAU/USD', 'buy', 0.02, 1.11800, 1.11600, 'mg-test-001', 2, -4);
    // Layer 3
    const s3 = s.onBar(makeCandle(1.11600), history, [p1, p2]);
    expect(s3.filter(sig => sig.type === 'open').length).toBe(1);
    const p3 = makePosition('XAU/USD', 'buy', 0.03, 1.11600, 1.11400, 'mg-test-001', 3, -6);
    // Layer 4 should be blocked (maxLayers=3)
    const s4 = s.onBar(makeCandle(1.11400), history, [p1, p2, p3]);
    expect(s4.filter(sig => sig.type === 'open').length).toBe(0);
  });

  it('should close all on take profit', () => {
    const history = generateTrendingHistory(30, 1.12000);
    strategy.onBar(makeCandle(1.12000), history, []);

    const profitablePos = makePosition(
      'XAU/USD', 'buy', 0.01, 1.12000, 1.12600,
      'mg-test-001', 1, 60
    );
    const signals = strategy.onBar(makeCandle(1.12600), history, [profitablePos]);
    expect(signals.length).toBe(1);
    expect(signals[0].type).toBe('close');
  });
});

// ─── Anti-Martingale Tests ──────────────────────────────────────────────────

describe('AntiMartingaleStrategy', () => {
  let eventBus: EventBus;
  let config: StrategyConfig;
  let strategy: AntiMartingaleStrategy;

  beforeEach(() => {
    eventBus = new EventBus();
    config = createConfig({
      strategyId: 'anti-martingale' as any,
      name: 'Test Anti Martingale',
      params: { baseVolume: 0.01, addRatio: 1.5, drawdownStopPercent: 15 },
    });
    strategy = new AntiMartingaleStrategy(config, eventBus);
    strategy.onInit();
  });

  it('should open initial position with trending market', () => {
    const history = generateTrendingHistory(30, 1.12000);
    const candle = makeCandle(1.12500);
    const signals = strategy.onBar(candle, history, []);
    expect(signals.length).toBe(1);
    expect(signals[0].type).toBe('open');
    expect(signals[0].volume).toBe(0.01);
  });

  it('should require 2 consecutive wins before adding (anti-martingale adds on profit)', () => {
    const history = generateTrendingHistory(30, 1.12000);
    strategy.onBar(makeCandle(1.12500), history, []);

    const profitablePos = makePosition(
      'XAU/USD', 'buy', 0.01, 1.12000, 1.12500,
      'mg-test-001', 1, 5
    );

    // Bar 1: profitable position → consecutiveWins=1 → still no add
    const signals1 = strategy.onBar(makeCandle(1.12500), history, [profitablePos]);
    expect(signals1.filter(s => s.type === 'open').length).toBe(0);

    // Bar 2: still profitable → consecutiveWins >= 2 → should add
    const signals2 = strategy.onBar(makeCandle(1.12600), history, [profitablePos]);
    expect(signals2.filter(s => s.type === 'open').length).toBe(1);
  });

  it('should close all positions when drawdown exceeds stop percent', () => {
    const history = generateTrendingHistory(30, 1.12000);
    strategy.onBar(makeCandle(1.12500), history, []);

    // Create heavy losses that exceed 15% drawdown
    const losingPos1 = makePosition(
      'XAU/USD', 'buy', 0.01, 1.12500, 1.08000,
      'mg-test-001', 1, -450
    );
    const losingPos2 = makePosition(
      'XAU/USD', 'buy', 0.02, 1.12000, 1.08000,
      'mg-test-001', 2, -800
    );
    // Total loss ~1250, so drawdown = 1250/10000*100 = 12.5%
    // Not quite 15%, add a third
    const losingPos3 = makePosition(
      'XAU/USD', 'buy', 0.03, 1.11500, 1.08000,
      'mg-test-001', 3, -1050
    );
    // Total loss ~2300, drawdown ~23% > 15% → should trigger close
    const signals = strategy.onBar(makeCandle(1.08000), history, [losingPos1, losingPos2, losingPos3]);
    expect(signals.filter(s => s.type === 'close').length).toBeGreaterThanOrEqual(1);
  });
});
