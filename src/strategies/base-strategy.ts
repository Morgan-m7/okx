import type { Candle } from '../types/market';
import type { StrategyConfig, StrategyId, StrategyFamily, TradeSignal, RiskParams } from '../types/strategy';
import type { Position } from '../types/trading';
import type { EventBus } from '../events/event-bus';

export abstract class BaseStrategy {
  readonly id: string;
  readonly strategyId: StrategyId;
  readonly family: StrategyFamily;
  readonly name: string;

  protected config: StrategyConfig;
  protected eventBus: EventBus;

  constructor(config: StrategyConfig, eventBus: EventBus) {
    this.id = config.id;
    this.strategyId = config.strategyId as StrategyId;
    this.family = config.family;
    this.name = config.name;
    this.config = config;
    this.eventBus = eventBus;
  }

  abstract onBar(
    candle: Candle,
    history: Candle[],
    positions: Position[]
  ): TradeSignal[];

  onInit(): void {
    // Subclasses can override
  }

  onDestroy(): void {
    // Subclasses can override
  }

  getParams(): Record<string, any> {
    return { ...this.config.params };
  }

  updateParams(params: Record<string, any>): void {
    this.config.params = { ...this.config.params, ...params };
  }

  getRiskParams(): RiskParams {
    return { ...this.config.riskParams };
  }

  protected emitSignal(signal: Omit<TradeSignal, 'strategyId' | 'timestamp'>): TradeSignal {
    return {
      ...signal,
      strategyId: this.id,
      timestamp: Date.now(),
    };
  }

  protected isPriceAbove(price: number, reference: number): boolean {
    return price > reference;
  }

  protected isPriceBelow(price: number, reference: number): boolean {
    return price < reference;
  }
}

export class IndicatorCalculator {
  calculateMA(data: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(0);
        continue;
      }
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += data[j];
      }
      result.push(sum / period);
    }
    return result;
  }

  calculateEMA(data: number[], period: number): number[] {
    const result: number[] = [];
    const k = 2 / (period + 1);
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        result.push(data[i]);
      } else if (i < period - 1) {
        result.push(data[i]);
      } else {
        const ema = data[i] * k + result[i - 1] * (1 - k);
        result.push(ema);
      }
    }
    return result;
  }
}
