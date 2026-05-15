import type { Candle } from '../../types/market';
import type { TradeSignal, StrategyConfig, MartingaleState } from '../../types/strategy';
import type { Position } from '../../types/trading';
import type { EventBus } from '../../events/event-bus';
import { ClassicMartingaleStrategy } from './classic-martingale';
import { DEFAULTS } from '../../constants/defaults';
import { calculateADX } from '../indicators/adx';

interface FibonacciMartingaleParams {
  baseVolume: number;
  maxLayers: number;
  takeProfitPips: number;
}

export class FibonacciMartingaleStrategy extends ClassicMartingaleStrategy {
  constructor(config: StrategyConfig, eventBus: EventBus) {
    super(config, eventBus);
  }

  onInit(): void {
    const params = this.config.params as unknown as FibonacciMartingaleParams;
    const fibSequence = [1, 2, 3, 5, 8];
    this.mgState = {
      layer: 0,
      baseVolume: params.baseVolume || 0.01,
      currentVolume: params.baseVolume || 0.01,
      sequence: fibSequence,
      totalLoss: 0,
      consecutiveLosses: 0,
      consecutiveWins: 0,
      adxValue: 0,
    };
  }

  onBar(candle: Candle, history: Candle[], positions: Position[]): TradeSignal[] {
    const params = this.config.params as unknown as FibonacciMartingaleParams;
    const baseVolume = params.baseVolume || 0.01;
    const maxLayers = Math.min(params.maxLayers || 5, DEFAULTS.maxMartingaleLayers);
    const takeProfitPips = params.takeProfitPips || 50;

    const fibSeq = [1, 2, 3, 5, 8];
    this.mgState.baseVolume = baseVolume;
    this.mgState.sequence = fibSeq;

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

    if (currentADX < DEFAULTS.adxThreshold && martingalePositions.length === 0) {
      return signals;
    }

    if (martingalePositions.length > 0) {
      const totalPips = martingalePositions.reduce((sum, p) => sum + p.pips, 0);

      if (totalPips >= takeProfitPips) {
        const closeSignals = martingalePositions.map(pos =>
          this.emitSignal({
            symbol: candle.symbol,
            direction: pos.direction,
            type: 'close',
            price: candle.close,
            volume: pos.volume,
            reason: `Fibonacci martingale TP: total pips ${totalPips.toFixed(1)} >= ${takeProfitPips}`,
            martingaleLayer: pos.martingaleLayer,
          })
        );
        signals.push(...closeSignals);
        this.resetMartingaleState();
        return signals;
      }

      if (currentADX >= DEFAULTS.adxThreshold && this.mgState.layer < maxLayers) {
        const nextLayer = this.mgState.layer + 1;
        const fibMultiplier = fibSeq[Math.min(nextLayer - 1, fibSeq.length - 1)];
        const nextVolume = baseVolume * fibMultiplier;

        this.mgState.layer = nextLayer;
        this.mgState.currentVolume = nextVolume;

        const direction = martingalePositions[0].direction;
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction,
          type: 'open',
          price: candle.close,
          volume: nextVolume,
          reason: `Fibonacci martingale layer ${nextLayer}: vol ${nextVolume.toFixed(2)} (fib ${fibMultiplier}x)`,
          martingaleLayer: nextLayer,
        }));
      }
    } else {
      if (currentADX < DEFAULTS.adxThreshold) return signals;

      this.resetMartingaleState();
      this.mgState.currentVolume = baseVolume;
      this.mgState.layer = 1;

      signals.push(this.emitSignal({
        symbol: candle.symbol,
        direction: 'buy',
        type: 'open',
        price: candle.close,
        volume: baseVolume,
        reason: `Fibonacci martingale initial: vol ${baseVolume.toFixed(2)}, layer 1`,
        martingaleLayer: 1,
      }));
    }

    return signals;
  }

  protected resetMartingaleState(): void {
    const params = this.config.params as unknown as FibonacciMartingaleParams;
    this.mgState = {
      layer: 0,
      baseVolume: params.baseVolume || 0.01,
      currentVolume: params.baseVolume || 0.01,
      sequence: [1, 2, 3, 5, 8],
      totalLoss: 0,
      consecutiveLosses: 0,
      consecutiveWins: 0,
      adxValue: 0,
    };
  }
}
