import type { Candle } from '../../types/market';
import type { TradeSignal, StrategyConfig } from '../../types/strategy';
import type { Position } from '../../types/trading';
import type { EventBus } from '../../events/event-bus';
import { BaseStrategy } from '../base-strategy';
import { calculateBollinger } from '../indicators/bollinger';

interface BollingerReversalParams {
  period: number;
  stdDev: number;
  confirmationCandles: number;
}

export class BollingerReversalStrategy extends BaseStrategy {
  constructor(config: StrategyConfig, eventBus: EventBus) {
    super(config, eventBus);
  }

  onBar(candle: Candle, history: Candle[], positions: Position[]): TradeSignal[] {
    const params = this.config.params as unknown as BollingerReversalParams;
    const period = params.period || 20;
    const stdDev = params.stdDev || 2;
    const confirmationCandles = params.confirmationCandles || 2;

    const allCandles = [...history, candle];
    const prices = allCandles.map(c => c.close);

    const bollinger = calculateBollinger(prices, period, stdDev);
    const len = bollinger.upper.length;
    const lastUpper = bollinger.upper[len - 1];
    const lastLower = bollinger.lower[len - 1];
    const lastMiddle = bollinger.middle[len - 1];

    if (lastUpper === null || lastLower === null || lastMiddle === null) return [];

    const signals: TradeSignal[] = [];
    const existingPosition = positions.find(
      p => p.symbol === candle.symbol && p.strategyId === this.id
    );

    const recentlyTouchedUpper = allCandles.slice(-confirmationCandles).some(
      c => c.high >= lastUpper
    );
    const recentlyTouchedLower = allCandles.slice(-confirmationCandles).some(
      c => c.low <= lastLower
    );

    if (recentlyTouchedUpper && candle.close < lastUpper) {
      if (!existingPosition || existingPosition.direction === 'buy') {
        if (existingPosition) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'buy',
            type: 'close',
            price: candle.close,
            volume: existingPosition.volume,
            reason: 'Close buy before Bollinger reversal sell',
          }));
        }
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'sell',
          type: 'open',
          price: candle.close,
          volume: 0.01,
          sl: lastUpper * 1.01,
          tp: lastMiddle,
          reason: `Bollinger reversal sell: price touched upper band ${lastUpper.toFixed(5)} and retraced`,
        }));
      }
    } else if (recentlyTouchedLower && candle.close > lastLower) {
      if (!existingPosition || existingPosition.direction === 'sell') {
        if (existingPosition) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'sell',
            type: 'close',
            price: candle.close,
            volume: existingPosition.volume,
            reason: 'Close sell before Bollinger reversal buy',
          }));
        }
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'buy',
          type: 'open',
          price: candle.close,
          volume: 0.01,
          sl: lastLower * 0.99,
          tp: lastMiddle,
          reason: `Bollinger reversal buy: price touched lower band ${lastLower.toFixed(5)} and retraced`,
        }));
      }
    }

    return signals;
  }
}
