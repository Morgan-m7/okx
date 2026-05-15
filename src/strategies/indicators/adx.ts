export function calculateADX(
  high: number[],
  low: number[],
  close: number[],
  period: number = 14
): (number | null)[] {
  const result: (number | null)[] = [];
  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  if (high.length < period + 1) {
    return high.map(() => null);
  }

  for (let i = 1; i < high.length; i++) {
    const trueRange = Math.max(
      high[i] - low[i],
      Math.abs(high[i] - close[i - 1]),
      Math.abs(low[i] - close[i - 1])
    );
    tr.push(trueRange);

    const upMove = high[i] - high[i - 1];
    const downMove = low[i - 1] - low[i];
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  for (let i = 0; i < high.length; i++) {
    if (i < period) {
      result.push(null);
      continue;
    }

    const sliceStart = i - period;
    const trSum = tr.slice(sliceStart, i).reduce((a, b) => a + b, 0);
    const plusDMSum = plusDM.slice(sliceStart, i).reduce((a, b) => a + b, 0);
    const minusDMSum = minusDM.slice(sliceStart, i).reduce((a, b) => a + b, 0);

    if (trSum === 0) {
      result.push(0);
      continue;
    }

    const plusDI = (plusDMSum / trSum) * 100;
    const minusDI = (minusDMSum / trSum) * 100;
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;

    if (i === period) {
      result.push(dx);
    } else {
      const prevADX = result[i - 1] as number;
      result.push((prevADX * (period - 1) + dx) / period);
    }
  }

  return result;
}
