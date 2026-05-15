/**
 * Exness API 连接器
 * 提供接入 Exness 交易平台行情与交易的能力
 *
 * 基于 Exness Trading Platform API 规范
 */
import type { Quote, SymbolPair } from '../types/market';
import type { DataSourceConnector, DataSourceType, ConnectionTestResult, ExnessConfig } from '../types/settings';

/** Exness 平台支持的交易品种映射 */
const SYMBOL_TO_EXNESS: Record<string, string> = {
  'EUR/USD': 'EURUSD',
  'GBP/USD': 'GBPUSD',
  'USD/JPY': 'USDJPY',
  'AUD/USD': 'AUDUSD',
  'USD/CAD': 'USDCAD',
  'USD/CHF': 'USDCHF',
  'NZD/USD': 'NZDUSD',
  'BTC/USD': 'BTCUSD',
  'ETH/USD': 'ETHUSD',
  'XAU/USD': 'XAUUSD',
  'XAG/USD': 'XAGUSD',
};

const EXNESS_TO_SYMBOL: Record<string, string> = {};
for (const [k, v] of Object.entries(SYMBOL_TO_EXNESS)) {
  EXNESS_TO_SYMBOL[v] = k;
}

interface ExnessAsset {
  symbol: string;
  name: string;
  buyPrice: number;
  sellPrice: number;
  decimals: number;
}

interface ExnessPriceUpdate {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  spread: number;
  timestamp: number;
}

export class ExnessConnector implements DataSourceConnector {
  readonly name = 'Exness';
  readonly type: DataSourceType = 'exness';

  private config: ExnessConfig | null = null;
  private connected = false;
  private baseUrl: string = '';
  private wsUrl: string = '';
  private ws: WebSocket | null = null;
  private subscribers: Map<string, (data: Quote) => void> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private assetCache: Map<string, ExnessAsset> = new Map();

  async connect(config: ExnessConfig): Promise<ConnectionTestResult> {
    this.config = config;

    if (!config.apiKey || !config.serverUrl) {
      return { success: false, error: '请填写 API Key 和服务器地址' };
    }

    // 构建 URL
    const serverUrl = config.serverUrl.replace(/\/+$/, '');
    this.baseUrl = `${serverUrl}/api/v1`;
    this.wsUrl = serverUrl.replace(/^http/, 'ws') + ':3492';

    try {
      const startTime = performance.now();

      // 测试连接：获取资产列表
      const response = await fetch(`${this.baseUrl}/assets`, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (!response.ok) {
        return {
          success: false,
          error: `Exness 服务器连接失败 (${response.status})`,
        };
      }

      const data = await response.json();
      if (data.assets) {
        data.assets.forEach((asset: ExnessAsset) => {
          this.assetCache.set(asset.symbol, asset);
        });
      }

      // 测试账户余额
      let balance = 0;
      try {
        const balResp = await fetch(`${this.baseUrl}/order/balance`, {
          headers: { Authorization: `Bearer ${config.apiKey}` },
        });
        if (balResp.ok) {
          const balData = await balResp.json();
          balance = balData.usd_balance || 0;
        }
      } catch { /* 余额查询可选 */ }

      this.connected = true;

      return {
        success: true,
        latencyMs,
        accountInfo: {
          balance,
          currency: 'USD',
          leverage: 100,
        },
      };
    } catch (err: any) {
      this.connected = false;
      return {
        success: false,
        error: `连接失败: ${err?.message || '无法连接到服务器'}`,
      };
    }
  }

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

  private toExnessSymbol(symbol: string): string {
    return SYMBOL_TO_EXNESS[symbol] || symbol.replace('/', '');
  }

  private fromExnessSymbol(exSymbol: string): string {
    return EXNESS_TO_SYMBOL[exSymbol] || (exSymbol.length > 6 ? exSymbol.replace(/(.{3})(.*)/, '$1/$2') : exSymbol);
  }

  async fetchQuotes(symbols: string[]): Promise<Quote[]> {
    const quotes: Quote[] = [];

    for (const symbol of symbols) {
      const exSymbol = this.toExnessSymbol(symbol);
      const asset = this.assetCache.get(exSymbol);

      if (asset) {
        quotes.push({
          symbol: symbol as SymbolPair,
          bid: asset.buyPrice,
          ask: asset.sellPrice,
          spread: asset.sellPrice - asset.buyPrice,
          changePips: 0,
          changePercent: 0,
          high24h: asset.buyPrice * 1.002,
          low24h: asset.buyPrice * 0.998,
          updatedAt: Date.now(),
          previousBid: asset.buyPrice,
        });
      }
    }

    return quotes;
  }

  /** 订阅 Exness 实时行情（WebSocket） */
  subscribeQuotes(symbols: string[], callback: (data: Quote) => void): () => void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        // Exness 自动广播所有价格更新，无需订阅
        console.log('Exness WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // Exness 价格更新
          if (msg.type === 'price_update') {
            const p: ExnessPriceUpdate = msg.data;
            const symbol = this.fromExnessSymbol(p.symbol) as SymbolPair;

            // 只转发用户关注的品种
            if (symbols.includes(symbol) || symbols.some(s => this.toExnessSymbol(s) === p.symbol)) {
              const quote: Quote = {
                symbol,
                bid: p.bid,
                ask: p.ask,
                spread: p.spread,
                changePips: 0,
                changePercent: 0,
                high24h: p.bid * 1.002,
                low24h: p.bid * 0.998,
                updatedAt: p.timestamp || Date.now(),
                previousBid: p.bid,
              };
              this.subscribers.forEach(cb => cb(quote));
            }
          }

          // K 线更新（可选）
          if (msg.type === 'candle') {
            // 可由图表页面独立处理
          }
        } catch { /* 忽略解析错误 */ }
      };

      this.ws.onclose = () => {
        if (this.connected) {
          this.reconnectTimer = setTimeout(() => {
            this.subscribeQuotes(symbols, callback);
          }, 5000);
        }
      };

      this.ws.onerror = () => {
        // onclose 会处理重连
      };
    }

    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.subscribers.set(id, callback);

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

export const exnessConnector = new ExnessConnector();
