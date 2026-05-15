import React, { useState } from 'react';
import { Box, Typography, Fab, Snackbar, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PageContainer from '../layout/PageContainer';
import AccountSummary from './AccountSummary';
import PositionList from './PositionList';
import OpenPositionModal from './OpenPositionModal';
import { useTradingStore } from '../../stores/tradingStore';
import { useMarketStore } from '../../stores/marketStore';
import { useTradingModeStore } from '../../stores/tradingModeStore';
import { usePnLUpdater, useTradingEngine } from '../../hooks/useTradingEngine';
import CryptoTradingPage from '../trading-crypto/CryptoTradingPage';
import type { SymbolPair, Direction } from '../../types';

const TradingPage: React.FC = () => {
  const mode = useTradingModeStore((s) => s.mode);

  // Crypto 模式 → 渲染完整合约交易页面
  if (mode === 'crypto') {
    return <CryptoTradingPage />;
  }

  // Forex 模式 → 原有外汇模拟交易UI
  return <ForexTradingPage />;
};

/** 外汇模拟交易页面（保留原有逻辑） */
const ForexTradingPage: React.FC = () => {
  usePnLUpdater();
  const paperEngine = useTradingEngine();
  const account = useTradingStore((s) => s.account);
  const positions = useTradingStore((s) => s.positions);
  const [openModal, setOpenModal] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const handleOpenPosition = (params: { symbol: SymbolPair; direction: Direction; volume: number; sl?: number; tp?: number }) => {
    try {
      const quote = useMarketStore.getState().quotes[params.symbol];
      const price = quote ? (params.direction === 'buy' ? quote.ask : quote.bid) : 1.0;

      const signal = {
        strategyId: 'manual',
        symbol: params.symbol,
        direction: params.direction,
        type: 'open' as const,
        price,
        volume: params.volume,
        sl: params.sl,
        tp: params.tp,
        reason: 'Manual open',
        timestamp: Date.now(),
      };
      paperEngine.openPosition(signal);
      setOpenModal(false);
      setSnackbar({ open: true, message: '✅ 开仓成功', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: `❌ 开仓失败: ${err.message}`, severity: 'error' });
    }
  };

  const handleClosePosition = (id: string) => {
    const pos = paperEngine.getPosition(id);
    if (pos) {
      paperEngine.closePosition(id, pos.currentPrice, 'manual');
      setSnackbar({ open: true, message: '✅ 平仓成功', severity: 'success' });
    }
  };

  const handleEditSLTP = (id: string) => {
    paperEngine.updatePositionSLTP(id, null, null);
    setSnackbar({ open: true, message: '已更新止损止盈', severity: 'success' });
  };

  return (
    <PageContainer>
      <Box sx={{ px: 1, py: 1.5 }}>
        <Typography variant="h6" sx={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 20 }}>
          模拟交易
        </Typography>
        <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
          余额: ${account.balance.toFixed(2)} | 持仓: {positions.length}
        </Typography>
      </Box>

      <AccountSummary />
      <PositionList positions={positions} onClose={handleClosePosition} onEditSLTP={handleEditSLTP} />

      <Fab color="primary" sx={{
        position: 'fixed', bottom: 'calc(var(--tab-bar-height) + var(--safe-bottom) + 16px)',
        right: 20, bgcolor: 'var(--accent-blue)',
      }} onClick={() => setOpenModal(true)}>
        <AddIcon />
      </Fab>

      <OpenPositionModal open={openModal} onClose={() => setOpenModal(false)} onConfirm={handleOpenPosition} />

      <Snackbar open={snackbar.open} autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default TradingPage;
