export function calculateATR(
  high: number[],
  low: number[],
  close: number[],
  period: number = 14
): (number | null)[] {
  const result: (number | null)[] = [];
  const tr: number[] = [];

  if (high.length < 2) {
    return high.map(() => null);
  }

  for (let i = 1; i < high.length; i++) {
    const trueRange = Math.max(
      high[i] - low[i],
      Math.abs(high[i] - close[i - 1]),
      Math.abs(low[i] - close[i - 1])
    );
    tr.push(trueRange);
  }

  for (let i = 0; i < high.length; i++) {
    if (i < period + 1) {
      result.push(null);
      continue;
    }

    const sliceStart = i - period;
    const trSum = tr.slice(sliceStart, i).reduce((a, b) => a + b, 0);
    result.push(trSum / period);
  }

  return result;
}
