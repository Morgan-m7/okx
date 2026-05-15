import type { Timeframe } from '../types/market';

export const TIMEFRAMES: Timeframe[] = [
  'M1', 'M5', 'M15', 'M30',
  'H1', 'H4', 'D1', 'W1',
];

export const TIMEFRAME_NAMES: Record<Timeframe, string> = {
  M1: '1分钟',
  M5: '5分钟',
  M15: '15分钟',
  M30: '30分钟',
  H1: '1小时',
  H4: '4小时',
  D1: '日线',
  W1: '周线',
};

export const TIMEFRAME_MINUTES: Record<Timeframe, number> = {
  M1: 1,
  M5: 5,
  M15: 15,
  M30: 30,
  H1: 60,
  H4: 240,
  D1: 1440,
  W1: 10080,
};

export const TIMEFRAME_CANDLE_COUNT: Record<Timeframe, number> = {
  M1: 60,
  M5: 60,
  M15: 60,
  M30: 60,
  H1: 60,
  H4: 60,
  D1: 100,
  W1: 100,
};
