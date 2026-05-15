import type { Candle, Timeframe } from '../../types/market';
import type { TradeSignal, StrategyConfig } from '../../types/strategy';
import type { Position } from '../../types/trading';
import type { EventBus } from '../../events/event-bus';
import { BaseStrategy } from '../base-strategy';
import { calculateMA } from '../indicators/ma';
import { calculateRSI } from '../indicators/rsi';
import { calculateMACD } from '../indicators/macd';
import { TIMEFRAME_MINUTES } from '../../constants/timeframes';

interface MultiTimeframeParams {
  largeTF: Timeframe;
  mediumTF: Timeframe;
  smallTF: Timeframe;
  maPeriod: number;
}

export class MultiTimeframeStrategy extends BaseStrategy {
  constructor(config: StrategyConfig, eventBus: EventBus) {
    super(config, eventBus);
  }

  onBar(candle: Candle, history: Candle[], positions: Position[]): TradeSignal[] {
    const params = this.config.params as unknown as MultiTimeframeParams;
    const largeTF = params.largeTF || 'H4';
    const mediumTF = params.mediumTF || 'H1';
    const maPeriod = params.maPeriod || 20;

    const allCandles = [...history, candle];
    if (allCandles.length < maPeriod * 3) return [];

    const prices = allCandles.map(c => c.close);
    const maValues = calculateMA(prices, maPeriod);

    const currentMA = maValues[maValues.length - 1];
    if (currentMA === null) return [];

    const largeTFMinutes = TIMEFRAME_MINUTES[largeTF];
    const mediumTFMinutes = TIMEFRAME_MINUTES[mediumTF];

    const largeTFCandles: Candle[] = [];
    const mediumTFCandles: Candle[] = [];
    const currentTFMinutes = TIMEFRAME_MINUTES[candle.timeframe];

    for (const c of allCandles) {
      if (c.timestamp % (largeTFMinutes * 60000) === 0) {
        largeTFCandles.push(c);
      }
      if (c.timestamp % (mediumTFMinutes * 60000) === 0) {
        mediumTFCandles.push(c);
      }
    }

    const signals: TradeSignal[] = [];
    const existingPosition = positions.find(
      p => p.symbol === candle.symbol && p.strategyId === this.id
    );

    let trendDirection: 'up' | 'down' | 'neutral' = 'neutral';

    if (largeTFCandles.length >= 2) {
      const largeCloses = largeTFCandles.map(c => c.close);
      const largeMA = calculateMA(largeCloses, Math.min(maPeriod, largeCloses.length));
      const lastLargeMA = largeMA[largeMA.length - 1];

      if (lastLargeMA !== null && largeCloses[largeCloses.length - 1] > lastLargeMA) {
        trendDirection = 'up';
      } else if (lastLargeMA !== null) {
        trendDirection = 'down';
      }
    }

    if (trendDirection === 'up') {
      const mediumCloses = mediumTFCandles.map(c => c.close);
      const rsiValues = calculateRSI(mediumCloses, 14);
      const currentRSI = rsiValues[rsiValues.length - 1];

      if (currentRSI !== null && currentRSI > 30 && currentRSI < 70) {
        const rsiPrev = rsiValues[rsiValues.length - 2];
        if (rsiPrev !== null && currentRSI > rsiPrev) {
          if (!existingPosition) {
            signals.push(this.emitSignal({
              symbol: candle.symbol,
              direction: 'buy',
              type: 'open',
              price: candle.close,
              volume: 0.01,
              reason: `Multi-TF buy: ${largeTF} uptrend, ${mediumTF} RSI confirms`,
            }));
          }
        }
      }
    } else if (trendDirection === 'down') {
      const mediumCloses = mediumTFCandles.map(c => c.close);
      const rsiValues = calculateRSI(mediumCloses, 14);
      const currentRSI = rsiValues[rsiValues.length - 1];

      if (currentRSI !== null && currentRSI < 70 && currentRSI > 30) {
        const rsiPrev = rsiValues[rsiValues.length - 2];
        if (rsiPrev !== null && currentRSI < rsiPrev) {
          if (!existingPosition) {
            signals.push(this.emitSignal({
              symbol: candle.symbol,
              direction: 'sell',
              type: 'open',
              price: candle.close,
              volume: 0.01,
              reason: `Multi-TF sell: ${largeTF} downtrend, ${mediumTF} RSI confirms`,
            }));
          }
        }
      }
    }

    if (existingPosition) {
      const macdResult = calculateMACD(prices, 12, 26, 9);
      const len = macdResult.histogram.length;
      const histCurrent = macdResult.histogram[len - 1];
      const histPrev = macdResult.histogram[len - 2];

      if (histCurrent !== null && histPrev !== null) {
        if (existingPosition.direction === 'buy' && histCurrent < 0 && histCurrent < histPrev) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'buy',
            type: 'close',
            price: candle.close,
            volume: existingPosition.volume,
            reason: 'Multi-TF exit: MACD histogram weakening in uptrend',
          }));
        } else if (existingPosition.direction === 'sell' && histCurrent > 0 && histCurrent > histPrev) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'sell',
            type: 'close',
            price: candle.close,
            volume: existingPosition.volume,
            reason: 'Multi-TF exit: MACD histogram weakening in downtrend',
          }));
        }
      }
    }

    return signals;
  }
}
