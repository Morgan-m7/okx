/**
 * MT4/MT5 桥接连接器
 * 用于 JustMarkets 等 MT5 券商的数据接入
 *
 * 支持两种桥接方式：
 * 1. MetaTrader API (REST) - 第三方商业服务
 * 2. 自托管桥接服务
 */
import type { Quote, SymbolPair } from '../types/market';
import type { DataSourceConnector, DataSourceType, ConnectionTestResult, CustomApiConfig } from '../types/settings';

/** 货币对 → JustMarkets MT5 符号 */
const SYMBOL_TO_MT5: Record<string, string> = {
  'EUR/USD': 'EURUSD',
  'GBP/USD': 'GBPUSD',
  'USD/JPY': 'USDJPY',
  'AUD/USD': 'AUDUSD',
  'USD/CAD': 'USDCAD',
  'USD/CHF': 'USDCHF',
  'NZD/USD': 'NZDUSD',
  'XAU/USD': 'XAUUSD',
  'BTC/USDT': 'BTCUSD',
};

const MT5_TO_SYMBOL: Record<string, string> = {};
for (const [k, v] of Object.entries(SYMBOL_TO_MT5)) {
  MT5_TO_SYMBOL[v] = k;
}

interface Mt5Quote {
  symbol: string;
  bid: number;
  ask: number;
  high?: number;
  low?: number;
  time?: string;
  volume?: number;
}

export class Mt5BridgeConnector implements DataSourceConnector {
  readonly name = 'MT5 Bridge';
  readonly type: DataSourceType = 'custom';

  private apiKey: string = '';
  private serverUrl: string = '';
  private connected = false;
  private ws: WebSocket | null = null;
  private subscribers: Map<string, (data: Quote) => void> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;

  async connect(config: CustomApiConfig): Promise<ConnectionTestResult> {
    this.apiKey = config.apiKey || '';
    this.serverUrl = (config.serverUrl || config.baseUrl || '').replace(/\/+$/, '');

    if (!this.serverUrl) {
      return { success: false, error: '请填写桥接服务器地址' };
    }

    try {
      const startTime = performance.now();

      // 测试连接 - mt5-bridge 使用 /api-docs 作为健康检查
      const response = await fetch(`${this.serverUrl}/api-docs/`, {
        signal: AbortSignal.timeout(5000),
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (!response.ok && response.status !== 302) {
        return { success: false, error: `桥接服务器连接失败 (${response.status})` };
      }

      // 尝试获取账户信息
      let balance = 0;
      try {
        const accountResp = await fetch(`${this.serverUrl}/api/v1/account`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        });
        if (accountResp.ok) {
          const accData = await accountResp.json();
          balance = accData.balance || accData.equity || 0;
        }
      } catch { /* 可选 */ }

      this.connected = true;
      // 启动轮询
      this.startPolling();

      return {
        success: true,
        latencyMs,
        accountInfo: { balance, currency: 'USD', leverage: 100 },
      };
    } catch (err: any) {
      this.connected = false;
      return { success: false, error: `连接失败: ${err?.message || '请检查服务器地址和网络'}` };
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.subscribers.clear();
  }

  private toMt5Symbol(symbol: string): string {
    return SYMBOL_TO_MT5[symbol] || symbol.replace('/', '');
  }

  private fromMt5Symbol(mt5Symbol: string): string {
    return MT5_TO_SYMBOL[mt5Symbol] || mt5Symbol;
  }

  /** REST 轮询获取报价 */
  async fetchQuotes(symbols: string[]): Promise<Quote[]> {
    if (!this.connected) throw new Error('未连接');

    const quotes: Quote[] = [];
    for (const symbol of symbols) {
      try {
        const mtSymbol = this.toMt5Symbol(symbol);
        const response = await fetch(
          `${this.serverUrl}/v1/quote?symbol=${mtSymbol}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (response.ok) {
          const data = await response.json();
          quotes.push({
            symbol: symbol as SymbolPair,
            bid: data.bid || 0,
            ask: data.ask || 0,
            spread: (data.ask || 0) - (data.bid || 0),
            changePips: 0,
            changePercent: 0,
            high24h: data.high || (data.bid || 0) * 1.002,
            low24h: data.low || (data.bid || 0) * 0.998,
            updatedAt: Date.now(),
            previousBid: data.bid || 0,
          });
        }
      } catch { /* 单个品种失败不影响其他 */ }
    }
    return quotes;
  }

  /** 自动轮询（每3秒） */
  private startPolling(): void {
    this.pollingTimer = setInterval(async () => {
      if (!this.connected) return;
      try {
        const symbols = Object.keys(SYMBOL_TO_MT5);
        const quotes = await this.fetchQuotes(symbols);
        quotes.forEach(q => {
          this.subscribers.forEach(cb => cb(q));
        });
      } catch { /* 静默 */ }
    }, 3000);
  }

  private parseQuotes(quotes: Mt5Quote[]): Quote[] {
    return (Array.isArray(quotes) ? quotes : []).map(q => {
      const symbol = this.fromMt5Symbol(q.symbol) as SymbolPair;
      return {
        symbol,
        bid: q.bid,
        ask: q.ask,
        spread: q.ask - q.bid,
        changePips: 0,
        changePercent: 0,
        high24h: q.high || q.bid * 1.002,
        low24h: q.low || q.bid * 0.998,
        updatedAt: Date.now(),
        previousBid: q.bid,
      };
    });
  }

  /** WebSocket 实时订阅 */
  subscribeQuotes(symbols: string[], callback: (data: Quote) => void): () => void {
    const wsUrl = this.serverUrl.replace(/^http/, 'ws');

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ws = new WebSocket(`${wsUrl}/ws`);

      this.ws.onopen = () => {
        this.ws?.send(JSON.stringify({
          action: 'auth',
          token: this.apiKey,
        }));
        this.ws?.send(JSON.stringify({
          action: 'subscribe',
          symbols: symbols.map(s => this.toMt5Symbol(s)),
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'quote' || msg.type === 'price') {
            const quotes = this.parseQuotes([msg.data || msg]);
            quotes.forEach(q => this.subscribers.forEach(cb => cb(q)));
          }
        } catch { /* 忽略 */ }
      };

      this.ws.onclose = () => {
        if (this.connected) {
          this.reconnectTimer = setTimeout(() => {
            this.subscribeQuotes(symbols, callback);
          }, 5000);
        }
      };
    }

    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.subscribers.set(id, callback);
    return () => {
      this.subscribers.delete(id);
      if (this.subscribers.size === 0 && this.ws) {
        this.ws?.close();
        this.ws = null;
      }
    };
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const mt5Bridge = new Mt5BridgeConnector();
