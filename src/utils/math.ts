export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

export function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
}

export function max(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.max(...arr);
}

export function min(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.min(...arr);
}

export function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = average(arr);
  const sqDiffs = arr.map(v => (v - avg) ** 2);
  return Math.sqrt(sum(sqDiffs) / (arr.length - 1));
}

export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}
