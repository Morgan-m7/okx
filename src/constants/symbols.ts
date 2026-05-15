import type { SymbolPair, TradingMode, CryptoPair, ForexPair } from '../types/market';

// ===== 外汇交易对 =====
export const FOREX_SYMBOLS: ForexPair[] = [
  'EUR/USD',
  'GBP/USD',
  'USD/JPY',
  'AUD/USD',
  'USD/CAD',
  'USD/CHF',
  'NZD/USD',
];

// ===== 加密货币交易对 =====
export const CRYPTO_SYMBOLS: CryptoPair[] = [
  'BTC/USDT',
  'ETH/USDT',
  'SOL/USDT',
  'XRP/USDT',
  'DOGE/USDT',
  'ADA/USDT',
  'DOT/USDT',
  'LINK/USDT',
  'AVAX/USDT',
  'MATIC/USDT',
  'UNI/USDT',
  'ATOM/USDT',
  'LTC/USDT',
  'BCH/USDT',
  'TRX/USDT',
  'SHIB/USDT',
  'APT/USDT',
  'ARB/USDT',
  'OP/USDT',
  'SUI/USDT',
  'NEAR/USDT',
  'FIL/USDT',
  'AAVE/USDT',
  'AXS/USDT',
  'SAND/USDT',
  'EGLD/USDT',
  'FTM/USDT',
  'ALGO/USDT',
  'ICP/USDT',
  'XLM/USDT',
];

/** 根据交易模式返回活跃交易对列表 */
export function getActiveSymbols(mode: TradingMode): SymbolPair[] {
  return mode === 'crypto' ? [...CRYPTO_SYMBOLS] : [...FOREX_SYMBOLS];
}

/** 默认交易对 */
export function getDefaultSymbol(mode: TradingMode): SymbolPair {
  return mode === 'crypto' ? 'BTC/USDT' : 'EUR/USD';
}

// ===== 名称映射 =====
export const SYMBOL_NAMES: Record<string, string> = {
  // Forex
  'EUR/USD': '欧元/美元',
  'GBP/USD': '英镑/美元',
  'USD/JPY': '美元/日元',
  'AUD/USD': '澳元/美元',
  'USD/CAD': '美元/加元',
  'USD/CHF': '美元/瑞郎',
  'NZD/USD': '纽元/美元',
  // Crypto
  'BTC/USDT': '比特币',
  'ETH/USDT': '以太坊',
  'SOL/USDT': 'Solana',
  'XRP/USDT': '瑞波币',
  'DOGE/USDT': '狗狗币',
  'ADA/USDT': 'Cardano',
  'DOT/USDT': '波卡',
  'LINK/USDT': 'Chainlink',
  'AVAX/USDT': 'Avalanche',
  'MATIC/USDT': 'Polygon',
  'UNI/USDT': 'Uniswap',
  'ATOM/USDT': 'Cosmos',
  'LTC/USDT': '莱特币',
  'BCH/USDT': '比特币现金',
  'TRX/USDT': '波场',
  'SHIB/USDT': 'Shiba Inu',
  'APT/USDT': 'Aptos',
  'ARB/USDT': 'Arbitrum',
  'OP/USDT': 'Optimism',
  'SUI/USDT': 'Sui',
  'NEAR/USDT': 'NEAR Protocol',
  'FIL/USDT': 'Filecoin',
  'AAVE/USDT': 'Aave',
  'AXS/USDT': 'Axie Infinity',
  'SAND/USDT': 'The Sandbox',
  'EGLD/USDT': 'Elrond',
  'FTM/USDT': 'Fantom',
  'ALGO/USDT': 'Algorand',
  'ICP/USDT': 'Internet Computer',
  'XLM/USDT': 'Stellar',
};

