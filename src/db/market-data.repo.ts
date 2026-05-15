import db from './index';
import type { Candle, SymbolPair, Timeframe } from '../types/market';

class MarketDataRepo {
  async getBySymbolAndTimeframe(
    symbol: SymbolPair,
    timeframe: Timeframe,
    limit?: number
  ): Promise<Candle[]> {
    let query = db.marketData
      .where('[symbol+timeframe+timestamp]')
      .between([symbol, timeframe, 0], [symbol, timeframe, Date.now()]);

    if (limit) {
      const results = await query.reverse().limit(limit).toArray();
      return results.reverse();
    }
    return query.toArray();
  }

  async getByDateRange(
    symbol: SymbolPair,
    timeframe: Timeframe,
    startDate: number,
    endDate: number
  ): Promise<Candle[]> {
    return db.marketData
      .where('[symbol+timeframe+timestamp]')
      .between([symbol, timeframe, startDate], [symbol, timeframe, endDate])
      .toArray();
  }

  async bulkPut(candles: Candle[]): Promise<void> {
    await db.marketData.bulkPut(candles);
  }

  async bulkAdd(candles: Candle[]): Promise<void> {
    await db.marketData.bulkAdd(candles);
  }

  async count(symbol: SymbolPair, timeframe: Timeframe): Promise<number> {
    return db.marketData
      .where('[symbol+timeframe+timestamp]')
      .between([symbol, timeframe, 0], [symbol, timeframe, Date.now()])
      .count();
  }

  async deleteBySymbol(symbol: SymbolPair): Promise<void> {
    const candles = await db.marketData.where('symbol').equals(symbol).toArray();
    await db.marketData.bulkDelete(candles.map(c => [c.symbol, c.timeframe, c.timestamp] as any));
  }

  async deleteAll(): Promise<void> {
    await db.marketData.clear();
  }
}

export const marketDataRepo = new MarketDataRepo();
