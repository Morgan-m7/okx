import type { Candle, SymbolPair } from '../../types/market';
import type { TradeSignal, StrategyConfig, MartingaleState } from '../../types/strategy';
import type { Position } from '../../types/trading';
import type { EventBus } from '../../events/event-bus';
import { BaseStrategy } from '../base-strategy';
import { calculateADX } from '../indicators/adx';
import { DEFAULTS } from '../../constants/defaults';

interface ClassicMartingaleParams {
  baseVolume: number;
  multiplier: number;
  maxLayers: number;
  takeProfitPips: number;
}

export class ClassicMartingaleStrategy extends BaseStrategy {
  protected mgState: MartingaleState;

  constructor(config: StrategyConfig, eventBus: EventBus) {
    super(config, eventBus);
    this.mgState = {
      layer: 0,
      baseVolume: 0.01,
      currentVolume: 0.01,
      sequence: [1, 2, 4, 8, 16],
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
    const params = this.config.params as unknown as ClassicMartingaleParams;
    const baseVolume = params.baseVolume || 0.01;
    const multiplier = params.multiplier || 2;
    const maxLayers = Math.min(params.maxLayers || 5, DEFAULTS.maxMartingaleLayers);
    const takeProfitPips = params.takeProfitPips || 50;

    this.mgState.baseVolume = baseVolume;
    this.mgState.sequence = Array.from({ length: maxLayers }, (_, i) => Math.pow(multiplier, i));

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

    if (martingalePositions.length > 0) {
      const totalProfit = martingalePositions.reduce((sum, p) => sum + p.profit, 0);
      const totalPips = martingalePositions.reduce((sum, p) => sum + p.pips, 0);

      if (totalPips >= takeProfitPips) {
        const allSignals = martingalePositions.map(pos =>
          this.emitSignal({
            symbol: candle.symbol,
            direction: pos.direction,
            type: 'close',
            price: candle.close,
            volume: pos.volume,
            reason: `Martingale take profit: total pips ${totalPips.toFixed(1)} >= ${takeProfitPips}`,
            martingaleLayer: pos.martingaleLayer,
          })
        );
        signals.push(...allSignals);
        this.resetMartingaleState();
        return signals;
      }

      if (currentADX < DEFAULTS.adxThreshold) {
        return signals;
      }

      if (this.mgState.layer < maxLayers) {
        const nextLayer = this.mgState.layer + 1;
        const nextVolume = baseVolume * Math.pow(multiplier, nextLayer - 1);

        this.mgState.layer = nextLayer;
        this.mgState.currentVolume = nextVolume;

        const avgPrice = martingalePositions.reduce((sum, p) => sum + p.openPrice, 0) / martingalePositions.length;
        const firstPos = martingalePositions[0];
        const direction = firstPos?.direction || 'buy';

        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction,
          type: 'open',
          price: candle.close,
          volume: nextVolume,
          reason: `Martingale layer ${nextLayer}: volume ${nextVolume.toFixed(2)} (${multiplier}x)`,
          martingaleLayer: nextLayer,
        }));

        this.mgState.totalLoss += Math.abs(totalProfit);
        this.mgState.consecutiveLosses++;
        this.mgState.consecutiveWins = 0;
      }
    } else {
      if (currentADX < DEFAULTS.adxThreshold) {
        return signals;
      }

      this.resetMartingaleState();
      this.mgState.currentVolume = baseVolume;
      this.mgState.layer = 1;

      signals.push(this.emitSignal({
        symbol: candle.symbol,
        direction: 'buy',
        type: 'open',
        price: candle.close,
        volume: baseVolume,
        reason: `Martingale initial position: volume ${baseVolume.toFixed(2)}, layer 1`,
        martingaleLayer: 1,
      }));
    }

    return signals;
  }

  onDestroy(): void {
    this.resetMartingaleState();
  }

  protected resetMartingaleState(): void {
    const params = this.config.params as unknown as ClassicMartingaleParams;
    this.mgState = {
      layer: 0,
      baseVolume: params.baseVolume || 0.01,
      currentVolume: params.baseVolume || 0.01,
      sequence: [1, 2, 4, 8, 16],
      totalLoss: 0,
      consecutiveLosses: 0,
      consecutiveWins: 0,
      adxValue: 0,
    };
  }
}
