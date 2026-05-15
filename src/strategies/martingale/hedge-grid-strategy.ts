import type { Candle } from '../../types/market';
import type { TradeSignal, StrategyConfig } from '../../types/strategy';
import type { Position } from '../../types/trading';
import type { EventBus } from '../../events/event-bus';
import { BaseStrategy } from '../base-strategy';

interface HedgeGridParams {
  gridCount: number;
  rangePercent: number;
  volumePerGrid: number;
  lockThreshold: number;
}

export class HedgeGridStrategy extends BaseStrategy {
  constructor(config: StrategyConfig, eventBus: EventBus) {
    super(config, eventBus);
  }

  onBar(candle: Candle, history: Candle[], positions: Position[]): TradeSignal[] {
    const params = this.config.params as unknown as HedgeGridParams;
    const gridCount = params.gridCount || 8;
    const rangePercent = params.rangePercent || 3;
    const volumePerGrid = params.volumePerGrid || 0.01;
    const lockThreshold = params.lockThreshold || 50;

    const allCandles = [...history, candle];
    const prices = allCandles.map(c => c.close);
    const avgPrice = prices.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, prices.length);

    const halfRange = avgPrice * (rangePercent / 100);
    const gridStep = (halfRange * 2) / gridCount;

    const signals: TradeSignal[] = [];
    const hedgePositions = positions.filter(
      p => p.symbol === candle.symbol && p.strategyId === this.id
    );

    const buyPositions = hedgePositions.filter(p => p.direction === 'buy');
    const sellPositions = hedgePositions.filter(p => p.direction === 'sell');
    const totalBuyVolume = buyPositions.reduce((s, p) => s + p.volume, 0);
    const totalSellVolume = sellPositions.reduce((s, p) => s + p.volume, 0);

    const buyValue = buyPositions.reduce((s, p) => s + p.openPrice * p.volume, 0);
    const sellValue = sellPositions.reduce((s, p) => s + p.openPrice * p.volume, 0);
    const avgBuyPrice = totalBuyVolume > 0 ? buyValue / totalBuyVolume : 0;
    const avgSellPrice = totalSellVolume > 0 ? sellValue / totalSellVolume : 0;

    if (candle.close > avgPrice + halfRange) {
      for (const pos of buyPositions) {
        const pips = Math.abs(candle.close - pos.openPrice) / (candle.symbol === 'XAU/USD' ? 0.01 : 0.0001);
        if (pips >= lockThreshold) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'buy',
            type: 'close',
            price: candle.close,
            volume: pos.volume,
            reason: `Hedge grid: close buy at ${candle.close.toFixed(5)}, pips ${pips.toFixed(1)}`,
            martingaleLayer: 0,
          }));
        }
      }
    }

    if (candle.close < avgPrice - halfRange) {
      for (const pos of sellPositions) {
        const pips = Math.abs(pos.openPrice - candle.close) / (candle.symbol === 'XAU/USD' ? 0.01 : 0.0001);
        if (pips >= lockThreshold) {
          signals.push(this.emitSignal({
            symbol: candle.symbol,
            direction: 'sell',
            type: 'close',
            price: candle.close,
            volume: pos.volume,
            reason: `Hedge grid: close sell at ${candle.close.toFixed(5)}, pips ${pips.toFixed(1)}`,
            martingaleLayer: 0,
          }));
        }
      }
    }

    for (let i = 0; i < gridCount; i++) {
      const level = avgPrice - halfRange + gridStep * i;

      const hasBuyNear = buyPositions.some(
        p => Math.abs(p.openPrice - level) < gridStep * 0.3
      );
      const hasSellNear = sellPositions.some(
        p => Math.abs(p.openPrice - level) < gridStep * 0.3
      );

      if (!hasBuyNear && candle.close <= level + gridStep * 0.3 && candle.close >= level - gridStep * 0.3) {
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'buy',
          type: 'open',
          price: level,
          volume: volumePerGrid,
          reason: `Hedge grid buy at ${level.toFixed(5)} (level ${i + 1})`,
          martingaleLayer: 0,
        }));
      }

      if (!hasSellNear && candle.close <= level + gridStep * 0.3 && candle.close >= level - gridStep * 0.3) {
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: 'sell',
          type: 'open',
          price: level,
          volume: volumePerGrid,
          reason: `Hedge grid sell at ${level.toFixed(5)} (level ${i + 1})`,
          martingaleLayer: 0,
        }));
      }
    }

    return signals;
  }
}
