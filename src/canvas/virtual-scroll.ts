import { DEFAULTS } from '../constants/defaults';

export class VirtualScrollManager {
  private totalCandles = 0;
  private visibleStart = 0;
  private visibleEnd = 0;

  update(totalCandles: number, candleWidth: number, canvasWidth: number): void {
    this.totalCandles = totalCandles;
    const visibleCount = Math.min(
      Math.floor(canvasWidth / Math.max(candleWidth, DEFAULTS.minCandleWidth)),
      totalCandles
    );
    this.visibleEnd = Math.min(this.visibleStart + visibleCount, totalCandles);

    if (this.visibleEnd - this.visibleStart < visibleCount) {
      this.visibleStart = Math.max(0, this.visibleEnd - visibleCount);
    }
  }

  pan(dx: number, candleWidth: number): void {
    const pixelsPerCandle = candleWidth;
    const candleDelta = Math.round(-dx / pixelsPerCandle);
    this.visibleStart = Math.max(0, Math.min(
      this.totalCandles - (this.visibleEnd - this.visibleStart),
      this.visibleStart + candleDelta
    ));
    this.visibleEnd = Math.min(this.totalCandles, this.visibleStart + (this.visibleEnd - this.visibleStart));
    if (this.totalCandles - this.visibleEnd < 5) {
      this.visibleEnd = this.totalCandles;
      this.visibleStart = Math.max(0, this.visibleEnd - (this.visibleEnd - this.visibleStart));
    }
  }

  zoom(scale: number, candleWidth: number, canvasWidth: number): { newWidth: number; start: number; end: number } {
    const newWidth = Math.max(
      DEFAULTS.minCandleWidth,
      Math.min(DEFAULTS.maxCandleWidth, candleWidth * scale)
    );
    const visibleCount = Math.floor(canvasWidth / newWidth);
    const centerIdx = Math.floor((this.visibleStart + this.visibleEnd) / 2);
    const newStart = Math.max(0, centerIdx - Math.floor(visibleCount / 2));
    const newEnd = Math.min(this.totalCandles, newStart + visibleCount);

    this.visibleStart = newStart;
    this.visibleEnd = newEnd;
    return { newWidth, start: newStart, end: newEnd };
  }

  reset(): void {
    this.visibleStart = 0;
    this.visibleEnd = 0;
  }

  goToEnd(): void {
    if (this.totalCandles > 0) {
      const range = this.visibleEnd - this.visibleStart;
      this.visibleEnd = this.totalCandles;
      this.visibleStart = Math.max(0, this.totalCandles - range);
    }
  }

  getVisibleRange(): { startIndex: number; endIndex: number } {
    return {
      startIndex: this.visibleStart,
      endIndex: this.visibleEnd,
    };
  }

  getVisibleCount(): number {
    return this.visibleEnd - this.visibleStart;
  }
}
