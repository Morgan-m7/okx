/**
 * OANDA API 连接器
 * 提供一键接入 OANDA 外汇数据 API 的能力
 *
 * 文档参考: https://developer.oanda.com/rest-live-v20/
 */
import type { Quote, SymbolPair } from '../types/market';
import type { DataSourceConnector, DataSourceType, ConnectionTestResult } from '../types/settings';

const OANDA_PRACTICE_URL = 'https://api-fxpractice.oanda.com';
const OANDA_LIVE_URL = 'https://api-fxtrade.oanda.com';

interface OandaPrice {
  instrument: string;
  time: string;
  bids: { price: string; liquidity: number }[];
  asks: { price: string; liquidity: number }[];
  closeoutBid: string;
  closeoutAsk: string;
}

interface OandaAccount {
  id: string;
  balance: string;
  currency: string;
  marginRate: string;
  leverage: string;
}

export class OandaConnector implements DataSourceConnector {
  readonly name = 'OANDA';
  readonly type: DataSourceType = 'oanda';

  private apiKey: string = '';
  private accountId: string = '';
  private baseUrl: string = '';
  private connected: boolean = false;
  private ws: WebSocket | null = null;
  private subscribers: Map<string, (data: any) => void> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 连接 OANDA API
   * 支持 practice（模拟）和 live（真实）两种环境
   */
  async connect(config: { apiKey: string; accountId: string; environment: 'practice' | 'live' }): Promise<ConnectionTestResult> {
    this.apiKey = config.apiKey;
    this.accountId = config.accountId;
    this.baseUrl = config.environment === 'practice' ? OANDA_PRACTICE_URL : OANDA_LIVE_URL;

    if (!this.apiKey || !this.accountId) {
      return { success: false, error: '请填写 API Key 和 Account ID' };
    }

    try {
      const startTime = performance.now();

      // 测试连接：获取账户信息
      const response = await fetch(`${this.baseUrl}/v3/accounts/${this.accountId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `OANDA API 错误 (${response.status}): ${errorText.slice(0, 200)}`,
        };
      }

      const data = await response.json();
      const account: OandaAccount = data.account;

      this.connected = true;

      return {
        success: true,
        latencyMs,
        accountInfo: {
          balance: parseFloat(account.balance),
          currency: account.currency,
          leverage: parseFloat(account.leverage) || 50,
        },
      };
    } catch (err: any) {
      this.connected = false;
      return {
        success: false,
        error: `连接失败: ${err?.message || '网络错误，请检查网络连接'}`,
      };
    }
  }

  /** 断开连接 */
  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.subscribers.clear();
  }

  /** OANDA 符号名 → 内部符号名 */
  private toOandaSymbol(symbol: string): string {
    return symbol.replace('/', '_');
  }

  /** 内部符号名 → OANDA 符号名 */
  private fromOandaSymbol(oandaSymbol: string): string {
    return oandaSymbol.replace('_', '/');
  }

  /** 获取实时报价 */
  async fetchQuotes(symbols: string[]): Promise<Quote[]> {
    if (!this.connected) {
      throw new Error('OANDA 未连接，请先连接');
    }

    const instruments = symbols.map(s => this.toOandaSymbol(s)).join(',');
    const response = await fetch(
      `${this.baseUrl}/v3/accounts/${this.accountId}/pricing?instruments=${instruments}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`获取报价失败: ${response.status}`);
    }

    const data = await response.json();
    return this.parsePrices(data.prices || []);
  }

  /** 解析 OANDA 价格数据 */
  private parsePrices(prices: OandaPrice[]): Quote[] {
    return prices.map((p) => {
      const symbol = this.fromOandaSymbol(p.instrument) as SymbolPair;
      const bid = parseFloat(p.closeoutBid);
      const ask = parseFloat(p.closeoutAsk);
      const spread = ask - bid;

      return {
        symbol,
        bid,
        ask,
        spread,
        changePips: 0,
        changePercent: 0,
        high24h: bid * 1.002,
        low24h: bid * 0.998,
        updatedAt: Date.now(),
        previousBid: bid,
      };
    });
  }

  /** 订阅实时报价（通过 WebSocket） */
  subscribeQuotes(symbols: string[], callback: (data: Quote) => void): () => void {
    const streamUrl = this.baseUrl.replace('api-fx', 'stream-fx');

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ws = new WebSocket(`${streamUrl}/v3/accounts/${this.accountId}/pricing/stream`, [
        `Authorization: Bearer ${this.apiKey}`,
      ]);

      this.ws.onopen = () => {
        const instruments = symbols.map(s => this.toOandaSymbol(s)).join(',');
        this.ws?.send(JSON.stringify({
          instruments,
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'PRICE') {
            const quote = this.parsePrices([data])[0];
            if (quote) {
              this.subscribers.forEach((cb) => cb(quote));
            }
          }
        } catch { /* 忽略解析错误 */ }
      };

      this.ws.onclose = () => {
        // 自动重连
        if (this.connected) {
          this.reconnectTimer = setTimeout(() => {
            this.subscribeQuotes(symbols, callback);
          }, 5000);
        }
      };

      this.ws.onerror = () => {
        // WebSocket 错误由 onclose 处理重连
      };
    }

    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.subscribers.set(id, callback);

    // 返回取消订阅函数
    return () => {
      this.subscribers.delete(id);
      if (this.subscribers.size === 0 && this.ws) {
        this.ws.close();
        this.ws = null;
      }
    };
  }

  isConnected(): boolean {
    return this.connected;
  }
}

/** 单例导出 */
export const oandaConnector = new OandaConnector();
