import type { Candle } from '../../types';
import { getTheme, getCandleColor } from '../utils';

export class VolumeLayer {
  private theme = getTheme();

  draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    candles: Candle[],
    visibleRange: { startIndex: number; endIndex: number },
    padding: { top: number; bottom: number; left: number; right: number },
    candleWidth: number
  ): void {
    const volumeHeight = 50;
    const volumeTop = height - volumeHeight - padding.bottom;

    let maxVol = 0;
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex && i < candles.length; i++) {
      if (candles[i].volume > maxVol) maxVol = candles[i].volume;
    }
    if (maxVol === 0) return;

    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex && i < candles.length; i++) {
      const candle = candles[i];
      const localIdx = i - visibleRange.startIndex;
      const x = padding.left + localIdx * candleWidth;
      const barWidth = Math.max(1, candleWidth * 0.6);
      const barHeight = (candle.volume / maxVol) * volumeHeight;

      const isUp = getCandleColor(candle) === 'up';
      ctx.fillStyle = isUp ? this.theme.volumeUpColor : this.theme.volumeDownColor;
      ctx.fillRect(x + (candleWidth - barWidth) / 2, volumeTop + volumeHeight - barHeight, barWidth, barHeight);
    }
  }
}
