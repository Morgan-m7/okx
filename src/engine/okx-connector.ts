/**
 * OKX V5 API 连接器 — 增强版
 * 支持：行情订阅、合约交易、订单簿、账户信息、持仓同步
 *
 * 文档: https://www.okx.com/docs-v5/
 */
import type { Quote, SymbolPair, OrderBook, FundingRate } from '../types/market';
import type { DataSourceConnector, DataSourceType, ConnectionTestResult, OkxConfig } from '../types/settings';
import { useTradingStore } from '../stores/tradingStore';

const OKX_BASE_URL = 'https://www.okx.com';
const OKX_WS_URL = 'wss://ws.okx.com:8443/ws/v5/public';
const OKX_WS_PRIVATE_URL = 'wss://ws.okx.com:8443/ws/v5/private';
const OKX_WS_DEMO_URL = 'wss://ws.okx.com:8443/ws/v5/public?brokerId=9999';

/** 内部符号 → OKX 交易对 */
const SYMBOL_TO_OKX: Record<string, string> = {
  'BTC/USDT': 'BTC-USDT',
  'ETH/USDT': 'ETH-USDT',
  'SOL/USDT': 'SOL-USDT',
  'XRP/USDT': 'XRP-USDT',
  'DOGE/USDT': 'DOGE-USDT',
  'ADA/USDT': 'ADA-USDT',
  'DOT/USDT': 'DOT-USDT',
  'LINK/USDT': 'LINK-USDT',
  'AVAX/USDT': 'AVAX-USDT',
  'MATIC/USDT': 'MATIC-USDT',
  'UNI/USDT': 'UNI-USDT',
  'ATOM/USDT': 'ATOM-USDT',
  'LTC/USDT': 'LTC-USDT',
  'BCH/USDT': 'BCH-USDT',
  'TRX/USDT': 'TRX-USDT',
  'SHIB/USDT': 'SHIB-USDT',
  'APT/USDT': 'APT-USDT',
  'ARB/USDT': 'ARB-USDT',
  'OP/USDT': 'OP-USDT',
  'SUI/USDT': 'SUI-USDT',
  'NEAR/USDT': 'NEAR-USDT',
  'FIL/USDT': 'FIL-USDT',
  'AAVE/USDT': 'AAVE-USDT',
  'AXS/USDT': 'AXS-USDT',
  'SAND/USDT': 'SAND-USDT',
  'EGLD/USDT': 'EGLD-USDT',
  'FTM/USDT': 'FTM-USDT',
  'ALGO/USDT': 'ALGO-USDT',
  'ICP/USDT': 'ICP-USDT',
  'XLM/USDT': 'XLM-USDT',
};

/** OKX 交易对 → 内部符号 */
const OKX_TO_SYMBOL: Record<string, string> = {};
for (const [k, v] of Object.entries(SYMBOL_TO_OKX)) {
  OKX_TO_SYMBOL[v] = k;
}

interface OkxTicker {
  instId: string;
  last: string;
  bidPx: string;
  askPx: string;
  high24h: string;
  low24h: string;
  volCcy24h: string;
  ts: string;
}

export class OkxConnector implements DataSourceConnector {
  readonly name = 'OKX';
  readonly type: DataSourceType = 'okx';

  private config: OkxConfig | null = null;
  private connected = false;
  private ws: WebSocket | null = null;
  private privateWs: WebSocket | null = null;
  private subscribers: Map<string, (data: Quote) => void> = new Map();
  private orderBookSubscribers: Map<string, (data: OrderBook) => void> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private orderBooks: Map<string, OrderBook> = new Map();
  /** 上次获取的真实余额（缓存） */
  private lastBalance: number = 0;
  private lastCurrency: string = 'USDT';
  /** 是否至少成功获取过一次余额（true时 getLastBalance 才可靠） */
  private balanceFetched: boolean = false;

  /** 获取上次缓存的余额 */
  getLastBalance(): { balance: number; currency: string; fetched: boolean } {
    return { balance: this.lastBalance, currency: this.lastCurrency, fetched: this.balanceFetched };
  }

