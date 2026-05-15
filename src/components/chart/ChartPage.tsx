import React, { useEffect, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography, Snackbar, Alert } from '@mui/material';
import PageContainer from '../layout/PageContainer';
import ChartCanvas from './ChartCanvas';
import TimeframeSelector from './TimeframeSelector';
import SymbolSelector from './SymbolSelector';
import IndicatorToggle from './IndicatorToggle';
import TradingPanel from '../trading-crypto/TradingPanel';
import OrderBook from '../trading-crypto/OrderBook';
import StrategyMonitorPanel from '../trading-crypto/StrategyMonitorPanel';
import { useStrategyStore } from '../../stores/strategyStore';
import { useChartStore } from '../../stores/chartStore';
import { useMarketStore } from '../../stores/marketStore';
import { useTradingModeStore } from '../../stores/tradingModeStore';
import { marketDataGenerator } from '../../engine/market-data-generator';
import { cryptoTradingEngine } from '../../engine/crypto-trading-engine';
import type { ChartRenderer as ChartRendererType } from '../../canvas/chart-renderer';
import type { SymbolPair, Timeframe } from '../../types/market';
import type { CryptoOrderType, MarginMode, PositionSide } from '../../types/trading';

const ChartPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const mode = useTradingModeStore((s) => s.mode);
  const symbol = useChartStore((s) => s.symbol);
  const timeframe = useChartStore((s) => s.timeframe);
  const candles = useChartStore((s) => s.candles);
  const visibleRange = useChartStore((s) => s.visibleRange);
  const indicators = useChartStore((s) => s.indicators);
  const setSymbol = useChartStore((s) => s.setSymbol);
  const setTimeframe = useChartStore((s) => s.setTimeframe);
  const setCandles = useChartStore((s) => s.setCandles);
  const toggleIndicator = useChartStore((s) => s.toggleIndicator);
  const zoomIn = useChartStore((s) => s.zoomIn);
  const zoomOut = useChartStore((s) => s.zoomOut);
  const resetView = useChartStore((s) => s.resetView);
  const quotes = useMarketStore((s) => s.quotes);

  const rendererRef = React.useRef<ChartRendererType | null>(null);
  const isCrypto = mode === 'crypto';

  // Crypto 模式交易状态
  const [leverage, setLeverage] = useState(10);
  const [marginMode, setMarginMode] = useState<MarginMode>('cross');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  useEffect(() => {
    const symbolParam = searchParams.get('symbol');
    if (symbolParam && (symbolParam as SymbolPair)) {
      setSymbol(symbolParam as SymbolPair);
    }
  }, [searchParams]);

  useEffect(() => {
    const generatedCandles = marketDataGenerator.generateHistoricalCandles(symbol, timeframe, 200);
    setCandles(generatedCandles);
  }, [symbol, timeframe]);

  // Crypto 模式: 模拟价格更新推动合约引擎
  useEffect(() => {
    if (!isCrypto) return;
    const quote = quotes[symbol];
    if (quote) {
      const price = (quote.bid + quote.ask) / 2;
      cryptoTradingEngine.updatePrice(symbol, price);
    }
  }, [quotes, symbol, isCrypto]);

  const handleRendererReady = useCallback((renderer: ChartRendererType) => {
    rendererRef.current = renderer;
  }, []);

  const handleGesture = useCallback((type: string, data: any) => {
    if (type === 'crosshair' && data.candle) {
      // crosshair data available
    }
  }, []);

  const handlePlaceOrder = useCallback((params: {
    side: PositionSide;
    orderType: CryptoOrderType;
    price: number;
    size: number;
    sl?: number;
    tp?: number;
  }) => {
    try {
      const position = cryptoTradingEngine.openPosition({
        symbol,
        side: params.side,
        orderType: params.orderType,
        price: params.price,
        size: Math.floor(params.size / (0.1 * params.price)),
        leverage,
        marginMode,
        sl: params.tp,
        tp: params.sl,
      });
      setSnackbar({
        open: true,
        message: `✅ ${params.side === 'long' ? '做多' : '做空'}开仓成功 | 张数: ${position.size} | ${leverage}x`,
        severity: 'success',
      });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: `❌ 开仓失败: ${err.message}`,
        severity: 'error',
      });
    }
  }, [symbol, leverage, marginMode]);

  const handleLeverageChange = useCallback((v: number) => {
    setLeverage(v);
    cryptoTradingEngine.setLeverage(v);
  }, []);

  const handleMarginModeChange = useCallback((v: MarginMode) => {
    setMarginMode(v);
    cryptoTradingEngine.setMarginMode(v);
  }, []);

  const currentQuote = quotes[symbol];
  const hasActiveStrategies = useStrategyStore((s) => s.strategies.some(st => st.isActive));

  return (
    <PageContainer padding={false} scroll={isCrypto}>
      {/* 顶部：品种选择 + 价格 + 周期 */}
      <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <SymbolSelector selected={symbol} onChange={setSymbol} />
          <Box sx={{ textAlign: 'right' }}>
            <Typography className="font-mono" sx={{
              color: 'var(--accent-green)', fontWeight: 700,
              fontSize: isCrypto ? 16 : 18,
            }}>
              {currentQuote?.bid?.toFixed(isCrypto ? 2 : 5) || '---'}
            </Typography>
            <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
              Spread: {currentQuote?.spread?.toFixed(5) || '---'}
            </Typography>
          </Box>
        </Box>
        <TimeframeSelector selected={timeframe} onChange={setTimeframe} />
      </Box>

      {/* K线图区域 */}
      <Box sx={{
        height: isCrypto ? 280 : 'calc(100vh - 280px)',
        minHeight: 200,
        position: 'relative',
        mx: 0.5,
      }}>
        <ChartCanvas
          candles={candles}
          visibleRange={visibleRange}
          indicators={indicators}
          onReady={handleRendererReady}
          onGesture={handleGesture}
        />
      </Box>

      {/* 指标切换 */}
      <Box sx={{ px: 2, py: 0.8 }}>
        <IndicatorToggle
          activeIndicators={indicators.filter(i => i.visible).map(i => i.type)}
          onToggle={(type) => toggleIndicator(type as any)}
        />
      </Box>

      {/* ===== Crypto模式：图表下方 ===== */}
      {isCrypto && (
        <>
          {/* 订单簿 */}
          <Box sx={{ px: 1, mb: 1 }}>
            <OrderBook symbol={symbol} orderBook={null} quote={currentQuote} />
          </Box>

          {/* 策略监控面板（取代手动交易面板） */}
          <Box sx={{ px: 1, mb: 2 }}>
            <StrategyMonitorPanel symbol={symbol} />
          </Box>
        </>
      )}

      {/* 交易反馈 */}
      <Snackbar open={snackbar.open} autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default ChartPage;
