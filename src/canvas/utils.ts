import { darkChartTheme } from '../styles/chart-theme';
import type { ChartTheme, Candle } from '../types';

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function getTheme(): ChartTheme {
  return darkChartTheme;
}

export function formatPrice(price: number, symbol: string): string {
  const digits = symbol === 'XAU/USD' ? 2 : symbol.includes('BTC') ? 2 : symbol.includes('ETH') ? 2 : symbol.includes('SOL') ? 3 : 4;
  return price.toFixed(digits);
}

export function formatTime(timestamp: number, timeframe: string): string {
  const date = new Date(timestamp);
  if (timeframe === 'D1' || timeframe === 'W1') {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

export function getCandleColor(candle: Candle): 'up' | 'down' {
  return candle.close >= candle.open ? 'up' : 'down';
}

export function getHighLow(candles: Candle[], start: number, end: number): { high: number; low: number } {
  let high = -Infinity;
  let low = Infinity;
  for (let i = start; i < end && i < candles.length; i++) {
    const c = candles[i];
    if (c.high > high) high = c.high;
    if (c.low < low) low = c.low;
  }
  return { high, low };
}

export function getVolumeRange(candles: Candle[], start: number, end: number): { maxVol: number } {
  let maxVol = 0;
  for (let i = start; i < end && i < candles.length; i++) {
    if (candles[i].volume > maxVol) maxVol = candles[i].volume;
  }
  return { maxVol };
}

export function priceToY(
  price: number,
  high: number,
  low: number,
  chartHeight: number,
  padding: number
): number {
  const range = high - low || 1;
  const pixelPerUnit = (chartHeight - padding * 2) / range;
  return padding + (high - price) * pixelPerUnit;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function isInView(
  index: number,
  startIndex: number,
  endIndex: number
): boolean {
  return index >= startIndex && index <= endIndex;
}