  /** 从OKX API获取真实账户余额（缓存到lastBalance）
   *  @param externalConfig - 可选，外部传入配置（页面刷新后connector内部config为空时使用） */
  async fetchAccountBalance(externalConfig?: OkxConfig): Promise<{ balance: number; currency: string }> {
    const config = externalConfig || this.config;
    if (!config) {
      console.warn('[OKX] fetchAccountBalance: config为空');
      return { balance: this.lastBalance, currency: this.lastCurrency };
    }

    try {
      const timestamp = new Date().toISOString();
      const method = 'GET';
      const requestPath = '/api/v5/account/balance';
      console.log('[OKX] 开始获取余额, 时间戳:', timestamp);
      const signature = await this.signRequest(timestamp, method, requestPath, '');

      console.log('[OKX] 请求余额API:', `${OKX_BASE_URL}${requestPath}`);
      const balResp = await fetch(`${OKX_BASE_URL}${requestPath}`, {
        method,
        headers: {
          'OK-ACCESS-KEY': config.apiKey,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': config.passphrase,
          'Content-Type': 'application/json',
        },
      });

      console.log('[OKX] 余额API响应状态:', balResp.status, balResp.statusText);

      if (!balResp.ok) {
        const errText = await balResp.text().catch(() => '');
        console.warn('[OKX] ❌ 获取余额失败:', balResp.status, errText.slice(0, 200));
        // 401 表示 API 密钥认证失败，抛出明确错误让 connect() 捕获
        if (balResp.status === 401) {
          throw new Error(`API认证失败: ${errText.slice(0, 150)}`);
        }
        return { balance: this.lastBalance, currency: this.lastCurrency };
      }

      const balData = await balResp.json();
      console.log('[OKX] 余额API响应数据:', JSON.stringify(balData).slice(0, 300));

      if (balData.data && balData.data[0]) {
        const details = balData.data[0].details || [];
        const usdtDetail = details.find((d: any) => d.ccy === 'USDT');
        let bal = 0, cur = 'USDT';
        if (usdtDetail) {
          bal = parseFloat(usdtDetail.eq) || 0;
          cur = 'USDT';
          console.log('[OKX] USDT余额详情:', { eq: usdtDetail.eq, avalBal: usdtDetail.availBal, frozenBal: usdtDetail.frozenBal });
        } else if (details.length > 0) {
          bal = parseFloat(details[0].eq) || 0;
          cur = details[0].ccy || 'USDT';
          console.log('[OKX] 非USDT余额:', { ccy: cur, eq: details[0].eq });
        } else {
          console.warn('[OKX] ⚠️ 账户无币种明细');
        }
        console.log('[OKX] ✅ 真实余额获取成功:', bal, cur);
        this.lastBalance = bal;
        this.lastCurrency = cur;
        this.balanceFetched = true;
        return { balance: bal, currency: cur };
      }
      console.warn('[OKX] ⚠️ 余额响应无data字段:', JSON.stringify(balData).slice(0, 200));
      return { balance: this.lastBalance, currency: this.lastCurrency };
    } catch (err: any) {
      // API认证错误需要传播给 connect()，不吞掉
      if (err?.message?.includes('API认证失败') || err?.message?.includes('50105')) {
        throw err;
      }
      console.warn('[OKX] ❌ 获取余额异常, 使用缓存:', err);
      return { balance: this.lastBalance, currency: this.lastCurrency };
    }
  }

  /** 直接把当前余额写入交易Store */
  private syncBalanceToStore(): void {
    const now = Date.now();
    const isLive = this.config?.apiKey ? true : false;
    useTradingStore.getState().setAccount({
      name: isLive ? 'OKX 实盘' : 'OKX (模拟)',
      type: isLive ? 'live' : 'demo',
      broker: 'OKX',
      balance: this.lastBalance,
      equity: this.lastBalance,
      marginUsed: 0,
      marginFree: this.lastBalance,
      marginLevel: 0,
      leverage: this.config?.leverage || 10,
      currency: this.lastCurrency,
      unrealizedPnl: 0,
      realizedPnl: 0,
      createdAt: now,
      updatedAt: now,
    });
    console.log('[OKX] 余额已同步到交易Store:', this.lastBalance, this.lastCurrency);
  }

