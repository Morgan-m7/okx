import type { Candle } from '../../types/market';
import type { TradeSignal, StrategyConfig, MartingaleState } from '../../types/strategy';
import type { Position } from '../../types/trading';
import type { EventBus } from '../../events/event-bus';
import { BaseStrategy } from '../base-strategy';
import { calculateADX } from '../indicators/adx';
import { DEFAULTS } from '../../constants/defaults';

interface AntiMartingaleParams {
  baseVolume: number;
  addRatio: number;
  drawdownStopPercent: number;
}

export class AntiMartingaleStrategy extends BaseStrategy {
  protected mgState: MartingaleState;

  constructor(config: StrategyConfig, eventBus: EventBus) {
    super(config, eventBus);
    this.mgState = {
      layer: 0,
      baseVolume: 0.01,
      currentVolume: 0.01,
      sequence: [1, 1.5, 2.25, 3.375, 5.0625],
      totalLoss: 0,
      consecutiveLosses: 0,
      consecutiveWins: 0,
      adxValue: 0,
    };
  }

  onInit(): void {
    this.resetMartingaleState();
  }

  onBar(candle: Candle, history: Candle[], positions: Position[]): TradeSignal[] {
    const params = this.config.params as unknown as AntiMartingaleParams;
    const baseVolume = params.baseVolume || 0.01;
    const addRatio = params.addRatio || 1.5;
    const drawdownStopPercent = params.drawdownStopPercent || 15;

    const maxLayers = DEFAULTS.maxMartingaleLayers;

    const allCandles = [...history, candle];
    const highs = allCandles.map(c => c.high);
    const lows = allCandles.map(c => c.low);
    const closes = allCandles.map(c => c.close);

    const adxValues = calculateADX(highs, lows, closes, 14);
    const currentADX = adxValues[adxValues.length - 1] ?? 0;
    this.mgState.adxValue = currentADX;

    const signals: TradeSignal[] = [];
    const martingalePositions = positions.filter(
      p => p.symbol === candle.symbol && p.strategyId === this.id
    );

    const initialBalance = 10000;
    const totalProfit = martingalePositions.reduce((sum, p) => sum + p.profit, 0);
    const drawdownPercent = Math.abs(Math.min(0, totalProfit)) / initialBalance * 100;

    if (drawdownPercent >= drawdownStopPercent) {
      const closeSignals = martingalePositions.map(pos =>
        this.emitSignal({
          symbol: candle.symbol,
          direction: pos.direction,
          type: 'close',
          price: candle.close,
          volume: pos.volume,
          reason: `Anti-martingale stop: drawdown ${drawdownPercent.toFixed(1)}% >= ${drawdownStopPercent}%`,
          martingaleLayer: pos.martingaleLayer,
        })
      );
      signals.push(...closeSignals);
      this.resetMartingaleState();
      return signals;
    }

    if (currentADX < DEFAULTS.adxThreshold) {
      return signals;
    }

    if (martingalePositions.length > 0) {
      const avgProfit = totalProfit / martingalePositions.length;

      if (avgProfit > 0 && this.mgState.layer < maxLayers) {
        this.mgState.consecutiveWins++;
        this.mgState.consecutiveLosses = 0;

        if (this.mgState.consecutiveWins >= 2) {
          const nextLayer = this.mgState.layer + 1;
          const nextVolume = baseVolume * Math.pow(addRatio, nextLayer);

          this.mgState.layer = nextLayer;
          this.mgState.currentVolume = nextVolume;

          const direction = martingalePositions[0].direction;
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction,
            type: 'open',
            price: candle.close,
            volume: nextVolume,
            reason: `Anti-martingale add: layer ${nextLayer}, vol ${nextVolume.toFixed(2)} (${addRatio}x)`,
            martingaleLayer: nextLayer,
          }));
        }
      }
    } else {
      this.resetMartingaleState();
      this.mgState.currentVolume = baseVolume;
      this.mgState.layer = 1;

      signals.push(this.emitSignal({
        symbol: candle.symbol,
        direction: 'buy',
        type: 'open',
        price: candle.close,
        volume: baseVolume,
        reason: `Anti-martingale initial: vol ${baseVolume.toFixed(2)}`,
        martingaleLayer: 1,
      }));
    }

    return signals;
  }

  onDestroy(): void {
    this.resetMartingaleState();
  }

  protected resetMartingaleState(): void {
    const params = this.config.params as unknown as AntiMartingaleParams;
    this.mgState = {
      layer: 0,
      baseVolume: params.baseVolume || 0.01,
      currentVolume: params.baseVolume || 0.01,
      sequence: [1, 1.5, 2.25, 3.375, 5.0625],
      totalLoss: 0,
      consecutiveLosses: 0,
      consecutiveWins: 0,
      adxValue: 0,
    };
  }
}
