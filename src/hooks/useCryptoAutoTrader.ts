/**
 * 加密货币合约自动交易 Hook
 * 监听实时行情 → 运行已开启的策略 → 通过 CryptoTradingEngine 自动开仓/平仓
 */
import { useEffect, useRef } from 'react';
import { useStrategyStore } from '../stores/strategyStore';
import { useTradingStore } from '../stores/tradingStore';
import globalEventBus from '../events/event-bus';
import { EventType } from '../types/events';
import { marketDataGenerator } from '../engine/market-data-generator';
import { cryptoTradingEngine } from '../engine/crypto-trading-engine';
import type { Candle } from '../types';
import type { TradeSignal } from '../types/strategy';

export function useCryptoAutoTrader() {
  const strategies = useStrategyStore((s) => s.strategies);
  const cachedFactory = useRef<any>(null);

  useEffect(() => {
    // 预加载策略工厂
    import('../engine/strategy-factory').then(m => { cachedFactory.current = m; });
  }, []);

  useEffect(() => {
    const unsubCandle = globalEventBus.on(EventType.CANDLE_CLOSED, (data: any) => {
      const candle: Candle = data.candle;
      const activeStrategies = useStrategyStore.getState().strategies.filter(s => s.isActive);
      if (activeStrategies.length === 0 || !cachedFactory.current) return;

      for (const config of activeStrategies) {
        if (!config.symbols.includes(candle.symbol)) continue;

        const strategy = cachedFactory.current.createStrategy(config.strategyId, config.params, globalEventBus);
        if (!strategy) continue;

        // 使用策略指定的时间周期生成历史K线
        const tf = config.timeframe || 'M1';
        const lookback = Math.max(
          config.params.fastPeriod || 20,
          config.params.slowPeriod || 60,
          config.params.period || 20,
          100
        );
        const history = marketDataGenerator.generateHistoricalCandles(candle.symbol, tf, lookback);
        history.push(candle);

        const forexPositions = useTradingStore.getState().contractPositions.map(p => ({
          id: p.id,
          symbol: p.symbol,
          direction: p.positionSide === 'long' ? 'buy' as const : 'sell' as const,
          volume: p.size,
          openPrice: p.avgOpenPrice,
          currentPrice: p.markPrice,
          sl: p.sl,
          tp: p.tp,
          profit: p.unrealizedPnl,
          pips: 0,
          strategyId: p.id,
          martingaleLayer: 0,
          openTime: p.openTime,
        }));

        const signals = strategy.onBar(candle, history, forexPositions);
        for (const signal of signals) {
          try {
            executeCryptoSignal(signal, config.id, candle.symbol);
          } catch (err) {
            console.warn(`[CryptoAutoTrade] ${config.name} 失败:`, err);
          }
        }
      }
    });

    const unsubQuote = globalEventBus.on(EventType.QUOTE_UPDATED, (data: any) => {
      const { symbol, quote } = data;
      const activeStrategies = useStrategyStore.getState().strategies.filter(s => s.isActive);
      const price = (quote.bid + quote.ask) / 2;

      for (const config of activeStrategies) {
        if (!config.symbols.includes(symbol)) continue;
        const cryptoPositions = useTradingStore.getState().contractPositions.filter(p => p.symbol === symbol);

        for (const pos of cryptoPositions) {
          if (pos.tp !== null) {
            const hitTp = pos.positionSide === 'long' ? price >= pos.tp : price <= pos.tp;
            if (hitTp) {
              cryptoTradingEngine.closePosition(pos.id, price);
              console.log(`[CryptoAutoTrade] 🎯 ${symbol} 止盈 @ ${price}`);
              continue;
            }
          }
          if (pos.sl !== null) {
            const hitSl = pos.positionSide === 'long' ? price <= pos.sl : price >= pos.sl;
            if (hitSl) {
              cryptoTradingEngine.closePosition(pos.id, price);
              console.log(`[CryptoAutoTrade] 🛑 ${symbol} 止损 @ ${price}`);
            }
          }
        }
      }
    });

    return () => { unsubCandle(); unsubQuote(); };
  }, []);
}

function executeCryptoSignal(signal: TradeSignal, strategyId: string, symbol: string) {
  if (signal.type === 'close') {
    const positions = useTradingStore.getState().contractPositions;
    const pos = positions.find(p => p.symbol === symbol);
    if (pos) {
      cryptoTradingEngine.closePosition(pos.id, signal.price);
      console.log(`[CryptoAutoTrade] 📴 ${symbol} 策略平仓`);
    }
    return;
  }

  const size = Math.max(1, Math.floor((signal.volume || 0.01) * 100));
  try {
    cryptoTradingEngine.openPosition({
      symbol: symbol as any,
      side: signal.direction === 'buy' ? 'long' : 'short',
      orderType: 'market',
      price: signal.price,
      size,
      leverage: 10,
      marginMode: 'cross',
      sl: signal.tp,
      tp: signal.sl,
    });
    console.log(`[CryptoAutoTrade] 🚀 ${signal.direction === 'buy' ? '做多' : '做空'} ${symbol} ${size}张 @ ${signal.price}`);
  } catch (err: any) {
    console.warn(`[CryptoAutoTrade] 开仓失败:`, err.message);
  }
}
