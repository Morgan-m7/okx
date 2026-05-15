import type { Candle } from '../../types/market';
import type { TradeSignal, StrategyConfig } from '../../types/strategy';
import type { Position } from '../../types/trading';
import type { EventBus } from '../../events/event-bus';
import { BaseStrategy } from '../base-strategy';

interface MomentumScalperParams {
  period: number;
  momentumThreshold: number;
}

export class MomentumScalperStrategy extends BaseStrategy {
  constructor(config: StrategyConfig, eventBus: EventBus) {
    super(config, eventBus);
  }

  onBar(candle: Candle, history: Candle[], positions: Position[]): TradeSignal[] {
    const params = this.config.params as unknown as MomentumScalperParams;
    const period = params.period || 5;
    const momentumThreshold = params.momentumThreshold || 0.0003;

    const allCandles = [...history, candle];
    if (allCandles.length < period + 1) return [];

    const closes = allCandles.slice(-period).map(c => c.close);
    const momentum = closes[closes.length - 1] - closes[0];

    const signals: TradeSignal[] = [];
    const existingPosition = positions.find(
      p => p.symbol === candle.symbol && p.strategyId === this.id
    );

    if (existingPosition) {
      const pips = Math.abs(candle.close - existingPosition.openPrice) /
        (candle.symbol === 'XAU/USD' ? 0.01 : 0.0001);

      if (pips >= 10) {
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: existingPosition.direction,
          type: 'close',
          price: candle.close,
          volume: existingPosition.volume,
          reason: `Scalper take profit: ${pips.toFixed(1)} pips`,
        }));
      }
      return signals;
    }

    if (Math.abs(momentum) > momentumThreshold) {
      if (momentum > 0) {
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'buy',
          type: 'open',
          price: candle.close,
          volume: 0.01,
          reason: `Momentum scalper buy: momentum ${(momentum * 10000).toFixed(1)} pips`,
        }));
      } else {
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'sell',
          type: 'open',
          price: candle.close,
          volume: 0.01,
          reason: `Momentum scalper sell: momentum ${(Math.abs(momentum) * 10000).toFixed(1)} pips`,
        }));
      }
    }

    return signals;
  }
}
