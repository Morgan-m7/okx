import type { Candle } from '../../types';
import { getTheme, formatPrice, formatTime } from '../utils';

export class CrosshairLayer {
  private theme = getTheme();
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;
  private visible = false;
  private crosshairX = 0;
  private crosshairY = 0;
  private crosshairCandle: Candle | null = null;

  show(x: number, y: number, candle: Candle | null): void {
    this.visible = true;
    this.crosshairX = x;
    this.crosshairY = y;
    this.crosshairCandle = candle;

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    this.hideTimeout = setTimeout(() => {
      this.visible = false;
    }, 2000);
  }

  hide(): void {
    this.visible = false;
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    padding: { top: number; bottom: number; left: number; right: number }
  ): void {
    if (!this.visible) return;

    const chartWidth = width - padding.left - padding.right;

    ctx.save();
    ctx.strokeStyle = this.theme.crosshairColor;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(this.crosshairX, padding.top);
    ctx.lineTo(this.crosshairX, height - padding.bottom);
    ctx.moveTo(padding.left, this.crosshairY);
    ctx.lineTo(width - padding.right, this.crosshairY);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.font = `11px ${this.theme.fontFamily}`;

    ctx.fillStyle = this.theme.bgColor;
    const priceLabel = this.crosshairCandle
      ? formatPrice(this.crosshairCandle.close, this.crosshairCandle.symbol)
      : '';
    const priceWidth = ctx.measureText(priceLabel).width + 12;

    ctx.fillRect(width - padding.right, this.crosshairY - 8, priceWidth, 16);
    ctx.fillStyle = this.theme.crosshairColor;
    ctx.textAlign = 'left';
    ctx.fillText(priceLabel, width - padding.right + 4, this.crosshairY + 4);

    const timeLabel = this.crosshairCandle
      ? formatTime(this.crosshairCandle.timestamp, 'M15')
      : '';
    const timeWidth = ctx.measureText(timeLabel).width + 12;

    ctx.fillStyle = this.theme.bgColor;
    ctx.fillRect(this.crosshairX - timeWidth / 2, height - padding.bottom, timeWidth, 16);
    ctx.fillStyle = this.theme.crosshairColor;
    ctx.textAlign = 'center';
    ctx.fillText(timeLabel, this.crosshairX, height - padding.bottom + 12);

    if (this.crosshairCandle) {
      const infoY = padding.top + 4;
      const infoText = `O:${formatPrice(this.crosshairCandle.open, this.crosshairCandle.symbol)} H:${formatPrice(this.crosshairCandle.high, this.crosshairCandle.symbol)} L:${formatPrice(this.crosshairCandle.low, this.crosshairCandle.symbol)} C:${formatPrice(this.crosshairCandle.close, this.crosshairCandle.symbol)} Vol:${this.crosshairCandle.volume}`;

      ctx.fillStyle = 'rgba(13, 14, 18, 0.8)';
      const infoWidth = ctx.measureText(infoText).width + 12;
      ctx.fillRect(padding.left, infoY, infoWidth, 18);
      ctx.fillStyle = this.theme.gridLabelColor;
      ctx.textAlign = 'left';
      ctx.font = `10px ${this.theme.fontFamily}`;
      ctx.fillText(infoText, padding.left + 4, infoY + 13);
    }

    ctx.restore();
  }
}
