/**
 * 加密货币合约交易引擎
 * 模拟 OKX 永续合约 (Perpetual Swap) 的交易逻辑
 * 支持: 逐仓/全仓、杠杆调节、多空方向、强平计算、资金费率
 */
import { v4 as uuidv4 } from 'uuid';
import type { SymbolPair, Quote } from '../types/market';
import type {
  ContractPosition,
  CryptoOrder,
  CryptoOrderType,
  OrderSide,
  PositionSide,
  MarginMode,
  OrderStatus,
} from '../types/trading';
import { useTradingStore } from '../stores/tradingStore';
import { DEFAULTS } from '../constants/defaults';

/** 合约面值（USDT本位永续合约每张面值） */
const CONTRACT_MULTIPLIER = 0.1; // 每张 0.1 USDT

/** 默认杠杆 */
const DEFAULT_LEVERAGE = 10;

/** 最大杠杆 */
const MAX_LEVERAGE = 125;

/** 最低维持保证金率（全仓） */
const MAINTENANCE_MARGIN_RATE = 0.005; // 0.5%

/** 最低维持保证金率（逐仓） */
const ISOLATED_MAINTENANCE_RATE = 0.006; // 0.6%

export class CryptoTradingEngine {
  private positions: Map<string, ContractPosition> = new Map();
  private orders: Map<string, CryptoOrder> = new Map();
  private currentPrices: Map<string, number> = new Map();
  private leverage: number = DEFAULT_LEVERAGE;
  private marginMode: MarginMode = 'cross';
  private totalCollateral: number = 100000; // 总权益 USDT

  constructor() {
    this.initAccount();
  }

  /** 初始化账户 */
  private initAccount(): void {
    const account = useTradingStore.getState().account;
    this.totalCollateral = account.balance || 100000;
    this.leverage = account.leverage || DEFAULT_LEVERAGE;
  }

  /** 设置杠杆 */
  setLeverage(leverage: number): void {
    this.leverage = Math.max(1, Math.min(MAX_LEVERAGE, Math.round(leverage)));
    useTradingStore.getState().updateAccount({ leverage: this.leverage });
  }

  /** 切换保证金模式 */
  setMarginMode(mode: MarginMode): void {
    this.marginMode = mode;
    useTradingStore.getState().updateAccount({
      account: {
        ...useTradingStore.getState().account,
        marginMode: mode,
      } as any,
    } as any);
  }

  /** 更新当前价格 */
  updatePrice(symbol: SymbolPair, price: number): void {
    const prevPrice = this.currentPrices.get(symbol) ?? price;
    this.currentPrices.set(symbol, price);

    // 更新持仓的标记价格和未实现盈亏
    const positions = Array.from(this.positions.values()).filter(p => p.symbol === symbol);
    for (const pos of positions) {
      pos.markPrice = price;
      pos.unrealizedPnl = this.calculateUnrealizedPnl(pos);
      pos.roi = pos.margin > 0 ? (pos.unrealizedPnl / pos.margin) * 100 : 0;
      pos.liqPrice = this.calculateLiquidationPrice(pos);
      pos.updatedAt = Date.now();
      useTradingStore.getState().updateContractPosition(pos.id, { ...pos });
    }

    // 检查强平
    this.checkLiquidations(symbol);

    // 更新账户权益
    this.updateAccountEquity();
  }

  /** 用报价更新 */
  updateFromQuote(quote: Quote): void {
    const price = (quote.bid + quote.ask) / 2;
    this.updatePrice(quote.symbol, price);
  }

  /** 计算未实现盈亏 */
  private calculateUnrealizedPnl(pos: ContractPosition): number {
    const priceDiff = pos.positionSide === 'long'
      ? pos.markPrice - pos.avgOpenPrice
      : pos.avgOpenPrice - pos.markPrice;
    // PnL = 价差 × 张数 × 合约面值
    return priceDiff * pos.size * CONTRACT_MULTIPLIER;
  }

  /** 计算强平价格 */
  calculateLiquidationPrice(pos: ContractPosition): number {
    if (pos.size <= 0 || pos.avgOpenPrice <= 0) return 0;

    const mmRate = pos.marginMode === 'isolated'
      ? ISOLATED_MAINTENANCE_RATE
      : MAINTENANCE_MARGIN_RATE;

    // 跨全仓模式下，维持保证金基于总权益
    if (pos.marginMode === 'cross') {
      const totalEquity = this.totalCollateral;
      const mm = pos.avgOpenPrice * pos.size * CONTRACT_MULTIPLIER * mmRate;
      if (pos.positionSide === 'long') {
        return (pos.avgOpenPrice * pos.margin - totalEquity + mm) /
          (pos.size * CONTRACT_MULTIPLIER * (mmRate - 1)) || 0;
      } else {
        return (pos.avgOpenPrice * pos.margin + totalEquity - mm) /
          (pos.size * CONTRACT_MULTIPLIER * (1 - mmRate)) || 0;
      }
    }

    // 逐仓模式
    const margin = pos.margin;
    const mm = pos.avgOpenPrice * pos.size * CONTRACT_MULTIPLIER * mmRate;
    if (pos.positionSide === 'long') {
      return (pos.avgOpenPrice * pos.size * CONTRACT_MULTIPLIER - margin + mm) /
        (pos.size * CONTRACT_MULTIPLIER * (1 - mmRate)) || 0;
    } else {
      return (pos.avgOpenPrice * pos.size * CONTRACT_MULTIPLIER + margin - mm) /
        (pos.size * CONTRACT_MULTIPLIER * (mmRate - 1)) || 0;
    }
  }

