import Dexie, { type Table } from 'dexie';
import type { Account } from '../types/trading';
import type { Position } from '../types/trading';
import type { TradeRecord } from '../types/trading';
import type { StrategyConfig } from '../types/strategy';
import type { Candle } from '../types/market';
import type { BacktestResult } from '../types/backtest';

export class ForexEADatabase extends Dexie {
  accounts!: Table<Account, number>;
  positions!: Table<Position, string>;
  tradeHistory!: Table<TradeRecord, string>;
  strategies!: Table<StrategyConfig, string>;
  marketData!: Table<Candle, [string, string, number]>;
  backtestResults!: Table<BacktestResult, string>;

  constructor() {
    super('ForexEATrader');

    this.version(1).stores({
      accounts: '++id',
      positions: '++id, symbol, strategyId',
      tradeHistory: '++id, symbol, closeTime, strategyId, closeReason',
      strategies: '++id, family, isActive',
      marketData: '[symbol+timeframe+timestamp], symbol, timeframe, timestamp',
      backtestResults: '++id, strategyId, symbol, timeframe, startDate',
    });
  }
}

const db = new ForexEADatabase();
export default db;
