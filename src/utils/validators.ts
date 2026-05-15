import type { SymbolPair } from '../types/market';
import { getActiveSymbols } from '../constants/symbols';
import { DEFAULTS } from '../constants/defaults';

export function isValidSymbol(symbol: string): symbol is SymbolPair {
  const activeSymbols = getActiveSymbols('forex');
  return activeSymbols.includes(symbol as SymbolPair);
}

export function isValidVolume(volume: number): boolean {
  if (typeof volume !== 'number' || isNaN(volume)) return false;
  if (volume < DEFAULTS.minVolume || volume > DEFAULTS.maxVolume) return false;
  const step = DEFAULTS.volumeStep;
  const remainder = Math.round(volume / step) * step;
  return Math.abs(remainder - volume) < 0.001;
}

export function isValidPrice(price: number): boolean {
  return typeof price === 'number' && !isNaN(price) && price > 0;
}

export function isValidSLTP(
  sl: number | null | undefined,
  tp: number | null | undefined,
  openPrice: number,
  direction: 'buy' | 'sell'
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (sl !== null && sl !== undefined) {
    if (!isValidPrice(sl)) {
      errors.push('止损价必须为正数');
    } else if (direction === 'buy' && sl >= openPrice) {
      errors.push('多头止损价必须低于开仓价');
    } else if (direction === 'sell' && sl <= openPrice) {
      errors.push('空头止损价必须高于开仓价');
    }
  }

  if (tp !== null && tp !== undefined) {
    if (!isValidPrice(tp)) {
      errors.push('止盈价必须为正数');
    } else if (direction === 'buy' && tp <= openPrice) {
      errors.push('多头止盈价必须高于开仓价');
    } else if (direction === 'sell' && tp >= openPrice) {
      errors.push('空头止盈价必须低于开仓价');
    }
  }

  if (sl !== null && tp !== null && sl !== undefined && tp !== undefined) {
    if (direction === 'buy' && sl >= tp) {
      errors.push('多头止损价必须低于止盈价');
    }
    if (direction === 'sell' && sl <= tp) {
      errors.push('空头止损价必须高于止盈价');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function isValidPercentage(value: number, min: number = 0, max: number = 100): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}

export function isValidInteger(value: number, min: number = 1, max: number = 1000): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}