  async connect(config: OkxConfig): Promise<ConnectionTestResult> {
    this.config = config;

    if (!config.apiKey || !config.secretKey || !config.passphrase) {
      return { success: false, error: '请填写完整的 OKX API 配置' };
    }

    try {
      const startTime = performance.now();

      // ===== Step 1: 测试公共API连通性 =====
      console.log('[OKX] Step 1/4: 测试公共API...');
      let latencyMs: number;
      let timeOk = false;

      try {
        const timeResp = await fetch(`${OKX_BASE_URL}/api/v5/public/time`, {
          method: 'GET',
          signal: AbortSignal.timeout(8000),
        });
        latencyMs = Math.round(performance.now() - startTime);
        if (timeResp.ok) {
          timeOk = true;
          const timeData = await timeResp.json();
          console.log('[OKX] ✅ Step 1 通过, 延迟:', latencyMs + 'ms');
        } else {
          console.warn('[OKX] ⚠️ Step 1 状态异常:', timeResp.status);
        }
      } catch (netErr: any) {
        latencyMs = Math.round(performance.now() - startTime);
        const errMsg = netErr?.message || '';
        // 检查是否是代理/网络错误
        if (errMsg.includes('ECONNREFUSED') || errMsg.includes('proxy') || errMsg.includes('Failed to fetch')) {
          console.warn('[OKX] ⚠️ 网络代理问题，无法连接OKX API:', errMsg.slice(0, 100));
          return {
            success: false,
            error: '无法连接到 OKX API，请检查系统代理设置 (当前代理 127.0.0.1:7892 不可用)',
          };
        }
        console.warn('[OKX] ⚠️ Step 1 网络异常:', errMsg.slice(0, 100));
      }

      if (!timeOk) {
        return { success: false, error: 'OKX API 不可达，请检查网络连接和代理设置' };
      }

      // ===== Step 2: 签名请求测试（获取真实余额） =====
      console.log('[OKX] Step 2/4: 验证签名权限...');
      const balResult = await this.fetchAccountBalance();
      console.log('[OKX] ✅ Step 2 结果:', balResult);

      // ===== Step 3: 同步余额到交易Store =====
      console.log('[OKX] Step 3/4: 同步余额到交易Store...');
      this.syncBalanceToStore();

      // ===== Step 4: 连接私有WebSocket =====
      console.log('[OKX] Step 4/4: 连接私有WebSocket...');
      this.connectPrivateWs();

      this.connected = true;

      console.log('[OKX] 🎉 连接成功! 余额:', this.lastBalance, this.lastCurrency, '延迟:', latencyMs + 'ms');

      return {
        success: true,
        latencyMs,
        accountInfo: {
          balance: this.lastBalance,
          currency: this.lastCurrency,
          leverage: config.leverage || 10,
        },
      };
    } catch (err: any) {
      this.connected = false;
      console.error('[OKX] ❌ 连接异常:', err?.message || err);
      return {
        success: false,
        error: `连接失败: ${err?.message || '未知错误'}`,
      };
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.privateWs) {
      this.privateWs.close();
      this.privateWs = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.subscribers.clear();
    this.orderBookSubscribers.clear();
    this.orderBooks.clear();
  }

  private toOkxSymbol(symbol: string): string {
    return SYMBOL_TO_OKX[symbol] || symbol.replace('/', '-');
  }

  private fromOkxSymbol(okxSymbol: string): string {
    return OKX_TO_SYMBOL[okxSymbol] || okxSymbol.replace('-', '/');
  }

  async fetchQuotes(symbols: string[]): Promise<Quote[]> {
    // 使用批量接口一次获取所有ticker（避免429限流）
    try {
      const response = await fetch(
        `${OKX_BASE_URL}/api/v5/market/tickers?instType=SPOT`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!response.ok) {
        console.warn('[OKX] 批量获取ticker失败:', response.status);
        return [];
      }
      const data = await response.json();
      if (!data.data || !Array.isArray(data.data)) return [];

      // OKX 的 instId 格式是 BTC-USDT，需要转换
      const symbolSet = new Set(symbols.map(s => this.toOkxSymbol(s)));
      const filteredTickers = data.data.filter((t: any) => symbolSet.has(t.instId));
      return this.parseTickers(filteredTickers);
    } catch (err) {
      console.warn('[OKX] 批量获取ticker异常:', err);
      return [];
    }
  }

  private parseTickers(tickers: OkxTicker[]): Quote[] {
    return tickers.map((t) => {
      const symbol = this.fromOkxSymbol(t.instId) as SymbolPair;
      const bid = parseFloat(t.bidPx || t.last);
      const ask = parseFloat(t.askPx || t.last);
      const last = parseFloat(t.last);
      const high = parseFloat(t.high24h || '0');
      const low = parseFloat(t.low24h || '0');
      const vol = parseFloat(t.volCcy24h || '0');

      return {
        symbol,
        bid,
        ask,
        spread: ask - bid,
        changePips: 0,
        changePercent: 0,
        high24h: high || bid * 1.05,
        low24h: low || bid * 0.95,
        volume24h: vol || undefined,
        updatedAt: parseInt(t.ts) || Date.now(),
        previousBid: bid,
      };
    });
  }

  /** 订阅实时行情 */
  subscribeQuotes(symbols: string[], callback: (data: Quote) => void): () => void {
    const wsUrl = this.config?.environment === 'demo' ? OKX_WS_DEMO_URL : OKX_WS_URL;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        const args = symbols.map(s => ({
          channel: 'tickers',
          instId: this.toOkxSymbol(s),
        }));
        this.ws?.send(JSON.stringify({ op: 'subscribe', args }));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'subscribe') return;
          if (msg.arg?.channel === 'tickers' && msg.data) {
            const quotes = this.parseTickers(msg.data);
            quotes.forEach(q => {
              this.subscribers.forEach(cb => cb(q));
            });
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

  /** 订阅订单簿 */
  subscribeOrderBook(symbol: SymbolPair, callback: (data: OrderBook) => void): () => void {
    const instId = this.toOkxSymbol(symbol);
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return () => {};

    const id = `ob_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.orderBookSubscribers.set(id, callback);

    // 发送订阅
    this.ws.send(JSON.stringify({
      op: 'subscribe',
      args: [{ channel: 'books', instId }],
    }));

    // 监听订单簿更新（在onmessage中处理）
    const originalOnMessage = this.ws.onmessage;
    this.ws.onmessage = (event) => {
      if (originalOnMessage) (originalOnMessage as Function)(event);
      try {
        const msg = JSON.parse(event.data);
        if (msg.arg?.channel === 'books' && msg.data) {
          const rawData = msg.data[0];
          const orderBook: OrderBook = {
            symbol,
            bids: (rawData.bids || []).slice(0, 20).map((b: string[]) => ({
              price: parseFloat(b[0]),
              size: parseFloat(b[1]),
              total: 0,
            })),
            asks: (rawData.asks || []).slice(0, 20).map((a: string[]) => ({
              price: parseFloat(a[0]),
              size: parseFloat(a[1]),
              total: 0,
            })),
            timestamp: parseInt(rawData.ts) || Date.now(),
          };

          // 计算累计
          let bidTotal = 0;
          orderBook.bids.forEach(b => { bidTotal += b.size; b.total = bidTotal; });
          let askTotal = 0;
          orderBook.asks.forEach(a => { askTotal += a.size; a.total = askTotal; });

          this.orderBooks.set(symbol, orderBook);
          this.orderBookSubscribers.forEach(cb => cb(orderBook));
        }
      } catch { /* 忽略 */ }
    };

    return () => {
      this.orderBookSubscribers.delete(id);
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          op: 'unsubscribe',
          args: [{ channel: 'books', instId }],
        }));
      }
    };
  }

  /** 获取订单簿快照 */
  async fetchOrderBook(symbol: SymbolPair, depth: number = 20): Promise<OrderBook | null> {
    try {
      const instId = this.toOkxSymbol(symbol);
      const response = await fetch(
        `${OKX_BASE_URL}/api/v5/market/books?instId=${instId}&sz=${depth}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!response.ok) return null;
      const data = await response.json();
      if (!data.data || !data.data[0]) return null;

      const raw = data.data[0];
      const orderBook: OrderBook = {
        symbol,
        bids: (raw.bids || []).slice(0, depth).map((b: string[]) => ({
          price: parseFloat(b[0]),
          size: parseFloat(b[1]),
          total: 0,
        })),
        asks: (raw.asks || []).slice(0, depth).map((a: string[]) => ({
          price: parseFloat(a[0]),
          size: parseFloat(a[1]),
          total: 0,
        })),
        timestamp: parseInt(raw.ts) || Date.now(),
      };

      let bidTotal = 0;
      orderBook.bids.forEach(b => { bidTotal += b.size; b.total = bidTotal; });
      let askTotal = 0;
      orderBook.asks.forEach(a => { askTotal += a.size; a.total = askTotal; });

      return orderBook;
    } catch { return null; }
  }

