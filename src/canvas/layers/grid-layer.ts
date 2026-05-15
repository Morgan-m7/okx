import type { Candle } from '../../types';
import { getTheme, formatTime, formatPrice, priceToY } from '../utils';

export class GridLayer {
  private theme = getTheme();

  draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    candles: Candle[],
    visibleRange: { startIndex: number; endIndex: number },
    high: number,
    low: number,
    padding: { top: number; bottom: number; left: number; right: number }
  ): void {
    const chartHeight = height - padding.top - padding.bottom;
    const chartWidth = width - padding.left - padding.right;

    ctx.fillStyle = this.theme.bgColor;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = this.theme.gridColor;
    ctx.lineWidth = 0.5;

    const gridLines = 5;
    const range = high - low || 1;
    const step = range / gridLines;

    ctx.font = `10px ${this.theme.fontFamily}`;
    ctx.fillStyle = this.theme.gridLabelColor;
    ctx.textAlign = 'right';

    for (let i = 0; i <= gridLines; i++) {
      const price = high - step * i;
      const y = priceToY(price, high, low, chartHeight, padding.top);

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText(formatPrice(price, candles[0]?.symbol || 'XAU/USD'), padding.left - 4, y + 3);
    }

    ctx.textAlign = 'center';
    const visibleCandles = candles.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
    const visibleLen = visibleCandles.length;
    if (visibleLen === 0) return;

    const candleWidth = chartWidth / visibleLen;
    const labelInterval = Math.max(1, Math.floor(visibleLen / 6));

    for (let i = 0; i < visibleLen; i += labelInterval) {
      const candle = visibleCandles[i];
      const x = padding.left + candleWidth * i + candleWidth / 2;
      ctx.fillStyle = this.theme.gridLabelColor;
      ctx.font = `9px ${this.theme.fontFamily}`;
      const timeStr = formatTime(candle.timestamp, 'M15');
      ctx.fillText(timeStr, x, height - padding.bottom + 14);
    }
  }
}
