/**
 * 策略工厂 - 根据策略ID创建策略实例
 */
import { BaseStrategy } from '../strategies/base-strategy';
import type { EventBus } from '../events/event-bus';

// 趋势跟踪
import { MaCrossStrategy } from '../strategies/trend-following/ma-cross-strategy';
import { MacdStrategy } from '../strategies/trend-following/macd-strategy';
import { TurtleStrategy } from '../strategies/trend-following/turtle-strategy';

// 马丁格尔
import { ClassicMartingaleStrategy } from '../strategies/martingale/classic-martingale';
import { GridStrategy } from '../strategies/martingale/grid-strategy';

// 均值回归
import { RsiStrategy } from '../strategies/mean-reversion/rsi-strategy';
import { BollingerReversalStrategy } from '../strategies/mean-reversion/bollinger-reversal';

const STRATEGY_MAP: Record<string, new (params: any, eventBus: EventBus) => BaseStrategy> = {
  'ma-cross': MaCrossStrategy,
  'macd': MacdStrategy,
  'turtle': TurtleStrategy,
  'classic-martingale': ClassicMartingaleStrategy,
  'grid': GridStrategy,
  'rsi': RsiStrategy,
  'bollinger-reversal': BollingerReversalStrategy,
};

export function createStrategy(
  strategyId: string,
  params: any,
  eventBus: EventBus
): BaseStrategy | null {
  const StrategyClass = STRATEGY_MAP[strategyId];
  if (!StrategyClass) {
    console.warn(`[StrategyFactory] 未知策略: ${strategyId}`);
    return null;
  }
  try {
    return new StrategyClass(params, eventBus);
  } catch (err) {
    console.error(`[StrategyFactory] 创建策略失败 ${strategyId}:`, err);
    return null;
  }
}
