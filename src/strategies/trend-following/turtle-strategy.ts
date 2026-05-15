import type { Candle } from '../../types/market';
import type { TradeSignal, StrategyConfig } from '../../types/strategy';
import type { Position } from '../../types/trading';
import type { EventBus } from '../../events/event-bus';
import { BaseStrategy } from '../base-strategy';
import { calculateATR } from '../indicators/atr';

interface TurtleParams {
  period: number;
  atrMultiplier: number;
}

export class TurtleStrategy extends BaseStrategy {
  constructor(config: StrategyConfig, eventBus: EventBus) {
    super(config, eventBus);
  }

  onBar(candle: Candle, history: Candle[], positions: Position[]): TradeSignal[] {
    const params = this.config.params as unknown as TurtleParams;
    const period = params.period || 20;
    const atrMultiplier = params.atrMultiplier || 2;

    const allCandles = [...history, candle];

    if (allCandles.length < period + 1) return [];

    const highs = allCandles.map(c => c.high);
    const lows = allCandles.map(c => c.low);
    const closes = allCandles.map(c => c.close);

    const donchianHigh = Math.max(...highs.slice(-period));
    const donchianLow = Math.min(...lows.slice(-period));

    const atrValues = calculateATR(highs, lows, closes, 14);
    const currentATR = atrValues[atrValues.length - 1] ?? 0;

    const signals: TradeSignal[] = [];
    const existingPosition = positions.find(
      p => p.symbol === candle.symbol && p.strategyId === this.id
    );

    if (candle.close > donchianHigh) {
      if (!existingPosition) {
        const sl = candle.close - currentATR * atrMultiplier;
        const tp = candle.close + currentATR * atrMultiplier * 2;
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'buy',
          type: 'open',
          price: candle.close,
          volume: 0.01,
          sl: sl,
          tp: tp,
          reason: `Turtle buy: price ${candle.close.toFixed(5)} broke above ${period}-day high ${donchianHigh.toFixed(5)}`,
        }));
      }
    } else if (candle.close < donchianLow) {
      if (!existingPosition) {
        const sl = candle.close + currentATR * atrMultiplier;
        const tp = candle.close - currentATR * atrMultiplier * 2;
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'sell',
          type: 'open',
          price: candle.close,
          volume: 0.01,
          sl: sl,
          tp: tp,
          reason: `Turtle sell: price ${candle.close.toFixed(5)} broke below ${period}-day low ${donchianLow.toFixed(5)}`,
        }));
      }
    }

    return signals;
  }
}
