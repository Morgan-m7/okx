import type { Candle } from '../../types/market';
import type { TradeSignal, StrategyConfig } from '../../types/strategy';
import type { Position } from '../../types/trading';
import type { EventBus } from '../../events/event-bus';
import { BaseStrategy } from '../base-strategy';
import { calculateADX } from '../indicators/adx';

interface AdxTrendParams {
  period: number;
  threshold: number;
}

export class AdxTrendStrategy extends BaseStrategy {
  constructor(config: StrategyConfig, eventBus: EventBus) {
    super(config, eventBus);
  }

  onBar(candle: Candle, history: Candle[], positions: Position[]): TradeSignal[] {
    const params = this.config.params as unknown as AdxTrendParams;
    const period = params.period || 14;
    const threshold = params.threshold || 25;

    const allCandles = [...history, candle];
    if (allCandles.length < period * 2) return [];

    const highs = allCandles.map(c => c.high);
    const lows = allCandles.map(c => c.low);
    const closes = allCandles.map(c => c.close);

    const adxValues = calculateADX(highs, lows, closes, period);
    const currentADX = adxValues[adxValues.length - 1];

    if (currentADX === null || currentADX < threshold) return [];

    const plusDM: number[] = [];
    const minusDM: number[] = [];
    for (let i = 1; i < allCandles.length; i++) {
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }

    const plusDISum = plusDM.slice(-period).reduce((a, b) => a + b, 0);
    const minusDISum = minusDM.slice(-period).reduce((a, b) => a + b, 0);

    let trSum = 0;
    for (let i = allCandles.length - period; i < allCandles.length; i++) {
      if (i < 1) continue;
      trSum += Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
    }

    const plusDI = trSum > 0 ? (plusDISum / trSum) * 100 : 0;
    const minusDI = trSum > 0 ? (minusDISum / trSum) * 100 : 0;

    const signals: TradeSignal[] = [];
    const existingPosition = positions.find(
      p => p.symbol === candle.symbol && p.strategyId === this.id
    );

    if (plusDI > minusDI) {
      if (!existingPosition || existingPosition.direction === 'sell') {
        if (existingPosition) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'sell',
            type: 'close',
            price: candle.close,
            volume: existingPosition.volume,
            reason: 'ADX trend change: closing sell',
          }));
        }
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'buy',
          type: 'open',
          price: candle.close,
          volume: 0.01,
          reason: `ADX trend buy: ADX(${currentADX.toFixed(1)}) > ${threshold}, DI+ > DI-`,
        }));
      }
    } else if (minusDI > plusDI) {
      if (!existingPosition || existingPosition.direction === 'buy') {
        if (existingPosition) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'buy',
            type: 'close',
            price: candle.close,
            volume: existingPosition.volume,
            reason: 'ADX trend change: closing buy',
          }));
        }
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'sell',
          type: 'open',
          price: candle.close,
          volume: 0.01,
          reason: `ADX trend sell: ADX(${currentADX.toFixed(1)}) > ${threshold}, DI- > DI+`,
        }));
      }
    }

    return signals;
  }
}