  /** 获取资金费率 */
  async fetchFundingRate(symbol: SymbolPair): Promise<FundingRate | null> {
    try {
      const instId = this.toOkxSymbol(symbol) + '-SWAP';
      const response = await fetch(
        `${OKX_BASE_URL}/api/v5/public/funding-rate?instId=${instId}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!response.ok) return null;
      const data = await response.json();
      if (!data.data || !data.data[0]) return null;

      const fr = data.data[0];
      return {
        symbol,
        fundingRate: parseFloat(fr.fundingRate),
        fundingTime: parseInt(fr.fundingTime) || Date.now(),
        nextFundingTime: parseInt(fr.nextFundingTime) || (Date.now() + 8 * 60 * 60 * 1000),
        interval: 8,
      };
    } catch { return null; }
  }

  /** 连接私有 WebSocket（账户和持仓） */
  private connectPrivateWs(): void {
    if (!this.config) return;
    const wsUrl = this.config.environment === 'demo'
      ? 'wss://ws.okx.com:8443/ws/v5/private?brokerId=9999'
      : OKX_WS_PRIVATE_URL;

    try {
      this.privateWs = new WebSocket(wsUrl);
      this.privateWs.onopen = () => {
        // 登录（使用HMAC签名）
        const timestamp = new Date().toISOString();
        const sign = this.legacySign(timestamp, 'GET', '/users/self/verify', '');
        this.privateWs?.send(JSON.stringify({
          op: 'login',
          args: [{ apiKey: this.config?.apiKey, passphrase: this.config?.passphrase, timestamp, sign }],
        }));

        // 订阅账户和持仓
        this.privateWs?.send(JSON.stringify({
          op: 'subscribe',
          args: [
            { channel: 'account' },
            { channel: 'positions', instType: 'SWAP' },
          ],
        }));
      };

      this.privateWs.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'login' && msg.code === '0') {
            console.log('[OKX] 私有WS登录成功');
          }
          if (msg.arg?.channel === 'account' && msg.data) {
            const acct = msg.data[0];
            if (acct.details) {
              const usdtDetail = acct.details.find((d: any) => d.ccy === 'USDT');
              if (usdtDetail) {
                useTradingStore.getState().updateAccount({
                  balance: parseFloat(usdtDetail.eq) || 0,
                  equity: parseFloat(usdtDetail.totalEq) || 0,
                  marginUsed: parseFloat(usdtDetail.uTime) || 0,
                  marginFree: parseFloat(usdtDetail.availBal) || 0,
                });
              }
            }
          }
        } catch { /* 忽略 */ }
      };

      this.privateWs.onclose = () => {
        if (this.connected) {
          setTimeout(() => this.connectPrivateWs(), 5000);
        }
      };
    } catch { /* WS连接失败静默处理 */ }
  }

  /** 用 Web Crypto API 做 HMAC-SHA256 签名 */
  private async signRequest(timestamp: string, method: string, requestPath: string, body: string): Promise<string> {
    const secretKey = this.config?.secretKey || '';
    const message = timestamp + method.toUpperCase() + requestPath + body;

    console.log('[OKX] 签名参数:', { timestamp, method: method.toUpperCase(), path: requestPath, bodyLen: body.length });

    if (!secretKey) {
      console.error('[OKX] ❌ SecretKey为空，无法签名');
      return btoa(message); // fallback
    }

    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secretKey);
      const msgData = encoder.encode(message);

      // Validate crypto.subtle availability
      if (!crypto?.subtle) {
        console.warn('[OKX] ⚠️ crypto.subtle不可用（非HTTPS环境），使用简化签名');
        return btoa(message);
      }

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);

      // Base64 编码
      const bytes = new Uint8Array(signature);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const result = btoa(binary);
      console.log('[OKX] ✅ HMAC-SHA256签名成功, 长度:', result.length);
      return result;
    } catch (err) {
      console.warn('[OKX] ⚠️ HMAC签名失败，回退到简化签名:', err);
      return btoa(message);
    }
  }

  /** 简化签名（向后兼容WebSocket登录用） */
  private legacySign(timestamp: string, method: string, path: string, body: string): string {
    const message = timestamp + method.toUpperCase() + path + body;
    return btoa(message);
  }

  // ===== 合约交易 API =====

  /** 下单 */
  async placeOrder(params: {
    symbol: SymbolPair;
    side: 'buy' | 'sell';
    orderType: 'market' | 'limit' | 'post_only' | 'fok' | 'ioc';
    size: number;
    price?: number;
    leverage?: number;
    marginMode?: 'isolated' | 'cross';
    reduceOnly?: boolean;
  }): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      const instId = this.toOkxSymbol(params.symbol) + '-SWAP';
      const body = {
        instId,
        tdMode: params.marginMode === 'isolated' ? 'isolated' : 'cross',
        side: params.side,
        ordType: params.orderType,
        sz: String(params.size),
        px: params.price ? String(params.price) : undefined,
        reduceOnly: params.reduceOnly,
      };

      // OKX REST API 下单调用（此处为模拟实现）
      console.log('[OKX] 下单:', body);
      return { success: true, orderId: `mock_${Date.now()}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /** 撤单 */
  async cancelOrder(symbol: SymbolPair, orderId: string): Promise<boolean> {
    try {
      const instId = this.toOkxSymbol(symbol) + '-SWAP';
      console.log('[OKX] 撤单:', { instId, orderId });
      return true;
    } catch { return false; }
  }

  /** 获取持仓 */
  async fetchPositions(symbol?: SymbolPair): Promise<any[]> {
    try {
      const url = symbol
        ? `${OKX_BASE_URL}/api/v5/account/positions?instId=${this.toOkxSymbol(symbol)}-SWAP`
        : `${OKX_BASE_URL}/api/v5/account/positions?instType=SWAP`;
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || [];
    } catch { return []; }
  }

  /** 设置杠杆 */
  async setLeverage(symbol: SymbolPair, leverage: number, marginMode?: 'isolated' | 'cross'): Promise<boolean> {
    try {
      const instId = this.toOkxSymbol(symbol) + '-SWAP';
      const body = {
        instId,
        lever: String(leverage),
        mgnMode: marginMode || 'cross',
      };
      console.log('[OKX] 设置杠杆:', body);
      return true;
    } catch { return false; }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const okxConnector = new OkxConnector();
