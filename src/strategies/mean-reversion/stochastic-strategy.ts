import type { Candle } from '../../types/market';
import type { TradeSignal, StrategyConfig } from '../../types/strategy';
import type { Position } from '../../types/trading';
import type { EventBus } from '../../events/event-bus';
import { BaseStrategy } from '../base-strategy';
import { calculateStochastic } from '../indicators/stochastic';

interface StochasticParams {
  kPeriod: number;
  dPeriod: number;
  smoothing: number;
}

export class StochasticStrategy extends BaseStrategy {
  constructor(config: StrategyConfig, eventBus: EventBus) {
    super(config, eventBus);
  }

  onBar(candle: Candle, history: Candle[], positions: Position[]): TradeSignal[] {
    const params = this.config.params as unknown as StochasticParams;
    const kPeriod = params.kPeriod || 14;
    const dPeriod = params.dPeriod || 3;
    const smoothing = params.smoothing || 3;

    const allCandles = [...history, candle];
    const highs = allCandles.map(c => c.high);
    const lows = allCandles.map(c => c.low);
    const closes = allCandles.map(c => c.close);

    const stoch = calculateStochastic(highs, lows, closes, kPeriod, dPeriod, smoothing);
    const len = stoch.k.length;

    const currentK = stoch.k[len - 1];
    const prevK = stoch.k[len - 2];
    const currentD = stoch.d[len - 1];

    if (currentK === null || prevK === null || currentD === null) return [];

    const signals: TradeSignal[] = [];
    const existingPosition = positions.find(
      p => p.symbol === candle.symbol && p.strategyId === this.id
    );

    if (prevK <= prevK && currentK > currentD && currentK < 80) {
      if (!existingPosition || existingPosition.direction === 'sell') {
        if (existingPosition) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'sell',
            type: 'close',
            price: candle.close,
            volume: existingPosition.volume,
            reason: 'Close sell before stochastic buy signal',
          }));
        }
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'buy',
          type: 'open',
          price: candle.close,
          volume: 0.01,
          reason: `Stochastic buy: %K(${currentK.toFixed(1)}) crossed above %D(${currentD.toFixed(1)})`,
        }));
      }
    } else if (prevK >= prevK && currentK < currentD && currentK > 20) {
      if (!existingPosition || existingPosition.direction === 'buy') {
        if (existingPosition) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'buy',
            type: 'close',
            price: candle.close,
            volume: existingPosition.volume,
            reason: 'Close buy before stochastic sell signal',
          }));
        }
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'sell',
          type: 'open',
          price: candle.close,
          volume: 0.01,
          reason: `Stochastic sell: %K(${currentK.toFixed(1)}) crossed below %D(${currentD.toFixed(1)})`,
        }));
      }
    }

    return signals;
  }
}
