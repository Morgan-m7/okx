import type { SymbolPair, Timeframe, Candle } from './market';

/** 图表渲染状态 */
export interface ChartState {
  symbol: SymbolPair;
  timeframe: Timeframe;
  visibleRange: {
    startIndex: number;
    endIndex: number;
  };
  candleWidth: number;
  offset: number;
  scale: number;
  indicators: IndicatorConfig[];
  crosshair: CrosshairData | null;
}

export interface IndicatorConfig {
  type: 'MA' | 'MACD' | 'RSI' | 'BOLL';
  params: Record<string, number>;
  visible: boolean;
  pane: 'main' | 'sub';
}

export interface CrosshairData {
  x: number;
  y: number;
  candle: Candle | null;
}

/** 图表主题配置 */
export interface ChartTheme {
  bgColor: string;
  gridColor: string;
  gridLabelColor: string;
  candleUpColor: string;
  candleDownColor: string;
  candleUpWickColor: string;
  candleDownWickColor: string;
  volumeUpColor: string;
  volumeDownColor: string;
  crosshairColor: string;
  indicatorMaColor: Record<number, string>;
  macdColor: string;
  macdSignalColor: string;
  macdHistogramUpColor: string;
  macdHistogramDownColor: string;
  rsiColor: string;
  rsiOverboughtColor: string;
  rsiOversoldColor: string;
  bollingerUpperColor: string;
  bollingerMiddleColor: string;
  bollingerLowerColor: string;
  fontFamily: string;
}
