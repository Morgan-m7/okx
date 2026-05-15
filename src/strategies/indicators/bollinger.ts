import { calculateMA } from './ma';

export interface BollingerResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

export function calculateBollinger(
  prices: number[],
  period: number = 20,
  stdDev: number = 2
): BollingerResult {
  const middle = calculateMA(prices, period);

  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (middle[i] === null) {
      upper.push(null);
      lower.push(null);
      continue;
    }

    let sumSqDiff = 0;
    let count = 0;
    for (let j = Math.max(0, i - period + 1); j <= i; j++) {
      sumSqDiff += (prices[j] - (middle[i] as number)) ** 2;
      count++;
    }
    const std = Math.sqrt(sumSqDiff / count);

    upper.push((middle[i] as number) + stdDev * std);
    lower.push((middle[i] as number) - stdDev * std);
  }

  return { upper, middle, lower };
}
