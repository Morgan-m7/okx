/**
 * iTick API 连接器
 * 免费外汇行情数据源
 *
 * 文档: https://doc.itick.org/
 * 注册: https://itick.io/zh-cn
 */
import type { Quote, SymbolPair, Candle, Timeframe } from '../types/market';
import type { DataSourceConnector, DataSourceType, ConnectionTestResult } from '../types/settings';

const ITICK_BASE_URL = 'https://api.itick.org';
const ITICK_WS_URL = 'wss://api.itick.org/forex';

/** 内部符号 → iTick 符号 */
const SYMBOL_TO_ITICK: Record<string, string> = {
  'EUR/USD': 'EURUSD',
  'GBP/USD': 'GBPUSD',
  'USD/JPY': 'USDJPY',
  'AUD/USD': 'AUDUSD',
  'USD/CAD': 'USDCAD',
  'USD/CHF': 'USDCHF',
  'NZD/USD': 'NZDUSD',
  'BTC/USDT': 'BTCUSD',
  'ETH/USDT': 'ETHUSD',
  'XAU/USD': 'XAUUSD',
};

const ITICK_TO_SYMBOL: Record<string, string> = {};
for (const [k, v] of Object.entries(SYMBOL_TO_ITICK)) {
  ITICK_TO_SYMBOL[v] = k;
}

export class iTickConnector implements DataSourceConnector {
  readonly name = 'iTick';
  readonly type: DataSourceType = 'custom';

  private token: string = '';
  private connected = false;
  private ws: WebSocket | null = null;
  private subscribers: Map<string, (data: Quote) => void> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;

  async connect(config: { apiKey: string; baseUrl?: string }): Promise<ConnectionTestResult> {
    this.token = config.apiKey;

    if (!this.token) {
      return { success: false, error: '请填写 iTick API Token' };
    }

    try {
      const startTime = performance.now();

      // 测试连接：获取 EUR/USD 报价
      const response = await fetch(
        `${ITICK_BASE_URL}/forex/quote?symbol=EURUSD`,
        { headers: { token: this.token }, signal: AbortSignal.timeout(5000) }
      );

      const latencyMs = Math.round(performance.now() - startTime);

      if (!response.ok) {
        return { success: false, error: `iTick 连接失败 (${response.status})，请检查 Token` };
      }

      this.connected = true;
      this.startPolling();

      return { success: true, latencyMs, accountInfo: { balance: 0, currency: 'USD', leverage: 1 } };
    } catch (err: any) {
      this.connected = false;
      return { success: false, error: `连接失败: ${err?.message || '网络错误'}` };
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.ws) { this.ws.close(); this.ws = null; }
    if (this.pollingTimer) { clearInterval(this.pollingTimer); this.pollingTimer = null; }
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.subscribers.clear();
  }

  private toSymbol(symbol: string): string {
    return SYMBOL_TO_ITICK[symbol] || symbol.replace('/', '');
  }

  private fromSymbol(s: string): string {
    return ITICK_TO_SYMBOL[s] || s;
  }

  async fetchQuotes(symbols: string[]): Promise<Quote[]> {
    if (!this.connected) throw new Error('未连接');

    const quotes: Quote[] = [];
    for (const symbol of symbols) {
      try {
        const itickSymbol = this.toSymbol(symbol);
        const resp = await fetch(
          `${ITICK_BASE_URL}/forex/quote?symbol=${itickSymbol}`,
          { headers: { token: this.token }, signal: AbortSignal.timeout(3000) }
        );
        if (resp.ok) {
          const d = await resp.json();
          const bid = parseFloat(d.bid || d.price || d.last || 0);
          const ask = parseFloat(d.ask || d.bid || 0);
          quotes.push({
            symbol: symbol as SymbolPair,
            bid, ask: ask || bid * 1.0001,
            spread: (ask || bid) - bid,
            changePips: parseFloat(d.change || 0),
            changePercent: parseFloat(d.changePercent || d.chg || 0),
            high24h: parseFloat(d.high || bid * 1.002),
            low24h: parseFloat(d.low || bid * 0.998),
            updatedAt: Date.now(),
            previousBid: bid,
          });
        }
      } catch { /* 单个失败不影响 */ }
    }
    return quotes;
  }

  private startPolling(): void {
    this.pollingTimer = setInterval(async () => {
      if (!this.connected) return;
      try {
        const symbols = Object.keys(SYMBOL_TO_ITICK).slice(0, 7);
        const quotes = await this.fetchQuotes(symbols);
        quotes.forEach(q => this.subscribers.forEach(cb => cb(q)));
      } catch { /* 静默 */ }
    }, 5000);
  }

  subscribeQuotes(symbols: string[], callback: (data: Quote) => void): () => void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ws = new WebSocket(ITICK_WS_URL);

      this.ws.onopen = () => {
        this.ws?.send(JSON.stringify({
          action: 'subscribe',
          channel: 'forex',
          symbols: symbols.map(s => this.toSymbol(s)),
          token: this.token,
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'quote' || msg.channel === 'forex') {
            const d = msg.data || msg;
            const symbol = this.fromSymbol(d.symbol) as SymbolPair;
            const bid = parseFloat(d.bid || d.price || 0);
            const ask = parseFloat(d.ask || 0);
            if (symbol && bid) {
              const quote: Quote = {
                symbol, bid, ask: ask || bid,
                spread: (ask || bid) - bid,
                changePips: 0, changePercent: 0,
                high24h: bid * 1.002, low24h: bid * 0.998,
                updatedAt: Date.now(), previousBid: bid,
              };
              this.subscribers.forEach(cb => cb(quote));
            }
          }
        } catch { /* 忽略 */ }
      };

      this.ws.onclose = () => {
        if (this.connected) {
          this.reconnectTimer = setTimeout(() => this.subscribeQuotes(symbols, callback), 5000);
        }
      };
    }

    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.subscribers.set(id, callback);
    return () => { this.subscribers.delete(id); if (this.subscribers.size === 0 && this.ws) { this.ws?.close(); this.ws = null; } };
  }

  isConnected(): boolean { return this.connected; }

  /** 获取历史 K 线 */
  async getHistory(symbol: string, timeframe: string, count: number): Promise<Candle[]> {
    const periodMap: Record<string, string> = { 'M1': '1m', 'M5': '5m', 'M15': '15m', 'M30': '30m', 'H1': '1h', 'H4': '4h', 'D1': '1d' };
    const period = periodMap[timeframe] || '1h';
    const resp = await fetch(
      `${ITICK_BASE_URL}/forex/kline?symbol=${this.toSymbol(symbol)}&period=${period}&limit=${count}`,
      { headers: { token: this.token } }
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.data || data.klines || data || []).slice(0, count).map((k: any) => ({
      symbol: symbol as SymbolPair,
      timeframe: timeframe as Timeframe,
      timestamp: k.timestamp || k.t || parseInt(k.ts || '0'),
      open: parseFloat(k.open || k.o || 0),
      high: parseFloat(k.high || k.h || 0),
      low: parseFloat(k.low || k.l || 0),
      close: parseFloat(k.close || k.c || 0),
      volume: parseFloat(k.volume || k.vol || k.v || 0),
    }));
  }
}

export const itickConnector = new iTickConnector();
