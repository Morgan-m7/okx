/**
 * 数据源管理器
 * 根据设置自动切换模拟数据 ↔ 真实 API 数据
 * 同时根据数据源类型自动切换 TradingMode (forex ↔ crypto)
 */
import type { Quote, SymbolPair, Candle, Timeframe, TradingMode } from '../types/market';
import type { Account } from '../types/trading';
import { useSettingsStore } from '../stores/settingsStore';
import { useTradingModeStore } from '../stores/tradingModeStore';
import { marketDataGenerator } from './market-data-generator';
import { oandaConnector } from './api-connector';
import { useMarketStore } from '../stores/marketStore';
import { useTradingStore } from '../stores/tradingStore';
import { getActiveSymbols } from '../constants/symbols';
import { DEFAULTS } from '../constants/defaults';
import globalEventBus from '../events/event-bus';
import { EventType } from '../types/events';

class DataSourceManager {
  private simulatedInterval: ReturnType<typeof setInterval> | null = null;
  private unsubscribeApi: (() => void) | null = null;
  private initialized = false;
  /** 当前的模拟模式类型 */
  private currentSimulatedMode: TradingMode = 'forex';

  /** 初始化：监听设置变化自动切换数据源和TradingMode */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // 监听设置变化
    useSettingsStore.subscribe((state) => {
      const { dataSource, status } = state.config;

      if (status === 'connected' && dataSource !== 'simulated') {
        this.switchToApi(dataSource);
      } else if (status === 'disconnected' && dataSource === 'simulated') {
        this.switchToSimulated();
      }
    });

