import type { Candle } from '../../types';
import { getTheme, getCandleColor } from '../utils';

export class CandleLayer {
  private theme = getTheme();

  draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    candles: Candle[],
    visibleRange: { startIndex: number; endIndex: number },
    high: number,
    low: number,
    padding: { top: number; bottom: number; left: number; right: number },
    candleWidth: number
  ): void {
    const chartHeight = height - padding.top - padding.bottom;
    const chartWidth = width - padding.left - padding.right;
    const range = high - low || 1;

    const startIdx = Math.max(0, visibleRange.startIndex);
    const endIdx = Math.min(candles.length, visibleRange.endIndex + 1);

    for (let i = startIdx; i < endIdx; i++) {
      const candle = candles[i];
      if (!candle) continue;

      const localIdx = i - startIdx;
      const x = padding.left + localIdx * candleWidth;
      const bodyHeight = Math.abs(
        ((candle.open - candle.close) / range) * chartHeight
      );
      const bodyTop = priceToYHelper(
        Math.max(candle.open, candle.close),
        high,
        low,
        chartHeight,
        padding.top
      );
      const wickTop = priceToYHelper(candle.high, high, low, chartHeight, padding.top);
      const wickBottom = priceToYHelper(candle.low, high, low, chartHeight, padding.top);

      const isUp = getCandleColor(candle) === 'up';

      const halfWidth = Math.max(1, candleWidth * 0.35);
      const centerX = x + candleWidth / 2;

      ctx.strokeStyle = isUp ? this.theme.candleUpWickColor : this.theme.candleDownWickColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX, wickTop);
      ctx.lineTo(centerX, wickBottom);
      ctx.stroke();

      if (bodyHeight < 1) {
        ctx.fillStyle = isUp ? this.theme.candleUpColor : this.theme.candleDownColor;
        ctx.fillRect(centerX - halfWidth, bodyTop - 0.5, halfWidth * 2, 1);
      } else {
        ctx.fillStyle = isUp ? this.theme.candleUpColor : this.theme.candleDownColor;
        ctx.fillRect(centerX - halfWidth, bodyTop, halfWidth * 2, bodyHeight);
      }
    }
  }
}

function priceToYHelper(
  price: number,
  high: number,
  low: number,
  chartHeight: number,
  paddingTop: number
): number {
  const range = high - low || 1;
  return paddingTop + ((high - price) / range) * chartHeight;
}
