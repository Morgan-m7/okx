import type { Candle } from '../../types/market';
import type { TradeSignal, StrategyConfig } from '../../types/strategy';
import type { Position } from '../../types/trading';
import type { EventBus } from '../../events/event-bus';
import { BaseStrategy } from '../base-strategy';
import { calculateRSI } from '../indicators/rsi';

interface RsiParams {
  period: number;
  overbought: number;
  oversold: number;
}

export class RsiStrategy extends BaseStrategy {
  constructor(config: StrategyConfig, eventBus: EventBus) {
    super(config, eventBus);
  }

  onBar(candle: Candle, history: Candle[], positions: Position[]): TradeSignal[] {
    const params = this.config.params as unknown as RsiParams;
    const period = params.period || 14;
    const overbought = params.overbought || 70;
    const oversold = params.oversold || 30;

    const allCandles = [...history, candle];
    const prices = allCandles.map(c => c.close);

    const rsiValues = calculateRSI(prices, period);
    const currentRSI = rsiValues[rsiValues.length - 1];
    const prevRSI = rsiValues[rsiValues.length - 2];

    if (currentRSI === null || prevRSI === null) return [];

    const signals: TradeSignal[] = [];
    const existingPosition = positions.find(
      p => p.symbol === candle.symbol && p.strategyId === this.id
    );

    if (currentRSI > overbought && prevRSI <= overbought) {
      if (!existingPosition || existingPosition.direction === 'buy') {
        if (existingPosition) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'buy',
            type: 'close',
            price: candle.close,
            volume: existingPosition.volume,
            reason: `RSI overbought: ${currentRSI.toFixed(1)} > ${overbought}, close buy`,
          }));
        }
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'sell',
          type: 'open',
          price: candle.close,
          volume: 0.01,
          reason: `RSI overbought sell: RSI(${currentRSI.toFixed(1)}) > ${overbought}`,
        }));
      }
    } else if (currentRSI < oversold && prevRSI >= oversold) {
      if (!existingPosition || existingPosition.direction === 'sell') {
        if (existingPosition) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'sell',
            type: 'close',
            price: candle.close,
            volume: existingPosition.volume,
            reason: `RSI oversold: ${currentRSI.toFixed(1)} < ${oversold}, close sell`,
          }));
        }
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'buy',
          type: 'open',
          price: candle.close,
          volume: 0.01,
          reason: `RSI oversold buy: RSI(${currentRSI.toFixed(1)}) < ${oversold}`,
        }));
      }
    }

    return signals;
  }
}
