import type { Account, Position, TradeRecord, Direction, CloseReason } from '../types/trading';
import type { TradeSignal, SymbolPair } from '../types';
import type { Candle } from '../types/market';
import type { EventBus } from '../events/event-bus';
import { EventType } from '../types/events';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULTS } from '../constants/defaults';
import { SYMBOL_BASE_PIPS } from '../constants/symbols';

export class PaperTradingEngine {
  private account: Account;
  private positions: Map<string, Position> = new Map();
  private tradeHistory: TradeRecord[] = [];
  private eventBus: EventBus;
  private currentPrices: Map<string, number> = new Map();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.account = this.createDefaultAccount();
  }

  reset(balance?: number): void {
    this.positions.clear();
    this.tradeHistory = [];
    this.currentPrices.clear();
    this.account = balance
      ? {
          id: undefined,
          name: '模拟账户',
          type: 'demo',
          broker: 'Simulated',
          balance: balance,
          equity: balance,
          marginUsed: 0,
          marginFree: balance,
          marginLevel: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
      : this.createDefaultAccount();
  }

  getAccount(): Account {
    return { ...this.account };
  }

  getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  getPosition(id: string): Position | undefined {
    return this.positions.get(id);
  }

  getTradeHistory(): TradeRecord[] {
    return [...this.tradeHistory];
  }

  openPosition(signal: TradeSignal): Position {
    const margin = this.calculateMargin(signal.volume, signal.price);
    if (margin > this.account.marginFree) {
      throw new Error(`INSUFFICIENT_MARGIN: Required ${margin.toFixed(2)}, Available ${this.account.marginFree.toFixed(2)}`);
    }

    const position: Position = {
      id: uuidv4(),
      symbol: signal.symbol,
      direction: signal.direction,
      volume: signal.volume,
      openPrice: signal.price,
      currentPrice: signal.price,
      sl: signal.sl ?? null,
      tp: signal.tp ?? null,
      profit: 0,
      pips: 0,
      strategyId: signal.strategyId,
      martingaleLayer: signal.martingaleLayer ?? 0,
      openTime: Date.now(),
    };

    this.positions.set(position.id, position);
    this.account.marginUsed += margin;
    this.account.marginFree = this.account.balance - this.account.marginUsed;
    this.account.marginLevel = this.account.marginUsed > 0
      ? (this.account.equity / this.account.marginUsed) * 100
      : 0;
    this.account.updatedAt = Date.now();

    this.eventBus.emit(EventType.POSITION_OPENED, { position });
    this.eventBus.emit(EventType.ACCOUNT_UPDATED, { account: this.account });

    return position;
  }

  closePosition(positionId: string, closePrice: number, reason: CloseReason): TradeRecord | null {
    const position = this.positions.get(positionId);
    if (!position) return null;

    const pips = this.calculatePips(
      position.symbol,
      position.openPrice,
      closePrice,
      position.direction
    );
    const profit = this.calculateProfit(position.symbol, position.volume, pips);

    const trade: TradeRecord = {
      id: uuidv4(),
      symbol: position.symbol,
      direction: position.direction,
      volume: position.volume,
      openPrice: position.openPrice,
      closePrice,
      openTime: position.openTime,
      closeTime: Date.now(),
      profit: Math.round(profit * 100) / 100,
      pips: Math.round(pips * 10) / 10,
      strategyId: position.strategyId,
      closeReason: reason,
      martingaleLayer: position.martingaleLayer,
    };

    this.positions.delete(positionId);
    this.tradeHistory.push(trade);

    const margin = this.calculateMargin(position.volume, position.openPrice);
    this.account.marginUsed = Math.max(0, this.account.marginUsed - margin);
    this.account.balance = Math.round((this.account.balance + profit) * 100) / 100;
    this.account.equity = this.account.balance - this.account.marginUsed;
    this.account.marginFree = Math.max(0, this.account.balance - this.account.marginUsed);
    this.account.marginLevel = this.account.marginUsed > 0
      ? (this.account.equity / this.account.marginUsed) * 100
      : 0;
    this.account.updatedAt = Date.now();

    this.eventBus.emit(EventType.POSITION_CLOSED, { trade });
    this.eventBus.emit(EventType.ACCOUNT_UPDATED, { account: this.account });

    return trade;
  }

  updatePositionSLTP(positionId: string, sl: number | null, tp: number | null): void {
    const position = this.positions.get(positionId);
    if (!position) return;

    if (sl !== null && sl !== undefined) position.sl = sl;
    if (tp !== null && tp !== undefined) position.tp = tp;

    this.eventBus.emit(EventType.POSITION_UPDATED, { position: { ...position } });
  }

  checkSLTP(candle: Candle): void {
    const positionsToClose: { id: string; reason: CloseReason }[] = [];

    for (const [, position] of this.positions) {
      if (position.symbol !== candle.symbol) continue;

      if (position.direction === 'buy') {
        if (position.sl !== null && candle.low <= position.sl) {
          positionsToClose.push({ id: position.id, reason: 'sl' });
        } else if (position.tp !== null && candle.high >= position.tp) {
          positionsToClose.push({ id: position.id, reason: 'tp' });
        }
      } else {
        if (position.sl !== null && candle.high >= position.sl) {
          positionsToClose.push({ id: position.id, reason: 'sl' });
        } else if (position.tp !== null && candle.low <= position.tp) {
          positionsToClose.push({ id: position.id, reason: 'tp' });
        }
      }
    }

    for (const pc of positionsToClose) {
      const pos = this.positions.get(pc.id);
      if (pos) {
        const closePrice = pc.reason === 'sl' ? (pos.sl ?? candle.close) : (pos.tp ?? candle.close);
        this.eventBus.emit(EventType.SL_TP_TRIGGERED, { positionId: pc.id, reason: pc.reason as 'sl' | 'tp' });
        this.closePosition(pc.id, closePrice, pc.reason);
      }
    }
  }

  updatePrices(candle: Candle): void {
    this.currentPrices.set(candle.symbol, candle.close);

    for (const [, position] of this.positions) {
      if (position.symbol !== candle.symbol) continue;

      position.currentPrice = candle.close;
      this.recalcPositionPnL(position);
    }
    this.recalcAccount();
  }

  /** 更新单个持仓价格（基于实时报价） */
  updatePositionPrice(positionId: string, price: number): void {
    const position = this.positions.get(positionId);
    if (!position) return;
    position.currentPrice = price;
    this.recalcPositionPnL(position);
    this.recalcAccount();
  }

  /** 计算单个持仓 PnL */
  private recalcPositionPnL(position: import('../types/trading').Position): void {
    const pips = this.calculatePips(
      position.symbol,
      position.openPrice,
      position.currentPrice,
      position.direction
    );
    position.pips = Math.round(pips * 10) / 10;
    position.profit = Math.round(
      this.calculateProfit(position.symbol, position.volume, pips) * 100
    ) / 100;
  }

  /** 重新计算账户 */
  private recalcAccount(): void {
    const totalPnL = Array.from(this.positions.values()).reduce((s, p) => s + p.profit, 0);
    this.account.equity = Math.round((this.account.balance + totalPnL) * 100) / 100;
    this.account.marginFree = Math.max(0, this.account.equity - this.account.marginUsed);
    this.account.marginLevel = this.account.marginUsed > 0
      ? (this.account.equity / this.account.marginUsed) * 100
      : 0;
    this.account.updatedAt = Date.now();
  }

  private calculateMargin(volume: number, price: number): number {
    const notional = volume * 100000 * price;
    return notional / DEFAULTS.defaultLeverage;
  }

  private calculatePips(
    symbol: SymbolPair,
    openPrice: number,
    closePrice: number,
    direction: Direction
  ): number {
    const basePip = SYMBOL_BASE_PIPS[symbol];
    const diff = direction === 'buy'
      ? closePrice - openPrice
      : openPrice - closePrice;
    return diff / basePip;
  }

  private calculateProfit(symbol: SymbolPair, volume: number, pips: number): number {
    const pipValue = symbol.includes('BTC') ? 1 : symbol.includes('ETH') ? 0.1 : symbol.includes('SOL') ? 0.01 : symbol.includes('XRP') ? 0.0001 : 0.01;
    return volume * 100000 * pips * pipValue;
  }

  private createDefaultAccount(): Account {
    const now = Date.now();
    return {
      name: '模拟账户',
      type: 'demo',
      broker: 'Simulated',
      balance: DEFAULTS.initialBalance,
      equity: DEFAULTS.initialBalance,
      marginUsed: 0,
      marginFree: DEFAULTS.initialBalance,
      marginLevel: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  destroy(): void {
    this.positions.clear();
    this.tradeHistory = [];
  }
}
