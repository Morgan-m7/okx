import type { Candle, IndicatorConfig } from '../../types';
import { getTheme, priceToY } from '../utils';

export class IndicatorLayer {
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
    candleWidth: number,
    indicators: IndicatorConfig[]
  ): void {
    for (const indicator of indicators) {
      if (!indicator.visible) continue;
      if (indicator.pane === 'main') {
        this.drawMainIndicator(ctx, candles, visibleRange, high, low, padding, candleWidth, width, indicator);
      } else {
        this.drawSubIndicator(ctx, candles, visibleRange, padding, candleWidth, width, height, indicator);
      }
    }
  }

  private drawMainIndicator(
    ctx: CanvasRenderingContext2D,
    candles: Candle[],
    visibleRange: { startIndex: number; endIndex: number },
    high: number,
    low: number,
    padding: { top: number; bottom: number; left: number; right: number },
    candleWidth: number,
    width: number,
    indicator: IndicatorConfig
  ): void {
    if (indicator.type === 'MA') {
      this.drawMA(ctx, candles, visibleRange, high, low, padding, candleWidth, indicator);
    } else if (indicator.type === 'BOLL') {
      this.drawBollinger(ctx, candles, visibleRange, high, low, padding, candleWidth, indicator);
    }
  }

  private drawSubIndicator(
    ctx: CanvasRenderingContext2D,
    candles: Candle[],
    visibleRange: { startIndex: number; endIndex: number },
    padding: { top: number; bottom: number; left: number; right: number },
    candleWidth: number,
    width: number,
    height: number,
    indicator: IndicatorConfig
  ): void {
    const subHeight = height * 0.2;
    const subTop = height - subHeight - padding.bottom;
    const chartWidth = width - padding.left - padding.right;

    ctx.strokeStyle = this.theme.gridColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(padding.left, subTop);
    ctx.lineTo(width - padding.right, subTop);
    ctx.stroke();

    const subCandles = candles.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
    const values = subCandles.map(c => {
      if (indicator.type === 'RSI') {
        return this.calculateRSIValue(candles, c);
      }
      if (indicator.type === 'MACD') {
        return this.calculateMACDValue(candles, c);
      }
      return 0;
    });

    if (values.length === 0) return;

    if (indicator.type === 'RSI') {
      this.drawRSI(ctx, values, padding.left, subTop, chartWidth, subHeight, candleWidth);
    } else if (indicator.type === 'MACD') {
      this.drawMACD(ctx, values, padding.left, subTop, chartWidth, subHeight, candleWidth);
    }
  }

  private drawMA(
    ctx: CanvasRenderingContext2D,
    candles: Candle[],
    visibleRange: { startIndex: number; endIndex: number },
    high: number,
    low: number,
    padding: { top: number; bottom: number; left: number; right: number },
    candleWidth: number,
    indicator: IndicatorConfig
  ): void {
    const period = indicator.params['period'] || 10;
    const color = this.theme.indicatorMaColor[period] || '#FFFFFF';
    const chartHeight = candles.length > 0 ? 400 - padding.top - padding.bottom : 400;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    let firstPoint = true;
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex && i < candles.length; i++) {
      if (i < period - 1) continue;
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += candles[j]?.close || 0;
      }
      const ma = sum / period;
      const localIdx = i - visibleRange.startIndex;
      const x = padding.left + localIdx * candleWidth + candleWidth / 2;
      const y = priceToY(ma, high, low, chartHeight, padding.top);

      if (firstPoint) {
        ctx.moveTo(x, y);
        firstPoint = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  private drawBollinger(
    ctx: CanvasRenderingContext2D,
    candles: Candle[],
    visibleRange: { startIndex: number; endIndex: number },
    high: number,
    low: number,
    padding: { top: number; bottom: number; left: number; right: number },
    candleWidth: number,
    indicator: IndicatorConfig
  ): void {
    const period = indicator.params['period'] || 20;
    const stdDev = indicator.params['stdDev'] || 2;
    const chartHeight = candles.length > 0 ? 400 - padding.top - padding.bottom : 400;

    const middleValues: { x: number; y: number }[] = [];
    const upperValues: { x: number; y: number }[] = [];
    const lowerValues: { x: number; y: number }[] = [];

    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex && i < candles.length; i++) {
      if (i < period - 1) continue;
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += candles[j]?.close || 0;
      }
      const ma = sum / period;

      let sqSum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sqSum += (candles[j]?.close || 0 - ma) ** 2;
      }
      const std = Math.sqrt(sqSum / period);

      const localIdx = i - visibleRange.startIndex;
      const x = padding.left + localIdx * candleWidth + candleWidth / 2;
      middleValues.push({ x, y: priceToY(ma, high, low, chartHeight, padding.top) });
      upperValues.push({ x, y: priceToY(ma + stdDev * std, high, low, chartHeight, padding.top) });
      lowerValues.push({ x, y: priceToY(ma - stdDev * std, high, low, chartHeight, padding.top) });
    }

    ctx.strokeStyle = this.theme.bollingerMiddleColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    middleValues.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();

    ctx.strokeStyle = this.theme.bollingerUpperColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    upperValues.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();

    ctx.beginPath();
    lowerValues.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawRSI(
    ctx: CanvasRenderingContext2D,
    values: number[],
    startX: number,
    subTop: number,
    chartWidth: number,
    subHeight: number,
    candleWidth: number
  ): void {
    const rsiTop = subTop + 10;
    const rsiBottom = subTop + subHeight - 10;
    const rsiRange = rsiBottom - rsiTop;

    ctx.strokeStyle = this.theme.rsiOverboughtColor;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);
    const overboughtY = rsiTop + rsiRange * (100 - 70) / 100;
    ctx.beginPath();
    ctx.moveTo(startX, overboughtY);
    ctx.lineTo(startX + chartWidth, overboughtY);
    ctx.stroke();

    const oversoldY = rsiTop + rsiRange * (100 - 30) / 100;
    ctx.beginPath();
    ctx.moveTo(startX, oversoldY);
    ctx.lineTo(startX + chartWidth, oversoldY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = this.theme.rsiColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    values.forEach((v, i) => {
      const y = rsiTop + rsiRange * (100 - v) / 100;
      const x = startX + i * candleWidth + candleWidth / 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  private drawMACD(
    ctx: CanvasRenderingContext2D,
    values: number[],
    startX: number,
    subTop: number,
    chartWidth: number,
    subHeight: number,
    candleWidth: number
  ): void {
    const macdTop = subTop + 10;
    const macdBottom = subTop + subHeight - 10;
    const macdRange = macdBottom - macdTop;

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const valRange = maxVal - minVal || 1;

    values.forEach((v, i) => {
      const x = startX + i * candleWidth;
      const y = macdTop + macdRange * (maxVal - v) / valRange;
      const zeroY = macdTop + macdRange * maxVal / valRange;
      const barWidth = Math.max(1, candleWidth * 0.5);

      ctx.fillStyle = v >= 0 ? this.theme.macdHistogramUpColor : this.theme.macdHistogramDownColor;
      ctx.fillRect(x + (candleWidth - barWidth) / 2, Math.min(y, zeroY), barWidth, Math.max(1, Math.abs(y - zeroY)));
    });
  }

  private calculateRSIValue(allCandles: Candle[], candle: Candle): number {
    const idx = allCandles.indexOf(candle);
    if (idx < 14) return 50;
    let gains = 0;
    let losses = 0;
    for (let i = idx - 13; i <= idx; i++) {
      const change = allCandles[i]?.close - allCandles[i - 1]?.close || 0;
      if (change >= 0) gains += change;
      else losses -= change;
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  private calculateMACDValue(allCandles: Candle[], candle: Candle): number {
    const idx = allCandles.indexOf(candle);
    if (idx < 26) return 0;
    const fastPeriod = 12;
    const slowPeriod = 26;

    const fastEMA = this.calculateEMA(allCandles, idx, fastPeriod);
    const slowEMA = this.calculateEMA(allCandles, idx, slowPeriod);
    return (fastEMA || 0) - (slowEMA || 0);
  }

  private calculateEMA(candles: Candle[], idx: number, period: number): number {
    if (idx < period - 1) return 0;
    const k = 2 / (period + 1);
    let ema = candles[idx - period + 1]?.close || 0;
    for (let i = idx - period + 2; i <= idx; i++) {
      ema = (candles[i]?.close || 0) * k + ema * (1 - k);
    }
    return ema;
  }
}
