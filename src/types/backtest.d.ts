import type { SymbolPair, Timeframe } from './market';
import type { TradeRecord } from './trading';

/** 回测配置 */
export interface BacktestConfig {
  strategyId: string;
  symbol: SymbolPair;
  timeframe: Timeframe;
  startDate: number;
  endDate: number;
  initialBalance: number;
}

/** 回测结果 */
export interface BacktestResult {
  id: string;
  strategyId: string;
  strategyName: string;
  symbol: SymbolPair;
  timeframe: Timeframe;
  startDate: number;
  endDate: number;
  initialBalance: number;
  finalBalance: number;
  totalReturn: number;
  annualizedReturn: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgProfit: number;
  avgLoss: number;
  equityCurve: EquityPoint[];
  tradeDetails: TradeRecord[];
  createdAt: number;
}

/** 资金曲线点 */
export interface EquityPoint {
  timestamp: number;
  equity: number;
  drawdown: number;
}
