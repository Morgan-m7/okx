import db from './index';
import type { TradeRecord, SymbolPair, CloseReason } from '../types';

class TradeRepo {
  async getAll(): Promise<TradeRecord[]> {
    return db.tradeHistory.orderBy('closeTime').reverse().toArray();
  }

  async getById(id: string): Promise<TradeRecord | undefined> {
    return db.tradeHistory.get(id);
  }

  async getBySymbol(symbol: SymbolPair): Promise<TradeRecord[]> {
    return db.tradeHistory.where('symbol').equals(symbol).reverse().toArray();
  }

  async getByStrategyId(strategyId: string): Promise<TradeRecord[]> {
    return db.tradeHistory.where('strategyId').equals(strategyId).reverse().toArray();
  }

  async getByCloseReason(reason: CloseReason): Promise<TradeRecord[]> {
    return db.tradeHistory.where('closeReason').equals(reason).toArray();
  }

  async getByDateRange(startTime: number, endTime: number): Promise<TradeRecord[]> {
    return db.tradeHistory
      .where('closeTime')
      .between(startTime, endTime)
      .reverse()
      .toArray();
  }

  async create(trade: TradeRecord): Promise<string> {
    await db.tradeHistory.add(trade);
    return trade.id;
  }

  async delete(id: string): Promise<void> {
    await db.tradeHistory.delete(id);
  }

  async deleteAll(): Promise<void> {
    await db.tradeHistory.clear();
  }

  async count(): Promise<number> {
    return db.tradeHistory.count();
  }
}

export const tradeRepo = new TradeRepo();
