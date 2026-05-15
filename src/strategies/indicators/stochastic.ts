export interface StochasticResult {
  k: (number | null)[];
  d: (number | null)[];
}

export function calculateStochastic(
  high: number[],
  low: number[],
  close: number[],
  kPeriod: number = 14,
  dPeriod: number = 3,
  smoothing: number = 3
): StochasticResult {
  const rawK: (number | null)[] = [];

  for (let i = 0; i < close.length; i++) {
    if (i < kPeriod - 1) {
      rawK.push(null);
      continue;
    }

    let highMax = -Infinity;
    let lowMin = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (high[j] > highMax) highMax = high[j];
      if (low[j] < lowMin) lowMin = low[j];
    }

    const range = highMax - lowMin;
    if (range === 0) {
      rawK.push(50);
    } else {
      rawK.push(((close[i] - lowMin) / range) * 100);
    }
  }

  const k: (number | null)[] = [];
  for (let i = 0; i < rawK.length; i++) {
    if (i < smoothing - 1 || rawK[i] === null) {
      k.push(null);
      continue;
    }
    let sum = 0;
    let count = 0;
    for (let j = i - smoothing + 1; j <= i; j++) {
      if (rawK[j] !== null) {
        sum += rawK[j] as number;
        count++;
      }
    }
    k.push(count > 0 ? sum / count : null);
  }

  const d: (number | null)[] = [];
  for (let i = 0; i < k.length; i++) {
    if (i < dPeriod - 1 || k[i] === null) {
      d.push(null);
      continue;
    }
    let sum = 0;
    let count = 0;
    for (let j = i - dPeriod + 1; j <= i; j++) {
      if (k[j] !== null) {
        sum += k[j] as number;
        count++;
      }
    }
    d.push(count > 0 ? sum / count : null);
  }

  return { k, d };
}
