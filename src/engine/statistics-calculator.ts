import type { TradeRecord } from '../types/trading';
import type { EquityPoint, BacktestResult } from '../types/backtest';

export class StatisticsCalculator {
  calculate(
    trades: TradeRecord[],
    equityCurve: EquityPoint[],
    initialBalance: number
  ): {
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
  } {
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.profit > 0).length;
    const losingTrades = trades.filter(t => t.profit <= 0).length;

    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    const grossProfit = trades.filter(t => t.profit > 0).reduce((s, t) => s + t.profit, 0);
    const grossLoss = Math.abs(trades.filter(t => t.profit < 0).reduce((s, t) => s + t.profit, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const finalBalance = equityCurve.length > 0
      ? equityCurve[equityCurve.length - 1].equity
      : initialBalance;
    const totalReturn = ((finalBalance - initialBalance) / initialBalance) * 100;

    const daysElapsed = this.calculateDaysElapsed(equityCurve);
    const annualizedReturn = daysElapsed > 0
      ? ((1 + totalReturn / 100) ** (365 / daysElapsed) - 1) * 100
      : 0;

    const returns = this.calculatePeriodReturns(equityCurve);
    const avgReturn = returns.reduce((s, r) => s + r, 0) / Math.max(1, returns.length);
    const stdReturn = this.calculateStdDev(returns);

    const sharpeRatio = stdReturn > 0
      ? (avgReturn / stdReturn) * Math.sqrt(252)
      : 0;

    const { maxDrawdown, maxDrawdownDuration } = this.calculateMaxDrawdown(equityCurve);

    const avgProfit = winningTrades > 0
      ? grossProfit / winningTrades
      : 0;
    const avgLoss = losingTrades > 0
      ? grossLoss / losingTrades
      : 0;

    return {
      totalReturn: Math.round(totalReturn * 100) / 100,
      annualizedReturn: Math.round(annualizedReturn * 100) / 100,
      winRate: Math.round(winRate * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      maxDrawdownDuration: Math.round(maxDrawdownDuration),
      totalTrades,
      winningTrades,
      losingTrades,
      avgProfit: Math.round(avgProfit * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
    };
  }

  private calculateMaxDrawdown(equityCurve: EquityPoint[]): { maxDrawdown: number; maxDrawdownDuration: number } {
    if (equityCurve.length === 0) {
      return { maxDrawdown: 0, maxDrawdownDuration: 0 };
    }

    let peak = equityCurve[0].equity;
    let maxDrawdown = 0;
    let maxDuration = 0;
    let currentDuration = 0;

    for (const point of equityCurve) {
      if (point.equity > peak) {
        peak = point.equity;
        currentDuration = 0;
      }

      const drawdown = ((peak - point.equity) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }

      if (drawdown > 0) {
        currentDuration++;
        if (currentDuration > maxDuration) {
          maxDuration = currentDuration;
        }
      } else {
        currentDuration = 0;
      }
    }

    return { maxDrawdown, maxDrawdownDuration: maxDuration };
  }

  private calculatePeriodReturns(equityCurve: EquityPoint[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1].equity;
      if (prev > 0) {
        returns.push((equityCurve[i].equity - prev) / prev);
      }
    }
    return returns;
  }

  private calculateDaysElapsed(equityCurve: EquityPoint[]): number {
    if (equityCurve.length < 2) return 0;
    const first = equityCurve[0].timestamp;
    const last = equityCurve[equityCurve.length - 1].timestamp;
    return (last - first) / (1000 * 60 * 60 * 24);
  }

  private calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const sqDiffs = values.map(v => (v - mean) ** 2);
    return Math.sqrt(sqDiffs.reduce((s, v) => s + v, 0) / (values.length - 1));
  }
}

export const statisticsCalculator = new StatisticsCalculator();
