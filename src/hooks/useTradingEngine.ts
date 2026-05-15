import { useEffect } from 'react';
import { useMarketStore } from '../stores/marketStore';
import { useTradingStore } from '../stores/tradingStore';
import { PaperTradingEngine } from '../engine/paper-trading-engine';
import globalEventBus from '../events/event-bus';

let engine: PaperTradingEngine | null = null;

function getEngine(): PaperTradingEngine {
  if (!engine) {
    engine = new PaperTradingEngine(globalEventBus);
  }
  return engine;
}

/** 获取交易引擎实例（供其他模块使用） */
export function useTradingEngine() {
  return getEngine();
}

/**
 * PnL 更新 Hook
 * 监听行情变化 → 更新所有持仓的浮动盈亏
 */
export function usePnLUpdater() {
  useEffect(() => {
    const eng = getEngine();
    const store = useTradingStore.getState();

    // 初始同步
    if (store.account.balance === 0) {
      eng.reset(10000);
      store.setAccount(eng.getAccount());
      store.setPositions(eng.getPositions());
      store.setTradeHistory(eng.getTradeHistory());
    }

    // 监听 Quote 更新 → 更新 PnL
    const unsub = useMarketStore.subscribe((state) => {
      const quotes = state.quotes;
      let updated = false;

      for (const pos of store.positions) {
        const quote = quotes[pos.symbol];
        if (!quote) continue;

        const price = pos.direction === 'buy' ? quote.bid : quote.ask;
        if (price !== pos.currentPrice) {
          eng.updatePositionPrice(pos.id, price);
          updated = true;
        }
      }

      if (updated) {
        store.setPositions(eng.getPositions());
        store.setAccount(eng.getAccount());
      }
    });

    return unsub;
  }, []);
}
