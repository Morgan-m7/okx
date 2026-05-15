import type { Candle } from '../../types/market';
import type { TradeSignal, StrategyConfig } from '../../types/strategy';
import type { Position } from '../../types/trading';
import type { EventBus } from '../../events/event-bus';
import { BaseStrategy } from '../base-strategy';

interface TickScalperParams {
  profitTarget: number;
  maxHoldingSeconds: number;
}

export class TickScalperStrategy extends BaseStrategy {
  private entryTimestamps: Map<string, number> = new Map();

  constructor(config: StrategyConfig, eventBus: EventBus) {
    super(config, eventBus);
  }

  onInit(): void {
    this.entryTimestamps.clear();
  }

  onBar(candle: Candle, history: Candle[], positions: Position[]): TradeSignal[] {
    const params = this.config.params as unknown as TickScalperParams;
    const profitTarget = params.profitTarget || 3;
    const maxHoldingSeconds = params.maxHoldingSeconds || 60;

    const allCandles = [...history, candle];
    if (allCandles.length < 3) return [];

    const signals: TradeSignal[] = [];
    const existingPosition = positions.find(
      p => p.symbol === candle.symbol && p.strategyId === this.id
    );

    if (existingPosition) {
      const entryTime = this.entryTimestamps.get(existingPosition.id) || Date.now();
      const holdingMs = Date.now() - entryTime;
      const pips = Math.abs(candle.close - existingPosition.openPrice) /
        (candle.symbol === 'XAU/USD' ? 0.01 : 0.0001);

      if (pips >= profitTarget || holdingMs >= maxHoldingSeconds * 1000) {
        signals.push(this.emitSignal({
          symbol: candle.symbol,
          direction: existingPosition.direction,
          type: 'close',
          price: candle.close,
          volume: existingPosition.volume,
          reason: `Tick scalper close: pips ${pips.toFixed(1)}, held ${(holdingMs / 1000).toFixed(0)}s`,
        }));
        this.entryTimestamps.delete(existingPosition.id);
      }
      return signals;
    }

    const prevClose = allCandles[allCandles.length - 2]?.close;
    const currClose = candle.close;
    const tickChange = Math.abs(currClose - prevClose) /
      (candle.symbol === 'XAU/USD' ? 0.01 : 0.0001);

    if (tickChange >= profitTarget * 0.5) {
      const direction = currClose > prevClose ? 'buy' : 'sell';
      const signal = this.emitSignal({
        symbol: candle.symbol,
        direction,
        type: 'open',
        price: candle.close,
        volume: 0.01,
        reason: `Tick scalper ${direction}: tick move ${tickChange.toFixed(1)} pips`,
      });
      signals.push(signal);
    }

    return signals;
  }

  onDestroy(): void {
    this.entryTimestamps.clear();
  }
}