  /** 检查强平 */
  private checkLiquidations(symbol: SymbolPair): void {
    const positions = Array.from(this.positions.values()).filter(p => p.symbol === symbol);
    for (const pos of positions) {
      if (pos.liqPrice <= 0) continue;
      const triggered = pos.positionSide === 'long'
        ? pos.markPrice <= pos.liqPrice
        : pos.markPrice >= pos.liqPrice;

      if (triggered) {
        console.warn(`[CryptoEngine] 强平触发: ${pos.symbol} ${pos.positionSide}`);
        this.liquidatePosition(pos.id);
      }
    }
  }

  /** 强平持仓 */
  liquidatePosition(positionId: string): void {
    const pos = this.positions.get(positionId);
    if (!pos) return;

    // 强平后保证金损失
    const loss = Math.abs(pos.unrealizedPnl);
    this.totalCollateral = Math.max(0, this.totalCollateral - pos.margin - loss);

    this.positions.delete(positionId);
    useTradingStore.getState().removeContractPosition(positionId);
    this.updateAccountEquity();
  }

  /** 开仓 */
  openPosition(params: {
    symbol: SymbolPair;
    side: PositionSide;
    orderType: CryptoOrderType;
    price: number;
    size: number; // 张数
    leverage?: number;
    marginMode?: MarginMode;
    sl?: number;
    tp?: number;
  }): ContractPosition {
    const lev = params.leverage || this.leverage;
    const marginMode = params.marginMode || this.marginMode;

    // 计算所需保证金
    const notional = params.size * CONTRACT_MULTIPLIER * params.price;
    const marginRequired = notional / lev;

    // 检查可用余额
    if (marginMode === 'cross') {
      const usedMargin = this.calculateTotalUsedMargin();
      if (usedMargin + marginRequired > this.totalCollateral) {
        throw new Error(`INSUFFICIENT_MARGIN: 需要 ${marginRequired.toFixed(2)} USDT, 可用 ${(this.totalCollateral - usedMargin).toFixed(2)} USDT`);
      }
    }

    // 计算强平价格
    const liqPrice = 0; // 开仓时设为0，下次更新价格时自动计算

    const position: ContractPosition = {
      id: uuidv4(),
      symbol: params.symbol,
      positionSide: params.side,
      size: params.size,
      avgOpenPrice: params.price,
      markPrice: params.price,
      liqPrice,
      margin: marginRequired,
      marginMode,
      leverage: lev,
      unrealizedPnl: 0,
      realizedPnl: 0,
      roi: 0,
      fundingFee: 0,
      sl: params.tp ?? null,  // TP → take profit price
      tp: params.sl ?? null,  // SL → stop loss price
      openTime: Date.now(),
      updatedAt: Date.now(),
    };

    this.positions.set(position.id, position);
    useTradingStore.getState().addContractPosition(position);

    this.updateAccountEquity();
    return position;
  }

  /** 平仓 */
  closePosition(positionId: string, price?: number): void {
    const pos = this.positions.get(positionId);
    if (!pos) return;

    const closePrice = price ?? this.currentPrices.get(pos.symbol) ?? pos.markPrice;
    const pnl = pos.positionSide === 'long'
      ? (closePrice - pos.avgOpenPrice) * pos.size * CONTRACT_MULTIPLIER
      : (pos.avgOpenPrice - closePrice) * pos.size * CONTRACT_MULTIPLIER;

    // 结算
    this.totalCollateral += pnl;
    pos.realizedPnl += pnl;

    this.positions.delete(positionId);
    useTradingStore.getState().removeContractPosition(positionId);

    // 记录交易到历史
    useTradingStore.getState().addTradeRecord({
      id: uuidv4(),
      symbol: pos.symbol,
      direction: pos.positionSide === 'long' ? 'buy' : 'sell',
      volume: pos.size,
      openPrice: pos.avgOpenPrice,
      closePrice,
      openTime: pos.openTime,
      closeTime: Date.now(),
      profit: Math.round(pnl * 100) / 100,
      pips: Math.round((closePrice - pos.avgOpenPrice) * 1000) / 1000,
      strategyId: null,
      closeReason: 'manual',
      martingaleLayer: 0,
    });

    this.updateAccountEquity();
  }

