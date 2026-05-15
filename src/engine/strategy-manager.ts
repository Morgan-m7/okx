import type { Candle } from '../types/market';
import type { Position } from '../types/trading';
import type { StrategyConfig, TradeSignal } from '../types/strategy';
import type { EventBus } from '../events/event-bus';
import { EventType } from '../types/events';
import { BaseStrategy } from '../strategies/base-strategy';
import { MaCrossStrategy } from '../strategies/trend-following/ma-cross-strategy';
import { MacdStrategy } from '../strategies/trend-following/macd-strategy';
import { TurtleStrategy } from '../strategies/trend-following/turtle-strategy';
import { ChannelBreakoutStrategy } from '../strategies/trend-following/channel-breakout';
import { AdxTrendStrategy } from '../strategies/trend-following/adx-trend-strategy';
import { ClassicMartingaleStrategy } from '../strategies/martingale/classic-martingale';
import { AntiMartingaleStrategy } from '../strategies/martingale/anti-martingale';
import { FibonacciMartingaleStrategy } from '../strategies/martingale/fibonacci-martingale';
import { GridStrategy } from '../strategies/martingale/grid-strategy';
import { HedgeGridStrategy } from '../strategies/martingale/hedge-grid-strategy';
import { RsiStrategy } from '../strategies/mean-reversion/rsi-strategy';
import { BollingerReversalStrategy } from '../strategies/mean-reversion/bollinger-reversal';
import { StochasticStrategy } from '../strategies/mean-reversion/stochastic-strategy';
import { MomentumScalperStrategy } from '../strategies/scalping/momentum-scalper';
import { TickScalperStrategy } from '../strategies/scalping/tick-scalper';
import { MultiIndicatorStrategy } from '../strategies/composite/multi-indicator';
import { MultiTimeframeStrategy } from '../strategies/composite/multi-timeframe';
import { strategyRepo } from '../db/strategy.repo';

export class StrategyManager {
  private strategies: Map<string, BaseStrategy> = new Map();
  private eventBus: EventBus;
  private unsubscribers: (() => void)[] = [];

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  async initialize(): Promise<void> {
    const configs = await strategyRepo.getAll();
    for (const config of configs) {
      this.loadStrategy(config);
    }
  }

  loadStrategy(config: StrategyConfig): BaseStrategy | null {
    const strategy = this.createStrategy(config);
    if (strategy) {
      this.strategies.set(config.id, strategy);
      strategy.onInit();
    }
    return strategy;
  }

  unloadStrategy(id: string): void {
    const strategy = this.strategies.get(id);
    if (strategy) {
      strategy.onDestroy();
      this.strategies.delete(id);
    }
  }

  getStrategy(id: string): BaseStrategy | undefined {
    return this.strategies.get(id);
  }

  getAllStrategies(): BaseStrategy[] {
    return Array.from(this.strategies.values());
  }

  getActiveStrategies(): BaseStrategy[] {
    return Array.from(this.strategies.values()).filter(s => {
      const config = this.getStrategyConfig(s.id);
      return config?.isActive ?? false;
    });
  }

  getStrategyConfig(id: string): StrategyConfig | undefined {
    const strategy = this.strategies.get(id);
    if (!strategy) return undefined;
    return {
      id: strategy.id,
      strategyId: strategy.strategyId,
      family: strategy.family,
      name: strategy.name,
      params: strategy.getParams(),
      isActive: true,
      symbols: [],
      riskParams: strategy.getRiskParams(),
      createdAt: 0,
      updatedAt: Date.now(),
    };
  }

  async onCandleClosed(
    candle: Candle,
    history: Candle[],
    allPositions: Position[]
  ): Promise<TradeSignal[]> {
    const allSignals: TradeSignal[] = [];

    for (const [, strategy] of this.strategies) {
      try {
        const config = this.getStrategyConfig(strategy.id);
        if (!config || !config.isActive) continue;

        if (!config.symbols.includes(candle.symbol)) continue;

        const positions = allPositions.filter(p => p.strategyId === strategy.id);
        const signals = strategy.onBar(candle, history, positions);

        for (const signal of signals) {
          allSignals.push(signal);
          this.eventBus.emit(EventType.STRATEGY_SIGNAL, { signal });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        this.eventBus.emit(EventType.STRATEGY_ERROR, {
          strategyId: strategy.id,
          error: errorMsg,
        });
      }
    }

    return allSignals;
  }

  private createStrategy(config: StrategyConfig): BaseStrategy | null {
    const strategyMap: Record<string, new (config: StrategyConfig, eventBus: EventBus) => BaseStrategy> = {
      'ma-cross': MaCrossStrategy,
      'macd': MacdStrategy,
      'turtle': TurtleStrategy,
      'channel-breakout': ChannelBreakoutStrategy,
      'adx-trend': AdxTrendStrategy,
      'classic-martingale': ClassicMartingaleStrategy,
      'anti-martingale': AntiMartingaleStrategy,
      'fibonacci-martingale': FibonacciMartingaleStrategy,
      'grid': GridStrategy,
      'hedge-grid': HedgeGridStrategy,
      'rsi': RsiStrategy,
      'bollinger-reversal': BollingerReversalStrategy,
      'stochastic': StochasticStrategy,
      'momentum-scalper': MomentumScalperStrategy,
      'tick-scalper': TickScalperStrategy,
      'multi-indicator': MultiIndicatorStrategy,
      'multi-timeframe': MultiTimeframeStrategy,
    };

    const StrategyClass = strategyMap[config.strategyId];
    if (!StrategyClass) {
      console.error(`Unknown strategy: ${config.strategyId}`);
      return null;
    }

    return new StrategyClass(config, this.eventBus);
  }

  destroy(): void {
    for (const [, strategy] of this.strategies) {
      strategy.onDestroy();
    }
    this.strategies.clear();
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }
}
