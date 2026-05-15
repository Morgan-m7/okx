import type { Candle, IndicatorConfig } from '../types';
import { GridLayer } from './layers/grid-layer';
import { CandleLayer } from './layers/candle-layer';
import { IndicatorLayer } from './layers/indicator-layer';
import { CrosshairLayer } from './layers/crosshair-layer';
import { VolumeLayer } from './layers/volume-layer';
import { getHighLow } from './utils';

export class ChartRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gridLayer: GridLayer;
  private candleLayer: CandleLayer;
  private indicatorLayer: IndicatorLayer;
  private crosshairLayer: CrosshairLayer;
  private volumeLayer: VolumeLayer;

  private width = 0;
  private height = 0;
  private padding = { top: 20, bottom: 24, left: 60, right: 60 };
  private candles: Candle[] = [];
  private visibleRange = { startIndex: 0, endIndex: 0 };
  private indicators: IndicatorConfig[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    this.gridLayer = new GridLayer();
    this.candleLayer = new CandleLayer();
    this.indicatorLayer = new IndicatorLayer();
    this.crosshairLayer = new CrosshairLayer();
    this.volumeLayer = new VolumeLayer();
  }

  resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = width;
    this.height = height;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(dpr, dpr);
  }

  setCandles(candles: Candle[]): void {
    this.candles = candles;
  }

  setVisibleRange(start: number, end: number): void {
    this.visibleRange = { startIndex: start, endIndex: end };
  }

  setIndicators(indicators: IndicatorConfig[]): void {
    this.indicators = indicators;
  }

  getCrosshairLayer(): CrosshairLayer {
    return this.crosshairLayer;
  }

  getCandleAt(x: number): Candle | null {
    if (this.candles.length === 0 || !this.visibleRange) return null;
    const chartWidth = this.width - this.padding.left - this.padding.right;
    const visibleCount = this.visibleRange.endIndex - this.visibleRange.startIndex;
    if (visibleCount <= 0) return null;
    const candleWidth = chartWidth / visibleCount;
    const localIdx = Math.round((x - this.padding.left) / candleWidth);
    const globalIdx = this.visibleRange.startIndex + localIdx;
    if (globalIdx >= 0 && globalIdx < this.candles.length) {
      return this.candles[globalIdx];
    }
    return null;
  }

  getYForPrice(price: number): number {
    const visibleCandles = this.candles.slice(
      this.visibleRange.startIndex,
      this.visibleRange.endIndex + 1
    );
    if (visibleCandles.length === 0) return this.height / 2;
    const { high, low } = getHighLow(
      this.candles,
      this.visibleRange.startIndex,
      this.visibleRange.endIndex + 1
    );
    const chartHeight = this.height - this.padding.top - this.padding.bottom;
    const range = high - low || 1;
    return this.padding.top + ((high - price) / range) * chartHeight;
  }

  render(): void {
    const { startIndex, endIndex } = this.visibleRange;
    const { high, low } = getHighLow(this.candles, startIndex, endIndex + 1);
    const chartWidth = this.width - this.padding.left - this.padding.right;
    const visibleCount = endIndex - startIndex;
    const candleWidth = visibleCount > 0 ? chartWidth / visibleCount : 8;

    this.gridLayer.draw(
      this.ctx, this.width, this.height,
      this.candles, this.visibleRange,
      high, low, this.padding
    );

    this.candleLayer.draw(
      this.ctx, this.width, this.height,
      this.candles, this.visibleRange,
      high, low, this.padding, candleWidth
    );

    this.volumeLayer.draw(
      this.ctx, this.width, this.height,
      this.candles, this.visibleRange,
      this.padding, candleWidth
    );

    this.indicatorLayer.draw(
      this.ctx, this.width, this.height,
      this.candles, this.visibleRange,
      high, low, this.padding, candleWidth,
      this.indicators
    );

    this.crosshairLayer.draw(
      this.ctx, this.width, this.height, this.padding
    );
  }

  destroy(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}
