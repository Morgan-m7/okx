import type { Candle, SymbolPair } from '../../types/market';
import type { TradeSignal, StrategyConfig } from '../../types/strategy';
import type { Position } from '../../types/trading';
import type { EventBus } from '../../events/event-bus';
import { BaseStrategy } from '../base-strategy';
import { calculateMA } from '../indicators/ma';

interface MaCrossParams {
  fastPeriod: number;
  slowPeriod: number;
}

export class MaCrossStrategy extends BaseStrategy {
  constructor(config: StrategyConfig, eventBus: EventBus) {
    super(config, eventBus);
  }

  onBar(candle: Candle, history: Candle[], positions: Position[]): TradeSignal[] {
    const params = this.config.params as unknown as MaCrossParams;
    const fastPeriod = params.fastPeriod || 10;
    const slowPeriod = params.slowPeriod || 30;

    const allCandles = [...history, candle];
    const prices = allCandles.map(c => c.close);

    const fastMA = calculateMA(prices, fastPeriod);
    const slowMA = calculateMA(prices, slowPeriod);

    if (fastMA.length < 2 || slowMA.length < 2) return [];

    const currentFast = fastMA[fastMA.length - 1];
    const prevFast = fastMA[fastMA.length - 2];
    const currentSlow = slowMA[slowMA.length - 1];
    const prevSlow = slowMA[slowMA.length - 2];

    if (currentFast === null || prevFast === null || currentSlow === null || prevSlow === null) {
      return [];
    }

    const isBullishCross = prevFast <= prevSlow && currentFast > currentSlow;
    const isBearishCross = prevFast >= prevSlow && currentFast < currentSlow;

    const signals: TradeSignal[] = [];
    const existingPosition = positions.find(
      p => p.symbol === candle.symbol && p.strategyId === this.id
    );

    if (isBullishCross) {
      if (!existingPosition || existingPosition.direction === 'sell') {
        if (existingPosition) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'sell',
            type: 'close',
            price: candle.close,
            volume: existingPosition.volume,
            reason: 'MA bearish cross signal, close sell position',
          }));
        }
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'buy',
          type: 'open',
          price: candle.close,
          volume: 0.01,
          reason: `MA bullish cross: Fast(${currentFast.toFixed(5)}) > Slow(${currentSlow.toFixed(5)})`,
        }));
      }
    } else if (isBearishCross) {
      if (!existingPosition || existingPosition.direction === 'buy') {
        if (existingPosition) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'buy',
            type: 'close',
            price: candle.close,
            volume: existingPosition.volume,
            reason: 'MA bullish cross signal, close buy position',
          }));
        }
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'sell',
          type: 'open',
          price: candle.close,
          volume: 0.01,
          reason: `MA bearish cross: Fast(${currentFast.toFixed(5)}) < Slow(${currentSlow.toFixed(5)})`,
        }));
      }
    }

    return signals;
  }
}