    // 初始启动
    const { dataSource, status } = useSettingsStore.getState().config;
    if (status === 'connected' && dataSource !== 'simulated') {
      this.switchToApi(dataSource);
    } else {
      this.switchToSimulated();
    }
  }

  /** 根据数据源类型获取对应 TradingMode */
  private getTradingMode(source: string): TradingMode {
    return source === 'okx' ? 'crypto' : 'forex';
  }

  /** 切换到模拟数据 */
  private switchToSimulated(mode?: TradingMode): void {
    const targetMode = mode || 'forex';
    this.currentSimulatedMode = targetMode;

    // 停止 API 订阅
    if (this.unsubscribeApi) {
      this.unsubscribeApi();
      this.unsubscribeApi = null;
    }

    // 停止旧的模拟定时器
    if (this.simulatedInterval) {
      clearInterval(this.simulatedInterval);
    }

    // 设置交易模式
    useTradingModeStore.getState().setMode(targetMode);

    // 初始化交易对
    useMarketStore.getState().initializeSymbols(targetMode);

    // 模拟账户：如果是加密货币模式，给 $100,000 虚拟资金
    const demoBalance = targetMode === 'crypto' ? DEFAULTS.cryptoDemoBalance : DEFAULTS.initialBalance;
    const broker = targetMode === 'crypto' ? 'CryptoSIM' : 'Simulated';
    const name = targetMode === 'crypto' ? '加密货币模拟账户' : '模拟账户';

    useTradingStore.getState().setAccount({
      name,
      type: 'demo',
      broker,
      balance: demoBalance,
      equity: demoBalance,
      marginUsed: 0,
      marginFree: demoBalance,
      marginLevel: 0,
      leverage: 10,
      currency: targetMode === 'crypto' ? 'USDT' : 'USD',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 如果是加密货币模式，重置合约引擎
    if (targetMode === 'crypto') {
      import('./crypto-trading-engine').then(({ cryptoTradingEngine }) => {
        cryptoTradingEngine.reset();
      }).catch(() => {});
    }

    // 启动模拟数据
    marketDataGenerator.start(DEFAULTS.quoteRefreshIntervalMs);

    // 设置数据回调 → 写入 marketStore
    marketDataGenerator.setOnQuoteUpdate((quotes) => {
      useMarketStore.getState().updateQuotes(quotes);
    });

    console.log(`[DataSource] 切换至: 模拟数据 (${targetMode === 'crypto' ? '加密货币' : '外汇'}模式) 余额: $${demoBalance}`);
  }

  /** 切换到加密货币模拟模式（不依赖OKX连接） */
  switchToCryptoSimulated(): void {
    this.switchToSimulated('crypto');
  }

  /** 切换到 API 数据源 */
  private switchToApi(source: string): void {
    // 停止模拟数据
    if (this.simulatedInterval) {
      clearInterval(this.simulatedInterval);
      this.simulatedInterval = null;
    }
    marketDataGenerator.stop();

    // 设置 TradingMode
    const mode = this.getTradingMode(source);
    useTradingModeStore.getState().setMode(mode);

    // 根据数据源类型选择连接器
    switch (source) {
      case 'oanda':
        this.connectOanda();
        break;
      case 'okx':
        this.connectOkx();
        break;
      case 'exness':
      case 'custom':  // JustMarkets MT5 桥接
        this.connectExness();
        break;
      default:
        this.switchToSimulated();
    }
  }

  /** 连接 OANDA 并订阅行情 */
  private async connectOanda(): Promise<void> {
    const { oanda } = useSettingsStore.getState().config;
    if (!oanda.apiKey || !oanda.accountId) return;

    try {
      const result = await oandaConnector.connect(oanda);
      if (result.success) {
        const forexSymbols = getActiveSymbols('forex');
        this.unsubscribeApi = oandaConnector.subscribeQuotes(
          forexSymbols,
          (quote: Quote) => {
            useMarketStore.getState().updateQuote(quote.symbol, quote);
            globalEventBus.emit(EventType.QUOTE_UPDATED, {
              symbol: quote.symbol,
              quote,
            });
          }
        );

        // 立即拉取一次最新报价
        this.pollOandaQuotes();
        // 每 30 秒轮询一次作为备份
        this.simulatedInterval = setInterval(() => this.pollOandaQuotes(), 30000);
      } else {
        console.error('[DataSource] OANDA 连接失败:', result.error);
        this.switchToSimulated();
      }
    } catch (err) {
      console.error('[DataSource] OANDA 错误:', err);
      this.switchToSimulated();
    }
  }

  /** OANDA 轮询报价 */
  private async pollOandaQuotes(): Promise<void> {
    try {
      const forexSymbols = getActiveSymbols('forex');
      const quotes = await oandaConnector.fetchQuotes(forexSymbols);
      if (quotes && quotes.length > 0) {
        useMarketStore.getState().updateQuotes(quotes);
      }
    } catch { /* 静默处理 */ }
  }

  /** 连接 OKX */
  private async connectOkx(): Promise<void> {
    const { okx: config } = useSettingsStore.getState().config;
    if (!config.apiKey) return;

    try {
      const { okxConnector } = await import('./okx-connector');

      // 页面刷新后连接器是全新的，重新完整连接(含REST+WebSocket)
      if (!okxConnector.isConnected()) {
        console.log('[DataSource] 页面刷新，重新完整连接OKX...');
        const result = await okxConnector.connect({
          apiKey: config.apiKey,
          secretKey: config.secretKey,
          passphrase: config.passphrase,
          environment: config.environment || ('demo' as any),
          leverage: config.leverage || 10,
          marginMode: config.marginMode || 'cross',
        });
        if (result.success) {
          console.log('[DataSource] OKX重连成功，余额:', result.accountInfo?.balance, result.accountInfo?.currency);
        } else {
          console.warn('[DataSource] OKX重连失败:', result.error);
        }
      } else {
        // 已连接，从缓存恢复余额
        const { balance, currency } = okxConnector.getLastBalance();
        useTradingStore.getState().updateAccount({ balance, currency: currency as any });
        console.log('[DataSource] 从缓存恢复余额:', balance, currency);
      }

      // 初始化交易对和订阅行情
      useMarketStore.getState().initializeSymbols('crypto');

      const cryptoSymbols = getActiveSymbols('crypto');
      this.unsubscribeApi = okxConnector.subscribeQuotes(
        cryptoSymbols,
        (quote: Quote) => {
          useMarketStore.getState().updateQuote(quote.symbol, quote);
          globalEventBus.emit(EventType.QUOTE_UPDATED, { symbol: quote.symbol, quote });
        }
      );
      // 立即拉一次
      okxConnector.fetchQuotes(cryptoSymbols).then(quotes => {
        if (quotes.length > 0) useMarketStore.getState().updateQuotes(quotes);
      });
    } catch (err) {
      console.error('[DataSource] OKX 初始化失败:', err);
    }
  }

  /** 连接 Exness 或 MT5 桥接 */
  private async connectExness(): Promise<void> {
    const state = useSettingsStore.getState().config;
    const source = state.dataSource;

    try {
      if (source === 'custom') {
        // JustMarkets MT5 桥接
        const { mt5Bridge } = await import('./mt5-bridge-connector');
        const url = state.custom.serverUrl || state.custom.baseUrl;
        if (!url) return;
        if (!mt5Bridge.isConnected()) {
          const result = await mt5Bridge.connect({ name: 'MT5 Bridge', baseUrl: url, apiKey: state.custom.apiKey });
          if (!result.success) {
            console.warn('[DataSource] MT5桥接连接失败');
            this.switchToSimulated();
            return;
          }
          if (result.accountInfo) {
            useTradingStore.getState().setAccount({
              name: 'JustMarkets 实盘',
              type: 'live', broker: 'JustMarkets',
              balance: result.accountInfo.balance, equity: result.accountInfo.balance,
              marginUsed: 0, marginFree: result.accountInfo.balance, marginLevel: 0,
              createdAt: Date.now(), updatedAt: Date.now(),
            });
          }
        }
        const forexSymbols = getActiveSymbols('forex');
        this.unsubscribeApi = mt5Bridge.subscribeQuotes(
          forexSymbols,
          (quote: Quote) => {
            useMarketStore.getState().updateQuote(quote.symbol, quote);
            globalEventBus.emit(EventType.QUOTE_UPDATED, { symbol: quote.symbol, quote });
          }
        );
      } else {
        // Exness
        const { exness: config } = state;
        if (!config.apiKey || !config.serverUrl) return;
        const { exnessConnector } = await import('./exness-connector');
        const result = await exnessConnector.connect(config);
        if (result.success) {
          const forexSymbols = getActiveSymbols('forex');
          this.unsubscribeApi = exnessConnector.subscribeQuotes(
            forexSymbols,
            (quote: Quote) => {
              useMarketStore.getState().updateQuote(quote.symbol, quote);
              globalEventBus.emit(EventType.QUOTE_UPDATED, { symbol: quote.symbol, quote });
            }
          );
        }
      }
    } catch (err) {
      console.error('[DataSource] 连接失败:', err);
    }
  }

  /** 获取历史 K 线数据（通用接口） */
  getHistoricalCandles(
    symbol: SymbolPair,
    timeframe: Timeframe,
    count: number
  ): Candle[] {
    return marketDataGenerator.generateHistoricalCandles(symbol, timeframe, count);
  }

  /** 清理 */
  destroy(): void {
    if (this.simulatedInterval) {
      clearInterval(this.simulatedInterval);
    }
    if (this.unsubscribeApi) {
      this.unsubscribeApi();
    }
    marketDataGenerator.destroy();
    oandaConnector.disconnect();
  }
}

/** 全局单例 */
export const dataSourceManager = new DataSourceManager();
