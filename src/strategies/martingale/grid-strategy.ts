import type { Candle } from '../../types/market';
import type { TradeSignal, StrategyConfig } from '../../types/strategy';
import type { Position } from '../../types/trading';
import type { EventBus } from '../../events/event-bus';
import { BaseStrategy } from '../base-strategy';
import { DEFAULTS } from '../../constants/defaults';

interface GridParams {
  gridCount: number;
  rangePercent: number;
  volumePerGrid: number;
}

export class GridStrategy extends BaseStrategy {
  private lastGridLevels: number[] = [];

  constructor(config: StrategyConfig, eventBus: EventBus) {
    super(config, eventBus);
  }

  onInit(): void {
    this.lastGridLevels = [];
  }

  onBar(candle: Candle, history: Candle[], positions: Position[]): TradeSignal[] {
    const params = this.config.params as unknown as GridParams;
    const gridCount = params.gridCount || 10;
    const rangePercent = params.rangePercent || 2;
    const volumePerGrid = params.volumePerGrid || 0.01;

    const allCandles = [...history, candle];
    const prices = allCandles.map(c => c.close);
    const avgPrice = prices.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, prices.length);

    const halfRange = avgPrice * (rangePercent / 100);
    const gridStep = (halfRange * 2) / gridCount;

    const gridLevels: number[] = [];
    for (let i = 0; i < gridCount; i++) {
      gridLevels.push(avgPrice - halfRange + gridStep * i);
    }

    const signals: TradeSignal[] = [];
    const gridPositions = positions.filter(
      p => p.symbol === candle.symbol && p.strategyId === this.id
    );

    for (const pos of gridPositions) {
      const shouldClose =
        (pos.direction === 'buy' && candle.close >= pos.openPrice + gridStep * 2) ||
        (pos.direction === 'sell' && candle.close <= pos.openPrice - gridStep * 2);

      if (shouldClose) {
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: pos.direction,
          type: 'close',
          price: candle.close,
          volume: pos.volume,
          reason: `Grid take profit at ${candle.close.toFixed(5)}`,
          martingaleLayer: 0,
        }));
      }
    }

    for (let i = 0; i < gridLevels.length; i++) {
      const level = gridLevels[i];
      const hasPositionAtLevel = gridPositions.some(
        p => Math.abs(p.openPrice - level) < gridStep * 0.5
      );

      if (!hasPositionAtLevel) {
        if (candle.close <= level && candle.close > level - gridStep) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'buy',
            type: 'open',
            price: level,
            volume: volumePerGrid,
            reason: `Grid buy at level ${i + 1}: ${level.toFixed(5)}`,
            martingaleLayer: 0,
          }));
        } else if (candle.close >= level && candle.close < level + gridStep) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'sell',
            type: 'open',
            price: level,
            volume: volumePerGrid,
            reason: `Grid sell at level ${i + 1}: ${level.toFixed(5)}`,
            martingaleLayer: 0,
          }));
        }
      }
    }

    this.lastGridLevels = gridLevels;
    return signals;
  }

  onDestroy(): void {
    this.lastGridLevels = [];
  }
}
