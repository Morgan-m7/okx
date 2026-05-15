import type { Candle, SymbolPair, Timeframe } from '../types/market';
import type { Account, Position, TradeRecord, Direction } from '../types/trading';
import type { TradeSignal, StrategyConfig } from '../types/strategy';
import type { BacktestConfig, BacktestResult, EquityPoint } from '../types/backtest';
import type { EventBus } from '../events/event-bus';
import { EventType } from '../types/events';
import { PaperTradingEngine } from './paper-trading-engine';
import { RiskManager } from './risk-manager';
import { StrategyManager } from './strategy-manager';
import { statisticsCalculator } from './statistics-calculator';
import { marketDataRepo } from '../db/market-data.repo';
import { backtestRepo } from '../db/backtest.repo';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULTS } from '../constants/defaults';

export class BacktestEngine {
  private eventBus: EventBus;
  private paperEngine: PaperTradingEngine;
  private riskManager: RiskManager;
  private strategyManager: StrategyManager;

  constructor(
    eventBus: EventBus,
    paperEngine: PaperTradingEngine,
    riskManager: RiskManager,
    strategyManager: StrategyManager
  ) {
    this.eventBus = eventBus;
    this.paperEngine = paperEngine;
    this.riskManager = riskManager;
    this.strategyManager = strategyManager;
  }

  async run(config: BacktestConfig): Promise<BacktestResult> {
    this.eventBus.emit(EventType.BACKTEST_STARTED, { config });

    const candles = await marketDataRepo.getByDateRange(
      config.symbol,
      config.timeframe,
      config.startDate,
      config.endDate
    );

    if (candles.length === 0) {
      throw new Error(`No market data found for ${config.symbol} ${config.timeframe}`);
    }

    const sortedCandles = candles.sort((a, b) => a.timestamp - b.timestamp);

    this.paperEngine.reset(config.initialBalance);
    const equityCurve: EquityPoint[] = [];
    const allTrades: TradeRecord[] = [];

    const totalCandles = sortedCandles.length;

    for (let i = 0; i < totalCandles; i++) {
      const candle = sortedCandles[i];
      const history = sortedCandles.slice(0, i + 1);

      this.paperEngine.checkSLTP(candle);

      const strategy = this.strategyManager.getStrategy(config.strategyId);
      if (strategy) {
        const positions = this.paperEngine.getPositions().filter(
          p => p.strategyId === config.strategyId
        );
        const signals = strategy.onBar(candle, history, positions);

        for (const signal of signals) {
          if (signal.type === 'open') {
            const riskCheck = this.riskManager.validateOpenPosition(signal, positions, this.paperEngine.getAccount());
            if (!riskCheck.allowed) continue;
            try {
              this.paperEngine.openPosition(signal);
            } catch {
              // skip failed opens
            }
          } else if (signal.type === 'close') {
            const posToClose = this.paperEngine.getPositions().find(
              p => p.symbol === signal.symbol && p.strategyId === signal.strategyId
            );
            if (posToClose) {
              const trade = this.paperEngine.closePosition(posToClose.id, candle.close, 'signal');
              if (trade) allTrades.push(trade);
            }
          }
        }
      }

      this.paperEngine.updatePrices(candle);

      const account = this.paperEngine.getAccount();
      const initialEq = equityCurve.length > 0 ? equityCurve[0].equity : config.initialBalance;
      const drawdown = initialEq > 0
        ? ((initialEq - account.equity) / initialEq) * 100
        : 0;

      equityCurve.push({
        timestamp: candle.timestamp,
        equity: Math.round(account.equity * 100) / 100,
        drawdown: Math.round(drawdown * 100) / 100,
      });

      if (i % Math.max(1, Math.floor(totalCandles / 100)) === 0) {
        const progress = Math.round((i / totalCandles) * 100);
        this.eventBus.emit(EventType.BACKTEST_PROGRESS, {
          progress,
          currentCandle: i,
          totalCandles,
        });
      }
    }

    const positions = this.paperEngine.getPositions();
    for (const pos of positions) {
      const lastCandle = sortedCandles[sortedCandles.length - 1];
      const trade = this.paperEngine.closePosition(pos.id, lastCandle.close, 'signal');
      if (trade) allTrades.push(trade);
    }

    const account = this.paperEngine.getAccount();
    const stats = statisticsCalculator.calculate(allTrades, equityCurve, config.initialBalance);

    const strategyConfig = this.strategyManager.getStrategyConfig(config.strategyId);

    const result: BacktestResult = {
      id: uuidv4(),
      strategyId: config.strategyId,
      strategyName: strategyConfig?.name || 'Unknown',
      symbol: config.symbol,
      timeframe: config.timeframe,
      startDate: config.startDate,
      endDate: config.endDate,
      initialBalance: config.initialBalance,
      finalBalance: Math.round(account.balance * 100) / 100,
      totalReturn: stats.totalReturn,
      annualizedReturn: stats.annualizedReturn,
      winRate: stats.winRate,
      profitFactor: stats.profitFactor,
      sharpeRatio: stats.sharpeRatio,
      maxDrawdown: stats.maxDrawdown,
      maxDrawdownDuration: stats.maxDrawdownDuration,
      totalTrades: stats.totalTrades,
      winningTrades: stats.winningTrades,
      losingTrades: stats.losingTrades,
      avgProfit: stats.avgProfit,
      avgLoss: stats.avgLoss,
      equityCurve,
      tradeDetails: allTrades,
      createdAt: Date.now(),
    };

    await backtestRepo.create(result);

    this.eventBus.emit(EventType.BACKTEST_COMPLETED, { result });

    return result;
  }
}
