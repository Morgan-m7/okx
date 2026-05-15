import { calculateEMA } from './ma';

export interface MACDResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  const macd: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (fastEMA[i] === null || slowEMA[i] === null) {
      macd.push(null);
    } else {
      macd.push((fastEMA[i] as number) - (slowEMA[i] as number));
    }
  }

  const validMACD = macd.map(v => v !== null ? v as number : 0);
  const signal = calculateEMA(validMACD, signalPeriod);

  const histogram: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (macd[i] === null || signal[i] === null) {
      histogram.push(null);
    } else {
      const m = macd[i] as number;
      const s = signal[i] as number;
      histogram.push(m - s);
    }
  }

  return { macd, signal, histogram };
}
