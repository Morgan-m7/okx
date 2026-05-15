import type { SymbolPair } from './market';

export type Direction = 'buy' | 'sell';
export type CloseReason = 'sl' | 'tp' | 'manual' | 'signal' | 'stop_out';

/** 账户类型 */
export type AccountType = 'demo' | 'live';

/** 账户信息（同时支持外汇和加密货币） */
export interface Account {
  id?: number;
  name: string;
  type: AccountType;
  broker: string;
  balance: number;
  equity: number;
  marginUsed: number;
  marginFree: number;
  marginLevel: number;
  createdAt: number;
  updatedAt: number;
  // Crypto 特有字段
  unrealizedPnl?: number;
  realizedPnl?: number;
  totalPnl?: number;
  currency?: string; // 'USD' | 'USDT'
  leverage?: number; // 当前杠杆
}

/** 外汇持仓 */
export interface Position {
  id: string;
  symbol: SymbolPair;
  direction: Direction;
  volume: number;
  openPrice: number;
  currentPrice: number;
  sl: number | null;
  tp: number | null;
  profit: number;
  pips: number;
  strategyId: string | null;
  martingaleLayer: number;
  openTime: number;
}

/** 已平仓交易（外汇） */
export interface TradeRecord {
  id: string;
  symbol: SymbolPair;
  direction: Direction;
  volume: number;
  openPrice: number;
  closePrice: number;
  openTime: number;
  closeTime: number;
  profit: number;
  pips: number;
  strategyId: string | null;
  closeReason: CloseReason;
  martingaleLayer: number;
}

// ===== 加密货币合约交易类型 =====

/** 订单类型 */
export type CryptoOrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'take_profit' | 'take_profit_limit';

/** 订单方向 */
export type OrderSide = 'buy' | 'sell';

/** 持仓方向 */
export type PositionSide = 'long' | 'short';

/** 订单状态 */
export type OrderStatus = 'live' | 'partially_filled' | 'filled' | 'cancelled' | 'expired';

/** 保证金模式 */
export type MarginMode = 'isolated' | 'cross';

/** 合约订单 */
export interface CryptoOrder {
  id: string;
  symbol: SymbolPair;
  side: OrderSide;
  orderType: CryptoOrderType;
  price: number;
  size: number; // 合约张数
  filledSize: number;
  notional: number; // 名义价值 USDT
  margin: number;
  leverage: number;
  marginMode: MarginMode;
  status: OrderStatus;
  reduceOnly: boolean;
  timestamp: number;
  stopPrice?: number; // 止损触发价
}

/** 合约持仓 */
export interface ContractPosition {
  id: string;
  symbol: SymbolPair;
  positionSide: PositionSide;
  size: number; // 持有张数 (正数为多，负数为空)
  avgOpenPrice: number; // 开仓均价
  markPrice: number; // 标记价格
  liqPrice: number; // 强平价格
  margin: number; // 保证金
  marginMode: MarginMode;
  leverage: number;
  unrealizedPnl: number; // 未实现盈亏
  realizedPnl: number; // 已实现盈亏
  roi: number; // 收益率 %
  fundingFee: number; // 累计资金费用
  sl: number | null; // 止盈
  tp: number | null; // 止损
  openTime: number;
  updatedAt: number;
}

/** 合约订单簿订阅 */
export interface OrderBookSubscription {
  symbol: SymbolPair;
  bids: [string, string][]; // [price, size][]
  asks: [string, string][];
}
