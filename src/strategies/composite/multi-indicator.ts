import type { Candle } from '../../types/market';
import type { TradeSignal, StrategyConfig } from '../../types/strategy';
import type { Position } from '../../types/trading';
import type { EventBus } from '../../events/event-bus';
import { BaseStrategy } from '../base-strategy';
import { calculateRSI } from '../indicators/rsi';
import { calculateMA } from '../indicators/ma';
import { calculateMACD } from '../indicators/macd';

interface MultiIndicatorParams {
  maPeriod: number;
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
}

export class MultiIndicatorStrategy extends BaseStrategy {
  constructor(config: StrategyConfig, eventBus: EventBus) {
    super(config, eventBus);
  }

  onBar(candle: Candle, history: Candle[], positions: Position[]): TradeSignal[] {
    const params = this.config.params as unknown as MultiIndicatorParams;
    const maPeriod = params.maPeriod || 20;
    const rsiPeriod = params.rsiPeriod || 14;
    const rsiOverbought = params.rsiOverbought || 70;
    const rsiOversold = params.rsiOversold || 30;

    const allCandles = [...history, candle];
    const prices = allCandles.map(c => c.close);
    const highs = allCandles.map(c => c.high);
    const lows = allCandles.map(c => c.low);

    const macdResult = calculateMACD(prices, 12, 26, 9);

    const rsiValues = calculateRSI(prices, rsiPeriod);
    const maValues = calculateMA(prices, maPeriod);

    const currentRSI = rsiValues[rsiValues.length - 1];
    const currentMA = maValues[maValues.length - 1];
    const currentMACDLine = macdResult.macd[macdResult.macd.length - 1];
    const currentSignal = macdResult.signal[macdResult.signal.length - 1];

    if (currentRSI === null || currentMA === null || currentMACDLine === null || currentSignal === null) {
      return [];
    }

    const signals: TradeSignal[] = [];
    const existingPosition = positions.find(
      p => p.symbol === candle.symbol && p.strategyId === this.id
    );

    let buySignals = 0;
    let sellSignals = 0;

    if (candle.close > currentMA) buySignals++;
    else sellSignals++;

    if (currentRSI < rsiOversold) buySignals++;
    else if (currentRSI > rsiOverbought) sellSignals++;

    if (currentMACDLine > currentSignal) buySignals++;
    else if (currentMACDLine < currentSignal) sellSignals++;

    if (buySignals >= 2) {
      if (!existingPosition || existingPosition.direction === 'sell') {
        if (existingPosition) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'sell',
            type: 'close',
            price: candle.close,
            volume: existingPosition.volume,
            reason: 'Multi-indicator: close sell',
          }));
        }
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'buy',
          type: 'open',
          price: candle.close,
          volume: 0.01,
          reason: `Multi-indicator buy: ${buySignals}/3 indicators bullish`,
        }));
      }
    } else if (sellSignals >= 2) {
      if (!existingPosition || existingPosition.direction === 'buy') {
        if (existingPosition) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'buy',
            type: 'close',
            price: candle.close,
            volume: existingPosition.volume,
            reason: 'Multi-indicator: close buy',
          }));
        }
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'sell',
          type: 'open',
          price: candle.close,
          volume: 0.01,
          reason: `Multi-indicator sell: ${sellSignals}/3 indicators bearish`,
        }));
      }
    }

    return signals;
  }
}