// ===== 小数点位数 =====
export const SYMBOL_DIGITS: Record<string, number> = {
  // Forex
  'EUR/USD': 5,
  'GBP/USD': 5,
  'USD/JPY': 3,
  'AUD/USD': 5,
  'USD/CAD': 5,
  'USD/CHF': 5,
  'NZD/USD': 5,
  // Crypto (USDT pairs)
  'BTC/USDT': 2,
  'ETH/USDT': 2,
  'SOL/USDT': 3,
  'XRP/USDT': 4,
  'DOGE/USDT': 5,
  'ADA/USDT': 4,
  'DOT/USDT': 3,
  'LINK/USDT': 3,
  'AVAX/USDT': 3,
  'MATIC/USDT': 4,
  'UNI/USDT': 3,
  'ATOM/USDT': 3,
  'LTC/USDT': 2,
  'BCH/USDT': 2,
  'TRX/USDT': 5,
  'SHIB/USDT': 8,
  'APT/USDT': 3,
  'ARB/USDT': 3,
  'OP/USDT': 3,
  'SUI/USDT': 3,
  'NEAR/USDT': 3,
  'FIL/USDT': 3,
  'AAVE/USDT': 2,
  'AXS/USDT': 3,
  'SAND/USDT': 4,
  'EGLD/USDT': 3,
  'FTM/USDT': 4,
  'ALGO/USDT': 4,
  'ICP/USDT': 3,
  'XLM/USDT': 4,
};

// ===== 外汇 PIP 值 =====
export const SYMBOL_PIP_VALUES: Record<string, number> = {
  'EUR/USD': 0.0001,
  'GBP/USD': 0.0001,
  'USD/JPY': 0.01,
  'AUD/USD': 0.0001,
  'USD/CAD': 0.0001,
  'USD/CHF': 0.0001,
  'NZD/USD': 0.0001,
  'XAU/USD': 0.01,
  'BTC/USDT': 1,
  'ETH/USDT': 0.1,
  'SOL/USDT': 0.01,
  'XRP/USDT': 0.0001,
};

export const SYMBOL_BASE_PIPS: Record<string, number> = {
  'EUR/USD': 0.0001,
  'GBP/USD': 0.0001,
  'USD/JPY': 0.01,
  'AUD/USD': 0.0001,
  'USD/CAD': 0.0001,
  'USD/CHF': 0.0001,
  'NZD/USD': 0.0001,
  'XAU/USD': 0.1,
  'BTC/USDT': 10,
  'ETH/USDT': 1,
  'SOL/USDT': 0.1,
  'XRP/USDT': 0.001,
};

// ===== 加密货币初始价格 =====
export const CRYPTO_BASE_PRICES: Record<string, number> = {
  'BTC/USDT': 67500,
  'ETH/USDT': 3450,
  'SOL/USDT': 145.50,
  'XRP/USDT': 0.5234,
  'DOGE/USDT': 0.152,
  'ADA/USDT': 0.45,
  'DOT/USDT': 7.80,
  'LINK/USDT': 16.20,
  'AVAX/USDT': 35.60,
  'MATIC/USDT': 0.72,
  'UNI/USDT': 8.50,
  'ATOM/USDT': 9.80,
  'LTC/USDT': 85.00,
  'BCH/USDT': 380.00,
  'TRX/USDT': 0.12,
  'SHIB/USDT': 0.000025,
  'APT/USDT': 12.50,
  'ARB/USDT': 1.85,
  'OP/USDT': 3.20,
  'SUI/USDT': 2.45,
  'NEAR/USDT': 6.80,
  'FIL/USDT': 7.50,
  'AAVE/USDT': 120.00,
  'AXS/USDT': 8.20,
  'SAND/USDT': 0.65,
  'EGLD/USDT': 42.00,
  'FTM/USDT': 0.85,
  'ALGO/USDT': 0.28,
  'ICP/USDT': 14.50,
  'XLM/USDT': 0.12,
};

// ===== 外汇初始价格 =====
export const FOREX_BASE_PRICES: Record<string, number> = {
  'EUR/USD': 1.08345,
  'GBP/USD': 1.26432,
  'USD/JPY': 151.234,
  'AUD/USD': 0.65210,
  'USD/CAD': 1.36420,
  'USD/CHF': 0.88450,
  'NZD/USD': 0.60120,
  'XAU/USD': 2050.50,
};

/** 根据交易模式获取初始价格 */
export function getBasePrices(mode: TradingMode): Record<string, number> {
  return mode === 'crypto' ? CRYPTO_BASE_PRICES : FOREX_BASE_PRICES;
}

// ===== 向后兼容 =====
/** @deprecated 使用 FOREX_SYMBOLS 或 CRYPTO_SYMBOLS */
export const SYMBOLS = [...FOREX_SYMBOLS];
