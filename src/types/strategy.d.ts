import type { SymbolPair, Direction, Candle, Timeframe } from './market';
import type { Position } from './trading';

export type StrategyFamily =
  | 'trend-following'
  | 'martingale'
  | 'mean-reversion';

export type StrategyId =
  | 'ma-cross' | 'macd' | 'turtle'
  | 'classic-martingale' | 'grid'
  | 'rsi' | 'bollinger-reversal';

/** 策略配置 */
export interface StrategyConfig {
  id: string;
  strategyId: StrategyId;
  family: StrategyFamily;
  name: string;
  params: Record<string, any>;
  isActive: boolean;
  symbols: SymbolPair[];
  timeframe?: Timeframe; // 策略运行的时间周期，可选，默认M15
  riskParams: RiskParams;
  createdAt: number;
  updatedAt: number;
}

/** 风控参数 */
export interface RiskParams {
  maxLossPercent: number;
  balanceProtectionPercent: number;
  maxMartingaleLayers: number;
  adxProtectionEnabled: boolean;
}

/** 交易信号 */
export interface TradeSignal {
  strategyId: string;
  symbol: SymbolPair;
  direction: Direction;
  type: 'open' | 'close' | 'modify';
  price: number;
  volume: number;
  sl?: number;
  tp?: number;
  reason: string;
  timestamp: number;
  martingaleLayer?: number;
}

/** 马丁格尔状态（运行时） */
export interface MartingaleState {
  layer: number;
  baseVolume: number;
  currentVolume: number;
  sequence: number[];
  totalLoss: number;
  consecutiveLosses: number;
  consecutiveWins: number;
  adxValue: number;
}

/** 策略抽象基类的类型接口 */
export interface IStrategy {
  readonly id: string;
  readonly strategyId: StrategyId;
  readonly family: StrategyFamily;
  readonly name: string;

  onBar(candle: Candle, history: Candle[], positions: Position[]): TradeSignal[];
  onInit(): void;
  onDestroy(): void;
  getParams(): Record<string, any>;
  updateParams(params: Record<string, any>): void;
  getRiskParams(): RiskParams;
}
