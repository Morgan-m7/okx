import type { Candle } from '../../types/market';
import type { TradeSignal, StrategyConfig } from '../../types/strategy';
import type { Position } from '../../types/trading';
import type { EventBus } from '../../events/event-bus';
import { BaseStrategy } from '../base-strategy';
import { calculateBollinger } from '../indicators/bollinger';

interface ChannelBreakoutParams {
  period: number;
  stdDev: number;
}

export class ChannelBreakoutStrategy extends BaseStrategy {
  constructor(config: StrategyConfig, eventBus: EventBus) {
    super(config, eventBus);
  }

  onBar(candle: Candle, history: Candle[], positions: Position[]): TradeSignal[] {
    const params = this.config.params as unknown as ChannelBreakoutParams;
    const period = params.period || 20;
    const stdDev = params.stdDev || 2;

    const allCandles = [...history, candle];
    const prices = allCandles.map(c => c.close);

    const bollinger = calculateBollinger(prices, period, stdDev);
    const lastUpper = bollinger.upper[bollinger.upper.length - 1];
    const lastLower = bollinger.lower[bollinger.lower.length - 1];
    const lastMiddle = bollinger.middle[bollinger.middle.length - 1];

    if (lastUpper === null || lastLower === null || lastMiddle === null) return [];

    const signals: TradeSignal[] = [];
    const existingPosition = positions.find(
      p => p.symbol === candle.symbol && p.strategyId === this.id
    );

    if (candle.close > lastUpper) {
      if (!existingPosition || existingPosition.direction === 'sell') {
        if (existingPosition) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'sell',
            type: 'close',
            price: candle.close,
            volume: existingPosition.volume,
            reason: 'Close sell position on upside breakout',
          }));
        }
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'buy',
          type: 'open',
          price: candle.close,
          volume: 0.01,
          sl: lastMiddle,
          reason: `Channel breakout buy: price broke above upper band ${lastUpper.toFixed(5)}`,
        }));
      }
    } else if (candle.close < lastLower) {
      if (!existingPosition || existingPosition.direction === 'buy') {
        if (existingPosition) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'buy',
            type: 'close',
            price: candle.close,
            volume: existingPosition.volume,
            reason: 'Close buy position on downside breakout',
          }));
        }
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'sell',
          type: 'open',
          price: candle.close,
          volume: 0.01,
          sl: lastMiddle,
          reason: `Channel breakout sell: price broke below lower band ${lastLower.toFixed(5)}`,
        }));
      }
    }

    return signals;
  }
}
