import type { ChartTheme } from '../types/chart';

export const darkChartTheme: ChartTheme = {
  bgColor: '#0D0E12',
  gridColor: '#1E2029',
  gridLabelColor: '#8B8D97',
  candleUpColor: '#00C853',
  candleDownColor: '#FF1744',
  candleUpWickColor: '#00C853',
  candleDownWickColor: '#FF1744',
  volumeUpColor: '#00C85333',
  volumeDownColor: '#FF174433',
  crosshairColor: '#8B8D97',
  indicatorMaColor: {
    5: '#FFD600',
    10: '#2196F3',
    30: '#9C27B0',
    60: '#FF9800',
  },
  macdColor: '#2196F3',
  macdSignalColor: '#FF9800',
  macdHistogramUpColor: '#00C853',
  macdHistogramDownColor: '#FF1744',
  rsiColor: '#E040FB',
  rsiOverboughtColor: '#FF1744',
  rsiOversoldColor: '#00C853',
  bollingerUpperColor: '#2196F3',
  bollingerMiddleColor: '#FFD600',
  bollingerLowerColor: '#2196F3',
  fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
};

export function getMaColor(period: number): string {
  return darkChartTheme.indicatorMaColor[period] || '#FFFFFF';
}
