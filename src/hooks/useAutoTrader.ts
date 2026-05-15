import { useEffect, useRef } from 'react';
import { useStrategyStore } from '../stores/strategyStore';
import { useTradingStore } from '../stores/tradingStore';
import { StrategyManager } from '../engine/strategy-manager';
import globalEventBus from '../events/event-bus';
import { EventType } from '../types/events';
import { marketDataGenerator } from '../engine/market-data-generator';
import { DEFAULTS } from '../constants/defaults';
import type { Candle } from '../types';
import type { TradeSignal } from '../types/strategy';
import type { Position as TradingPosition, Direction } from '../types/trading';
import { v4 as uuidv4 } from 'uuid';

/**
 * 自动交易 Hook
 * 监听实时行情 → 运行已开启的策略 → 自动开仓/平仓
 */
export function useAutoTrader() {
  const strategies = useStrategyStore((s) => s.strategies);
  const activePositions = useTradingStore((s) => s.positions);
  const smRef = useRef<StrategyManager | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const sm = new StrategyManager(globalEventBus);
    smRef.current = sm;

    // 监听 K 线关闭事件 → 运行策略 → 执行信号
    const unsubCandle = globalEventBus.on(EventType.CANDLE_CLOSED, (data: any) => {
      const candle: Candle = data.candle;
      const activeStrategies = useStrategyStore.getState().strategies.filter(s => s.isActive);

      if (activeStrategies.length === 0) return;

      for (const config of activeStrategies) {
        if (!config.symbols.includes(candle.symbol)) continue;

        const strategy = sm.getStrategy(config.strategyId);
        if (!strategy) continue;

        const tf = config.timeframe || 'M1';
        const history = marketDataGenerator.generateHistoricalCandles(
          candle.symbol, tf, 
          Math.max(config.params.fastPeriod || 20, config.params.slowPeriod || 60, 100)
        );
        history.push(candle);

        const positions = useTradingStore.getState().positions;
        const signals = strategy.onBar(candle, history, positions);

        for (const signal of signals) {
          try {
            executeSignal(signal, config.id);
          } catch (err) {
            console.warn(`[AutoTrade] ${config.name} 失败:`, err);
          }
        }
      }
    });

    // 监听报价更新（马丁格尔实时风控）
    const unsubQuote = globalEventBus.on(EventType.QUOTE_UPDATED, (data: any) => {
      const { symbol, quote } = data;
      const activeStrategies = useStrategyStore.getState().strategies.filter(s => s.isActive);

      for (const config of activeStrategies) {
        if (!config.symbols.includes(symbol)) continue;
        if (config.family !== 'martingale') continue;

        const positions = useTradingStore.getState().positions.filter(
          p => p.strategyId === config.id && p.symbol === symbol
        );

        for (const pos of positions) {
          if (pos.tp) {
            const hitTp = pos.direction === 'buy' ? quote.bid >= pos.tp : quote.ask <= pos.tp;
            if (hitTp) { closePositionById(pos.id, quote.bid, 'tp'); continue; }
          }
          if (pos.sl) {
            const hitSl = pos.direction === 'buy' ? quote.bid <= pos.sl : quote.ask >= pos.sl;
            if (hitSl) { closePositionById(pos.id, quote.bid, 'sl'); }
          }
        }
      }
    });

    return () => { unsubCandle(); unsubQuote(); };
  }, []);

  // 策略开关变化时注册
  useEffect(() => {
    const sm = smRef.current;
    if (!sm) return;

    const initStrategies = async () => {
      for (const config of strategies) {
        if (config.isActive && !sm.getStrategy(config.strategyId)) {
          try {
            const { createStrategy } = await import('../engine/strategy-factory');
            const strategy = createStrategy(config.strategyId, config.params, globalEventBus);
            if (strategy) sm.loadStrategy(config);
          } catch (err) {
            console.warn(`[AutoTrade] 加载 ${config.name} 失败:`, err);
          }
        }
      }
    };
    initStrategies();
  }, [strategies]);
}

function executeSignal(signal: TradeSignal, strategyId: string) {
  const store = useTradingStore.getState();
  
  if (signal.type === 'close') {
    const pos = store.positions.find(p => p.strategyId === strategyId && p.symbol === signal.symbol);
    if (pos) closePositionById(pos.id, signal.price, 'signal');
    return;
  }

  // 开仓
  const position: TradingPosition = {
    id: uuidv4(),
    symbol: signal.symbol,
    direction: signal.direction!,
    volume: signal.volume || 0.01,
    openPrice: signal.price,
    currentPrice: signal.price,
    sl: signal.sl ?? null,
    tp: signal.tp ?? null,
    profit: 0,
    pips: 0,
    strategyId,
    martingaleLayer: signal.martingaleLayer ?? 0,
    openTime: Date.now(),
  };
  
  store.addPosition(position);
  console.log(`[AutoTrade] ${signal.direction === 'buy' ? '🟢' : '🔴'} ${signal.symbol} ${signal.volume}手 @ ${signal.price}`);
}

function closePositionById(id: string, price: number, reason: string) {
  const store = useTradingStore.getState();
  const pos = store.positions.find(p => p.id === id);
  if (!pos) return;

  store.removePosition(id);
  store.addTradeRecord({
    id: uuidv4(),
    symbol: pos.symbol,
    direction: pos.direction,
    volume: pos.volume,
    openPrice: pos.openPrice,
    closePrice: price,
    openTime: pos.openTime,
    closeTime: Date.now(),
    profit: (price - pos.openPrice) * (pos.direction === 'buy' ? 1 : -1) * pos.volume * 100000,
    pips: (price - pos.openPrice) / 0.0001 * (pos.direction === 'buy' ? 1 : -1),
    strategyId: pos.strategyId,
    closeReason: reason as any,
    martingaleLayer: pos.martingaleLayer ?? 0,
  });
}