  /** 平所有仓 */
  closeAllPositions(): void {
    const ids = Array.from(this.positions.keys());
    for (const id of ids) {
      this.closePosition(id);
    }
  }

  /** 下达订单 */
  placeOrder(params: {
    symbol: SymbolPair;
    side: OrderSide;
    orderType: CryptoOrderType;
    price: number;
    size: number;
    stopPrice?: number;
    reduceOnly?: boolean;
    leverage?: number;
    marginMode?: MarginMode;
  }): CryptoOrder {
    const lev = params.leverage || this.leverage;
    const notional = params.size * CONTRACT_MULTIPLIER * params.price;
    const margin = notional / lev;

    const order: CryptoOrder = {
      id: uuidv4(),
      symbol: params.symbol,
      side: params.side,
      orderType: params.orderType,
      price: params.price,
      size: params.size,
      filledSize: 0,
      notional,
      margin,
      leverage: lev,
      marginMode: params.marginMode || this.marginMode,
      status: 'live',
      reduceOnly: params.reduceOnly ?? false,
      timestamp: Date.now(),
      stopPrice: params.stopPrice,
    };

    this.orders.set(order.id, order);
    useTradingStore.getState().addOpenOrder(order);

    // 市价单立即成交
    if (params.orderType === 'market') {
      return this.executeOrder(order.id);
    }

    return order;
  }

  /** 撤单 */
  cancelOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (!order || order.status === 'filled' || order.status === 'cancelled') return false;

    order.status = 'cancelled';
    useTradingStore.getState().removeOpenOrder(orderId);
    this.orders.delete(orderId);
    return true;
  }

  /** 执行订单（市价单或触发的限价单） */
  executeOrder(orderId: string): CryptoOrder {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('订单不存在');

    const execPrice = this.currentPrices.get(order.symbol) ?? order.price;

    // 创建持仓
    const positionSide: PositionSide = order.side === 'buy' ? 'long' : 'short';

    if (!order.reduceOnly) {
      this.openPosition({
        symbol: order.symbol,
        side: positionSide,
        orderType: order.orderType,
        price: execPrice,
        size: order.size,
        leverage: order.leverage,
        marginMode: order.marginMode,
      });
    }

    order.status = 'filled';
    order.filledSize = order.size;
    useTradingStore.getState().removeOpenOrder(orderId);
    this.orders.delete(orderId);

    return order;
  }

  /** 计算总已用保证金 */
  private calculateTotalUsedMargin(): number {
    let total = 0;
    for (const [, pos] of this.positions) {
      if (pos.marginMode === 'cross') {
        total += pos.margin;
      }
    }
    return total;
  }

  /** 更新账户权益 */
  private updateAccountEquity(): void {
    const totalUnrealizedPnl = Array.from(this.positions.values())
      .reduce((s, p) => s + p.unrealizedPnl, 0);
    const totalUsedMargin = Array.from(this.positions.values())
      .reduce((s, p) => s + p.margin, 0);

    const equity = this.totalCollateral + totalUnrealizedPnl;
    const free = equity - totalUsedMargin;

    useTradingStore.getState().updateAccount({
      balance: this.totalCollateral,
      equity: Math.max(0, equity),
      marginUsed: totalUsedMargin,
      marginFree: Math.max(0, free),
      marginLevel: totalUsedMargin > 0 ? (equity / totalUsedMargin) * 100 : 0,
      unrealizedPnl: totalUnrealizedPnl,
    });
  }

  /** 获取当前持仓 */
  getPositions(): ContractPosition[] {
    return Array.from(this.positions.values());
  }

  /** 获取当前所有订单 */
  getOrders(): CryptoOrder[] {
    return Array.from(this.orders.values());
  }

  /** 获取账户摘要 */
  getAccountSummary(): {
    totalCollateral: number;
    totalUnrealizedPnl: number;
    totalMargin: number;
    freeMargin: number;
    equity: number;
  } {
    const totalUnrealizedPnl = Array.from(this.positions.values())
      .reduce((s, p) => s + p.unrealizedPnl, 0);
    const totalMargin = Array.from(this.positions.values())
      .reduce((s, p) => s + p.margin, 0);
    const equity = this.totalCollateral + totalUnrealizedPnl;

    return {
      totalCollateral: this.totalCollateral,
      totalUnrealizedPnl,
      totalMargin,
      freeMargin: equity - totalMargin,
      equity,
    };
  }

  /** 重置 */
  reset(): void {
    this.positions.clear();
    this.orders.clear();
    this.currentPrices.clear();
    this.leverage = DEFAULT_LEVERAGE;
    this.marginMode = 'cross';
    this.totalCollateral = DEFAULTS.initialBalance;
    this.initAccount();
  }

  /** 销毁 */
  destroy(): void {
    this.positions.clear();
    this.orders.clear();
    this.currentPrices.clear();
  }
}

/** 全局单例 */
export const cryptoTradingEngine = new CryptoTradingEngine();
