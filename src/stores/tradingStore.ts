import { create } from 'zustand';
import type { Account, Position, TradeRecord, ContractPosition, CryptoOrder } from '../types/trading';
import { DEFAULTS } from '../constants/defaults';

interface TradingState {
  // Forex 传统
  account: Account;
  positions: Position[];
  tradeHistory: TradeRecord[];

  // Crypto 合约
  contractPositions: ContractPosition[];
  openOrders: CryptoOrder[];

  isLoading: boolean;
  error: string | null;

  // Account
  setAccount: (account: Account) => void;
  updateAccount: (updates: Partial<Account>) => void;

  // Forex 持仓
  setPositions: (positions: Position[]) => void;
  addPosition: (position: Position) => void;
  updatePosition: (id: string, updates: Partial<Position>) => void;
  removePosition: (id: string) => void;

  // 交易历史
  setTradeHistory: (history: TradeRecord[]) => void;
  addTradeRecord: (record: TradeRecord) => void;

  // Crypto 合约持仓
  setContractPositions: (positions: ContractPosition[]) => void;
  addContractPosition: (position: ContractPosition) => void;
  updateContractPosition: (id: string, updates: Partial<ContractPosition>) => void;
  removeContractPosition: (id: string) => void;

  // Crypto 订单
  setOpenOrders: (orders: CryptoOrder[]) => void;
  addOpenOrder: (order: CryptoOrder) => void;
  removeOpenOrder: (id: string) => void;
  updateOpenOrder: (id: string, updates: Partial<CryptoOrder>) => void;

  // 通用
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  resetAccount: () => void;
}

function createDefaultAccount(): Account {
  const now = Date.now();
  return {
    name: '模拟账户',
    type: 'demo',
    broker: 'Simulated',
    balance: DEFAULTS.initialBalance,
    equity: DEFAULTS.initialBalance,
    marginUsed: 0,
    marginFree: DEFAULTS.initialBalance,
    marginLevel: 0,
    currency: 'USD',
    leverage: 10,
    createdAt: now,
    updatedAt: now,
  };
}

export const useTradingStore = create<TradingState>((set) => ({
  account: createDefaultAccount(),
  positions: [],
  tradeHistory: [],
  contractPositions: [],
  openOrders: [],
  isLoading: false,
  error: null,

  setAccount: (account) => set({ account }),
  updateAccount: (updates) => set((state) => ({
    account: { ...state.account, ...updates, updatedAt: Date.now() },
  })),

  setPositions: (positions) => set({ positions }),
  addPosition: (position) => set((state) => ({
    positions: [...state.positions, position],
  })),
  updatePosition: (id, updates) => set((state) => ({
    positions: state.positions.map(p =>
      p.id === id ? { ...p, ...updates } : p
    ),
  })),
  removePosition: (id) => set((state) => ({
    positions: state.positions.filter(p => p.id !== id),
  })),

  setTradeHistory: (history) => set({ tradeHistory: history }),
  addTradeRecord: (record) => set((state) => ({
    tradeHistory: [record, ...state.tradeHistory],
  })),

  setContractPositions: (positions) => set({ contractPositions: positions }),
  addContractPosition: (position) => set((state) => ({
    contractPositions: [...state.contractPositions, position],
  })),
  updateContractPosition: (id, updates) => set((state) => ({
    contractPositions: state.contractPositions.map(p =>
      p.id === id ? { ...p, ...updates } : p
    ),
  })),
  removeContractPosition: (id) => set((state) => ({
    contractPositions: state.contractPositions.filter(p => p.id !== id),
  })),

  setOpenOrders: (orders) => set({ openOrders: orders }),
  addOpenOrder: (order) => set((state) => ({
    openOrders: [...state.openOrders, order],
  })),
  removeOpenOrder: (id) => set((state) => ({
    openOrders: state.openOrders.filter(o => o.id !== id),
  })),
  updateOpenOrder: (id, updates) => set((state) => ({
    openOrders: state.openOrders.map(o =>
      o.id === id ? { ...o, ...updates } : o
    ),
  })),

  setError: (error) => set({ error }),
  setLoading: (loading) => set({ isLoading: loading }),

  resetAccount: () => set({
    account: createDefaultAccount(),
    positions: [],
    tradeHistory: [],
    contractPositions: [],
    openOrders: [],
  }),
}));
