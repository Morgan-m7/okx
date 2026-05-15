import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, ToggleButtonGroup, ToggleButton, Snackbar, Alert } from '@mui/material';
import PageContainer from '../layout/PageContainer';
import CryptoAccountSummary from './CryptoAccountSummary';
import TradingPanel from './TradingPanel';
import OrderBook from './OrderBook';
import CryptoPositionList from './CryptoPositionList';
import OpenOrdersList from './OpenOrdersList';
import FundingRate from './FundingRate';
import { cryptoTradingEngine } from '../../engine/crypto-trading-engine';
import { useCryptoAutoTrader } from '../../hooks/useCryptoAutoTrader';
import { useTradingStore } from '../../stores/tradingStore';
import { useMarketStore } from '../../stores/marketStore';
import type { SymbolPair, OrderBook as OrderBookType, FundingRate as FundingRateType } from '../../types/market';
import type { CryptoOrderType, MarginMode, PositionSide, ContractPosition } from '../../types/trading';
import { getDefaultSymbol } from '../../constants/symbols';
import { useTradingModeStore } from '../../stores/tradingModeStore';

const CryptoTradingPage: React.FC = () => {
  const mode = useTradingModeStore((s) => s.mode);

  // ★ 启动加密货币自动交易引擎
  useCryptoAutoTrader();
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolPair>(getDefaultSymbol('crypto'));
  const [tabIndex, setTabIndex] = useState(0); // 0=持仓 1=订单
  const [leverage, setLeverage] = useState(10);
  const [marginMode, setMarginMode] = useState<MarginMode>('cross');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const quotes = useMarketStore((s) => s.quotes);
  const activeSymbols = useMarketStore((s) => s.activeSymbols);
  const contractPositions = useTradingStore((s) => s.contractPositions);
  const openOrders = useTradingStore((s) => s.openOrders);
  const account = useTradingStore((s) => s.account);

  const quote = quotes[selectedSymbol];

  // 模拟订单簿数据
  const [orderBook, setOrderBook] = useState<OrderBookType | null>(null);

  // 模拟资金费率
  const [fundingRate, setFundingRate] = useState<FundingRateType | null>(null);

  // 初始化模拟数据
  useEffect(() => {
    const price = quote ? (quote.bid + quote.ask) / 2 : 50000;
    const generateOrderBook = () => {
      const bids = [];
      const asks = [];
      for (let i = 1; i <= 15; i++) {
        bids.push({ price: price * (1 - i * 0.0008), size: Math.random() * 10 + 0.1, total: 0 });
        asks.push({ price: price * (1 + i * 0.0008), size: Math.random() * 10 + 0.1, total: 0 });
      }
      let bidTotal = 0, askTotal = 0;
      bids.forEach(b => { bidTotal += b.size; b.total = bidTotal; });
      asks.forEach(a => { askTotal += a.size; a.total = askTotal; });
      setOrderBook({ symbol: selectedSymbol, bids, asks, timestamp: Date.now() });
    };

    const fr: FundingRateType = {
      symbol: selectedSymbol,
      fundingRate: (Math.random() - 0.5) * 0.002,
      fundingTime: Date.now(),
      nextFundingTime: Date.now() + 8 * 60 * 60 * 1000,
      interval: 8,
    };
    setFundingRate(fr);
    generateOrderBook();
  }, [selectedSymbol, quote]);

  // 模拟价格更新推动合约计算
  useEffect(() => {
    if (!quote) return;
    const price = (quote.bid + quote.ask) / 2;
    cryptoTradingEngine.updatePrice(selectedSymbol, price);
  }, [quote, selectedSymbol]);

  // 统计
  const totalUnrealizedPnl = useMemo(() =>
    contractPositions.reduce((s, p) => s + p.unrealizedPnl, 0),
    [contractPositions]
  );
  const totalMargin = useMemo(() =>
    contractPositions.reduce((s, p) => s + p.margin, 0),
    [contractPositions]
  );

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
        symbol: selectedSymbol,
        side: params.side,
        orderType: params.orderType,
        price: params.price,
        // params.size = 开仓价值(USDT) = 保证金 × 杠杆
        // 转换为张数: 开仓价值 / (合约面值 0.1 × 价格)
        size: Math.floor(params.size / (0.1 * params.price)),
        leverage,
        marginMode,
        sl: params.tp,
        tp: params.sl,
      });
      setSnackbar({
        open: true,
        message: `✅ ${params.side === 'long' ? '做多' : '做空'}开仓成功 | 张数: ${position.size} | 杠杆: ${leverage}x`,
        severity: 'success',
      });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: `❌ 开仓失败: ${err.message}`,
        severity: 'error',
      });
    }
  }, [selectedSymbol, leverage, marginMode]);

  const handleClosePosition = useCallback((id: string) => {
    try {
      cryptoTradingEngine.closePosition(id);
      setSnackbar({ open: true, message: '✅ 平仓成功', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: `❌ 平仓失败: ${err.message}`, severity: 'error' });
    }
  }, []);

  const handleCancelOrder = useCallback((id: string) => {
    cryptoTradingEngine.cancelOrder(id);
    setSnackbar({ open: true, message: '✅ 已撤单', severity: 'success' });
  }, []);

  const handleSetSLTP = useCallback((id: string) => {
    setSnackbar({ open: true, message: '请在下单面板设置止盈止损', severity: 'success' });
  }, []);

  const handleLeverageChange = useCallback((v: number) => {
    setLeverage(v);
    cryptoTradingEngine.setLeverage(v);
  }, []);

  const handleMarginModeChange = useCallback((v: MarginMode) => {
    setMarginMode(v);
    cryptoTradingEngine.setMarginMode(v);
  }, []);

  const handlePriceClick = useCallback((price: number) => {
    // 点击订单簿价格 → 不做特殊处理，用户可手动输入
  }, []);

  return (
    <PageContainer>
      {/* 标题和品种选择 */}
      <Box sx={{ px: 1, py: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 18 }}>
          💱 合约交易
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', flex: 1 }}>
          {activeSymbols.slice(0, 6).map(s => (
            <Box key={s} onClick={() => setSelectedSymbol(s)}
              sx={{
                px: 1, py: 0.3, borderRadius: '12px', cursor: 'pointer',
                bgcolor: selectedSymbol === s ? 'rgba(33,150,243,0.15)' : '#1A1D27',
                color: selectedSymbol === s ? 'var(--accent-blue)' : 'var(--text-secondary)',
                fontSize: 11, fontWeight: selectedSymbol === s ? 600 : 400,
                '&:hover': { bgcolor: 'rgba(33,150,243,0.1)' },
              }}>
              {s}
            </Box>
          ))}
        </Box>
      </Box>

      {/* 账户摘要 */}
      <Box sx={{ px: 1 }}>
        <CryptoAccountSummary totalUnrealizedPnl={totalUnrealizedPnl} totalMargin={totalMargin} />
      </Box>

      {/* 主交易区：订单簿 + 交易面板 */}
      <Box sx={{ px: 1, display: 'flex', gap: 1, mb: 1.5 }}>
        {/* 订单簿 */}
        <Box sx={{ flex: 1, minWidth: 0, maxWidth: '45%' }}>
          <OrderBook symbol={selectedSymbol} orderBook={orderBook} quote={quote} onPriceClick={handlePriceClick} />
        </Box>

        {/* 交易面板 */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <TradingPanel
            symbol={selectedSymbol}
            quote={quote}
            leverage={leverage}
            marginMode={marginMode}
            onLeverageChange={handleLeverageChange}
            onMarginModeChange={handleMarginModeChange}
            onPlaceOrder={handlePlaceOrder}
          />
        </Box>
      </Box>

      {/* 资金费率 */}
      <Box sx={{ px: 1, mb: 1 }}>
        <FundingRate rate={fundingRate} />
      </Box>

      {/* 持仓/订单 Tab */}
      <Box sx={{ px: 1 }}>
        <ToggleButtonGroup
          value={tabIndex}
          exclusive
          onChange={(_, v) => v !== null && setTabIndex(v)}
          size="small"
          sx={{
            mb: 1,
            '& .MuiToggleButton-root': {
              color: 'var(--text-secondary)', borderColor: '#2A2D3A',
              fontSize: 12, px: 2,
              textTransform: 'none',
              '&.Mui-selected': {
                bgcolor: 'rgba(33,150,243,0.12)',
                color: 'var(--accent-blue)',
                borderColor: 'var(--accent-blue)',
              },
            },
          }}
        >
          <ToggleButton value={0}>持仓 ({contractPositions.length})</ToggleButton>
          <ToggleButton value={1}>未成交订单 ({openOrders.length})</ToggleButton>
        </ToggleButtonGroup>

        {tabIndex === 0 ? (
          <CryptoPositionList
            positions={contractPositions}
            onClose={handleClosePosition}
            onSetSLTP={handleSetSLTP}
          />
        ) : (
          <OpenOrdersList orders={openOrders} onCancel={handleCancelOrder} />
        )}
      </Box>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default CryptoTradingPage;
