import type { Candle } from '../../types/market';
import type { TradeSignal, StrategyConfig } from '../../types/strategy';
import type { Position } from '../../types/trading';
import type { EventBus } from '../../events/event-bus';
import { BaseStrategy } from '../base-strategy';
import { calculateMACD } from '../indicators/macd';

interface MacdParams {
  fast: number;
  slow: number;
  signal: number;
}

export class MacdStrategy extends BaseStrategy {
  constructor(config: StrategyConfig, eventBus: EventBus) {
    super(config, eventBus);
  }

  onBar(candle: Candle, history: Candle[], positions: Position[]): TradeSignal[] {
    const params = this.config.params as unknown as MacdParams;
    const fast = params.fast || 12;
    const slow = params.slow || 26;
    const signal = params.signal || 9;

    const allCandles = [...history, candle];
    const prices = allCandles.map(c => c.close);

    const result = calculateMACD(prices, fast, slow, signal);

    const macdLine = result.macd;
    const signalLine = result.signal;

    if (macdLine.length < 2 || signalLine.length < 2) return [];

    const currentMACD = macdLine[macdLine.length - 1];
    const prevMACD = macdLine[macdLine.length - 2];
    const currentSignal = signalLine[signalLine.length - 1];
    const prevSignal = signalLine[signalLine.length - 2];

    if (currentMACD === null || prevMACD === null || currentSignal === null || prevSignal === null) {
      return [];
    }

    const isGoldenCross = prevMACD <= prevSignal && currentMACD > currentSignal;
    const isDeathCross = prevMACD >= prevSignal && currentMACD < currentSignal;

    const signals: TradeSignal[] = [];
    const existingPosition = positions.find(
      p => p.symbol === candle.symbol && p.strategyId === this.id
    );

    if (isGoldenCross) {
      if (!existingPosition || existingPosition.direction === 'sell') {
        if (existingPosition) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'sell',
            type: 'close',
            price: candle.close,
            volume: existingPosition.volume,
            reason: 'Close sell before MACD golden cross',
          }));
        }
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'buy',
          type: 'open',
          price: candle.close,
          volume: 0.01,
          reason: 'MACD golden cross: MACD crossed above signal',
        }));
      }
    } else if (isDeathCross) {
      if (!existingPosition || existingPosition.direction === 'buy') {
        if (existingPosition) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'buy',
            type: 'close',
            price: candle.close,
            volume: existingPosition.volume,
            reason: 'Close buy before MACD death cross',
          }));
        }
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'sell',
          type: 'open',
          price: candle.close,
          volume: 0.01,
          reason: 'MACD death cross: MACD crossed below signal',
        }));
      }
    }

    return signals;
  }
}
