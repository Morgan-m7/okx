/** 交易模式 */
export type TradingMode = 'forex' | 'crypto';

/** 外汇交易对 */
export type ForexPair =
  | 'EUR/USD' | 'GBP/USD' | 'USD/JPY' | 'AUD/USD'
  | 'USD/CAD' | 'USD/CHF' | 'NZD/USD' | 'XAU/USD';

/** 加密货币交易对 */
export type CryptoPair =
  | 'BTC/USDT' | 'ETH/USDT' | 'SOL/USDT' | 'XRP/USDT'
  | 'DOGE/USDT' | 'ADA/USDT' | 'DOT/USDT' | 'LINK/USDT'
  | 'AVAX/USDT' | 'MATIC/USDT' | 'UNI/USDT' | 'ATOM/USDT'
  | 'LTC/USDT' | 'BCH/USDT' | 'TRX/USDT' | 'SHIB/USDT'
  | 'APT/USDT' | 'ARB/USDT' | 'OP/USDT' | 'SUI/USDT'
  | 'NEAR/USDT' | 'FIL/USDT' | 'AAVE/USDT' | 'AXS/USDT'
  | 'SAND/USDT' | 'EGLD/USDT' | 'FTM/USDT' | 'ALGO/USDT'
  | 'ICP/USDT' | 'XLM/USDT';

/** 支持的交易品种（联合类型） */
export type SymbolPair = ForexPair | CryptoPair;

/** 8 种时间周期 */
export type Timeframe =
  | 'M1' | 'M5' | 'M15' | 'M30'
  | 'H1' | 'H4' | 'D1' | 'W1';

export interface Quote {
  symbol: SymbolPair;
  bid: number;
  ask: number;
  spread: number;
  changePips: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume24h?: number;
  updatedAt: number;
  previousBid: number;
}

export interface Candle {
  symbol: SymbolPair;
  timeframe: Timeframe;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** 订单簿条目 */
export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

/** 订单簿 */
export interface OrderBook {
  symbol: SymbolPair;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: number;
}

/** 资金费率 */
export interface FundingRate {
  symbol: SymbolPair;
  fundingRate: number;
  fundingTime: number;
  nextFundingTime: number;
  interval: number; // hours
}
