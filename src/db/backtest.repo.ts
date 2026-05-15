import db from './index';
import type { BacktestResult } from '../types/backtest';
import type { SymbolPair, Timeframe } from '../types/market';

class BacktestRepo {
  async getAll(): Promise<BacktestResult[]> {
    return db.backtestResults.orderBy('createdAt').reverse().toArray();
  }

  async getById(id: string): Promise<BacktestResult | undefined> {
    return db.backtestResults.get(id);
  }

  async getByStrategyId(strategyId: string): Promise<BacktestResult[]> {
    return db.backtestResults.where('strategyId').equals(strategyId).reverse().toArray();
  }

  async getBySymbol(symbol: SymbolPair): Promise<BacktestResult[]> {
    return db.backtestResults.where('symbol').equals(symbol).reverse().toArray();
  }

  async create(result: BacktestResult): Promise<string> {
    await db.backtestResults.add(result);
    return result.id;
  }

  async delete(id: string): Promise<void> {
    await db.backtestResults.delete(id);
  }

  async deleteAll(): Promise<void> {
    await db.backtestResults.clear();
  }
}

export const backtestRepo = new BacktestRepo();
