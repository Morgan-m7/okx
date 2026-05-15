import type { SymbolPair, Quote, Candle, Timeframe } from './market';
import type { Position, TradeRecord, Account } from './trading';
import type { TradeSignal } from './strategy';

/** 事件类型常量 */
export enum EventType {
  QUOTE_UPDATED = 'market:quote-updated',
  CANDLE_CLOSED = 'market:candle-closed',
  CANDLE_UPDATE = 'market:candle-update',

  STRATEGY_SIGNAL = 'strategy:signal',
  STRATEGY_STARTED = 'strategy:started',
  STRATEGY_STOPPED = 'strategy:stopped',
  STRATEGY_ERROR = 'strategy:error',

  POSITION_OPENED = 'trading:position-opened',
  POSITION_CLOSED = 'trading:position-closed',
  POSITION_UPDATED = 'trading:position-updated',
  SL_TP_TRIGGERED = 'trading:sl-tp-triggered',
  ACCOUNT_UPDATED = 'trading:account-updated',

  BACKTEST_STARTED = 'backtest:started',
  BACKTEST_PROGRESS = 'backtest:progress',
  BACKTEST_COMPLETED = 'backtest:completed',
  BACKTEST_ERROR = 'backtest:error',

  RISK_ALERT = 'risk:alert',
  RISK_MARTINGALE_LIMIT = 'risk:martingale-limit',
  RISK_ADX_REJECTED = 'risk:adx-rejected',
}

/** 事件载荷映射 */
export interface EventPayloadMap {
  [EventType.QUOTE_UPDATED]: { symbol: SymbolPair; quote: Quote };
  [EventType.CANDLE_CLOSED]: { symbol: SymbolPair; timeframe: Timeframe; candle: Candle };
  [EventType.CANDLE_UPDATE]: { symbol: SymbolPair; timeframe: Timeframe; candle: Candle };
  [EventType.STRATEGY_SIGNAL]: { signal: TradeSignal };
  [EventType.STRATEGY_STARTED]: { strategyId: string };
  [EventType.STRATEGY_STOPPED]: { strategyId: string };
  [EventType.STRATEGY_ERROR]: { strategyId: string; error: string };
  [EventType.POSITION_OPENED]: { position: Position };
  [EventType.POSITION_CLOSED]: { trade: TradeRecord };
  [EventType.POSITION_UPDATED]: { position: Position };
  [EventType.SL_TP_TRIGGERED]: { positionId: string; reason: 'sl' | 'tp' };
  [EventType.ACCOUNT_UPDATED]: { account: Account };
  [EventType.BACKTEST_STARTED]: { config: any };
  [EventType.BACKTEST_PROGRESS]: { progress: number; currentCandle: number; totalCandles: number };
  [EventType.BACKTEST_COMPLETED]: { result: any };
  [EventType.BACKTEST_ERROR]: { error: string };
  [EventType.RISK_ALERT]: { strategyId: string; message: string; level: 'warning' | 'critical' };
  [EventType.RISK_MARTINGALE_LIMIT]: { strategyId: string; layer: number };
  [EventType.RISK_ADX_REJECTED]: { strategyId: string; adxValue: number };
}
