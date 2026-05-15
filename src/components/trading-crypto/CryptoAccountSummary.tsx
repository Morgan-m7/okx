import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Chip, ToggleButtonGroup, ToggleButton } from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import CurrencyBitcoinIcon from '@mui/icons-material/CurrencyBitcoin';
import { useTradingStore } from '../../stores/tradingStore';
import { okxConnector } from '../../engine/okx-connector';
import { cryptoTradingEngine } from '../../engine/crypto-trading-engine';

interface CryptoAccountSummaryProps {
  totalUnrealizedPnl: number;
  totalMargin: number;
}

const CryptoAccountSummary: React.FC<CryptoAccountSummaryProps> = ({ totalUnrealizedPnl, totalMargin }) => {
  const account = useTradingStore((s) => s.account);
  const positions = useTradingStore((s) => s.contractPositions);
  const setAccount = useTradingStore((s) => s.setAccount);
  
  // ★ 直接从OKX连接器读取真实余额（绕过Store的中间覆盖问题）
  const isLiveMode = account.type === 'live';

  // ★ 本地状态：实时显示余额，每1秒从okxConnector和Store同步
  const [liveBalance, setLiveBalance] = useState(account.balance);
  const [liveCurrency, setLiveCurrency] = useState(account.currency);
  useEffect(() => {
    const timer = setInterval(() => {
      const b = okxConnector.getLastBalance();
      const targetBalance = isLiveMode && b.fetched ? b.balance : account.balance;
      const targetCurrency = isLiveMode && b.fetched ? b.currency : account.currency;
      if (liveBalance !== targetBalance || liveCurrency !== targetCurrency) {
        setLiveBalance(targetBalance);
        setLiveCurrency(targetCurrency);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [isLiveMode, account.balance, account.currency, liveBalance, liveCurrency]);

  const displayBalance = liveBalance;
  const displayCurrency = liveCurrency;

  const equity = displayBalance + totalUnrealizedPnl;
  const freeMargin = equity - totalMargin;
  const marginLevel = totalMargin > 0 ? (equity / totalMargin) * 100 : 0;
  const isDemo = account.type === 'demo';

  const handleToggleMode = useCallback(async (_: any, newMode: string | null) => {
    if (!newMode || newMode === account.type) return;

    if (newMode === 'demo') {
      // 切换到模拟模式：设置虚拟余额并重置引擎
      cryptoTradingEngine.reset();
      setAccount({
        ...account,
        type: 'demo',
        name: '模拟合约账户',
        balance: 100000,
        equity: 100000,
        marginUsed: 0,
        marginFree: 100000,
        marginLevel: 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        currency: 'USDT',
        leverage: 10,
        updatedAt: Date.now(),
      });
    } else if (newMode === 'live') {
      // 切换到实盘模式：从OKX获取真实余额
      cryptoTradingEngine.reset();
      if (okxConnector.isConnected()) {
        const { balance, currency } = await okxConnector.fetchAccountBalance();
        setAccount({
          ...account,
          type: 'live',
          name: 'OKX 实盘',
          balance,
          equity: balance,
          marginUsed: 0,
          marginFree: balance,
          marginLevel: 0,
          unrealizedPnl: 0,
          realizedPnl: 0,
          currency,
          leverage: account.leverage || 10,
          updatedAt: Date.now(),
        });
      } else {
        // OKX未连接，用模拟余额
        setAccount({
          ...account,
          type: 'live',
          name: 'OKX (离线)',
          balance: 0,
          equity: 0,
          marginUsed: 0,
          marginFree: 0,
          marginLevel: 0,
          unrealizedPnl: 0,
          realizedPnl: 0,
          currency: 'USDT',
          leverage: account.leverage || 10,
          updatedAt: Date.now(),
        });
      }
    }
  }, [account, setAccount]);

  return (
    <Box sx={{
      bgcolor: 'var(--bg-secondary)',
      borderRadius: '10px',
      p: 2,
      mb: 1.5,
    }}>
      {/* 头部 + 模拟/实盘切换 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Box>
          <Typography sx={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>
            {account.name}
          </Typography>
          <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
            {account.broker} · {account.currency || 'USDT'}
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={account.type}
          exclusive
          onChange={handleToggleMode}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              border: '1px solid #2A2D3A',
              px: 1,
              py: 0.2,
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'none',
              color: 'var(--text-secondary)',
              '&.Mui-selected': {
                bgcolor: isDemo ? 'rgba(255,214,0,0.15)' : 'rgba(0,200,83,0.15)',
                color: isDemo ? 'var(--accent-yellow)' : 'var(--accent-green)',
                borderColor: isDemo ? 'var(--accent-yellow)' : 'var(--accent-green)',
              },
            },
          }}
        >
          <ToggleButton value="demo" sx={{ borderRadius: '6px 0 0 6px !important' }}>
            <ScienceIcon sx={{ fontSize: 14, mr: 0.3 }} /> 模拟
          </ToggleButton>
          <ToggleButton value="live" sx={{ borderRadius: '0 6px 6px 0 !important' }}>
            <CurrencyBitcoinIcon sx={{ fontSize: 14, mr: 0.3 }} /> 实盘
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* 余额和权益 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>账户余额</Typography>
          <Typography className="font-mono" sx={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 18 }}>
            {displayCurrency === 'ETH' ? 'Ξ' : displayCurrency === 'BTC' ? '₿' : '$'}{displayBalance.toFixed(2)}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>权益</Typography>
          <Typography className="font-mono" sx={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 18 }}>
            {displayCurrency === 'ETH' ? 'Ξ' : displayCurrency === 'BTC' ? '₿' : '$'}{equity.toFixed(2)}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>未实现盈亏</Typography>
          <Typography className="font-mono" sx={{
            color: totalUnrealizedPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            fontWeight: 700, fontSize: 16,
          }}>
            {totalUnrealizedPnl >= 0 ? '+' : ''}{totalUnrealizedPnl.toFixed(2)}
          </Typography>
        </Box>
      </Box>

      {/* 余额显示提示 */}
      {isDemo && (
        <Box sx={{ mb: 1, px: 1, py: 0.5, bgcolor: 'rgba(255,214,0,0.08)', borderRadius: '6px' }}>
          <Typography sx={{ color: 'var(--accent-yellow)', fontSize: 10, textAlign: 'center' }}>
            ⚠️ 模拟模式 · 余额为虚拟资金，不可提现
          </Typography>
        </Box>
      )}

      {/* 保证金信息 */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>已用保证金</Typography>
          <Typography className="font-mono" sx={{ color: 'var(--text-primary)', fontSize: 12 }}>
            {displayCurrency === 'ETH' ? 'Ξ' : displayCurrency === 'BTC' ? '₿' : '$'}{totalMargin.toFixed(2)}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>可用保证金</Typography>
          <Typography className="font-mono" sx={{ color: isDemo ? 'var(--accent-yellow)' : 'var(--accent-green)', fontSize: 12 }}>
            {displayCurrency === 'ETH' ? 'Ξ' : displayCurrency === 'BTC' ? '₿' : '$'}{freeMargin.toFixed(2)}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>保证金率</Typography>
          <Typography className="font-mono" sx={{
            color: marginLevel > 200 ? 'var(--accent-green)' : marginLevel > 100 ? 'var(--accent-yellow)' : 'var(--accent-red)',
            fontSize: 12, fontWeight: 600,
          }}>
            {marginLevel.toFixed(1)}%
          </Typography>
        </Box>
      </Box>

      {/* 快速统计 */}
      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid var(--border)', display: 'flex', gap: 2 }}>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
          持仓: <span style={{ color: 'var(--text-primary)' }}>{positions.length}</span>
        </Typography>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
          杠杆: <span style={{ color: 'var(--accent-yellow)' }}>{account.leverage || 10}x</span>
        </Typography>
        {!isDemo && (
          <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
            数据源: <span style={{ color: 'var(--accent-green)' }}>OKX 实时</span>
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default CryptoAccountSummary;
