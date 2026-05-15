import React, { useMemo } from 'react';
import {
  Box, Typography, TextField, Button, ToggleButtonGroup, ToggleButton,
  Slider, IconButton, Collapse,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import RouterIcon from '@mui/icons-material/Router';
import type { SymbolPair, Quote } from '../../types/market';
import type { CryptoOrderType, MarginMode, PositionSide } from '../../types/trading';
import { SYMBOL_DIGITS } from '../../constants/symbols';
import { useTradingStore } from '../../stores/tradingStore';
import { useStrategyStore } from '../../stores/strategyStore';
import { okxConnector } from '../../engine/okx-connector';

interface TradingPanelProps {
  symbol: SymbolPair;
  quote: Quote | undefined;
  leverage: number;
  marginMode: MarginMode;
  onLeverageChange: (v: number) => void;
  onMarginModeChange: (v: MarginMode) => void;
  onPlaceOrder: (params: {
    side: PositionSide;
    orderType: CryptoOrderType;
    price: number;
    size: number;
    sl?: number;
    tp?: number;
  }) => void;
}

const QUICK_AMOUNTS = ['10', '50', '100', '500', '1000', '5000'];

const TradingPanel: React.FC<TradingPanelProps> = ({
  symbol, quote, leverage, marginMode,
  onLeverageChange, onMarginModeChange, onPlaceOrder,
}) => {
  const [orderTab, setOrderTab] = React.useState<CryptoOrderType>('market');
  const [side, setSide] = React.useState<PositionSide>('long');
  const [price, setPrice] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [sl, setSl] = React.useState('');
  const [tp, setTp] = React.useState('');
  const [showLeverage, setShowLeverage] = React.useState(false);
  const [selectedStrategy, setSelectedStrategy] = React.useState<string>('');

  // ★ 读取可用策略
  const allStrategies = useStrategyStore((s) => s.strategies);
  const activeStrats = allStrategies.filter(s => s.isActive);

  // ★ 读取真实可用余额
  const account = useTradingStore((s) => s.account);
  const { balance: okxBal, fetched } = okxConnector.getLastBalance();
  const availableBalance = (account.type === 'live' && fetched) ? okxBal : account.balance;
  const isDemo = account.type === 'demo';

  const digits = SYMBOL_DIGITS[symbol] || 2;
  const currentPrice = quote ? ((quote.bid + quote.ask) / 2).toFixed(digits) : '--';
  const currentPriceNum = parseFloat(currentPrice) || 0;

  // ★ 计算规则：用户输入的是保证金(Margin)，开仓价值 = 保证金 × 杠杆
  //   例: 输入1000USDT, 10x杠杆 → 保证金=1000, 开仓价值=10000
  const inputMargin = parseFloat(amount) || 0;
  const positionValue = inputMargin * leverage;      // 开仓价值 = 保证金 × 杠杆
  const marginRequired = inputMargin;                 // 保证金 = 用户输入额
  const marginRatio = availableBalance > 0 ? (inputMargin / availableBalance) * 100 : 0;
  const canOpen = inputMargin <= availableBalance;

  // ★ 最大可开保证金 = 全部可用余额
  const maxMargin = availableBalance;
  const maxPositionValue = maxMargin * leverage;

  // ★ 百分比快捷按钮（基于可用余额）
  const pctAmounts = useMemo(() => {
    const pcts = [0.1, 0.25, 0.5, 0.75, 1];
    return pcts.map(p => ({
      label: `${(p * 100).toFixed(0)}%`,
      value: (availableBalance * p).toFixed(2),
    }));
  }, [availableBalance]);

  const handleAmountClick = (v: string) => setAmount(v);

  const handlePctClick = (pct: number) => {
    setAmount((availableBalance * leverage * pct).toFixed(2));
  };

  const handleSubmit = (dir: PositionSide) => {
    const margin = parseFloat(amount) || 0;
    if (margin <= 0 || !canOpen) return;
    // 传给引擎的是开仓价值 = 保证金 × 杠杆
    onPlaceOrder({
      side: dir,
      orderType: orderTab,
      price: orderTab === 'limit' ? parseFloat(price) : currentPriceNum,
      size: margin * leverage,  // 开仓价值(USDT)
      sl: tp ? parseFloat(tp) : undefined,
      tp: sl ? parseFloat(sl) : undefined,
    });
  };

  return (
    <Box sx={{ bgcolor: 'var(--bg-secondary)', borderRadius: '10px', overflow: 'hidden' }}>
      {/* 可用余额条 */}
      <Box sx={{ px: 2, py: 1, bgcolor: '#1A1D27', borderBottom: '1px solid var(--border)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
            可用 {isDemo ? '余额' : ''}
          </Typography>
          <Typography className="font-mono" sx={{ color: 'var(--accent-green)', fontWeight: 600, fontSize: 13 }}>
            ${availableBalance.toFixed(2)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.3 }}>
          <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
            最大开仓价值 {leverage}x
          </Typography>
          <Typography className="font-mono" sx={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 12 }}>
            ${maxPositionValue.toFixed(2)}
          </Typography>
        </Box>
      </Box>

      {/* 价格显示 */}
      <Box sx={{ px: 2, py: 1, borderBottom: '1px solid var(--border)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Typography className="font-mono" sx={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 20 }}>
            {currentPrice}
          </Typography>
          <Typography sx={{ color: 'var(--text-secondary)', fontSize: 11 }}>
            开仓价值 ${(positionValue || 1).toFixed(2)}
          </Typography>
        </Box>
      </Box>

      {/* 订单类型 Tab */}
      <ToggleButtonGroup
        value={orderTab}
        exclusive
        onChange={(_, v) => v && setOrderTab(v)}
        fullWidth size="small"
        sx={{
          px: 1, pt: 1,
          '& .MuiToggleButton-root': {
            color: 'var(--text-secondary)', border: 'none',
            fontSize: 12, py: 0.5, textTransform: 'none',
            borderRadius: '6px 6px 0 0 !important',
            '&.Mui-selected': { bgcolor: 'rgba(33,150,243,0.12)', color: 'var(--accent-blue)' },
          },
        }}
      >
        <ToggleButton value="market">市价</ToggleButton>
        <ToggleButton value="limit">限价</ToggleButton>
        <ToggleButton value="stop">止损</ToggleButton>
      </ToggleButtonGroup>

      <Box sx={{ px: 1.5, pb: 1.5 }}>
        {/* 限价/止损价格输入 */}
        {(orderTab === 'limit' || orderTab === 'stop') && (
          <TextField fullWidth size="small"
            label={orderTab === 'limit' ? '限价 (USDT)' : '触发价 (USDT)'}
            value={price} onChange={e => setPrice(e.target.value)}
            sx={inputSx} type="number" />
        )}

        {/* 保证金输入 */}
        <TextField fullWidth size="small"
          label={`保证金 (USDT) — 可用 $${availableBalance.toFixed(2)}`}
          value={amount} onChange={e => setAmount(e.target.value)}
          sx={inputSx} type="number"
          error={!canOpen && inputMargin > 0}
          helperText={!canOpen && inputMargin > 0 ? `超出可用额度，最大 $${maxMargin.toFixed(2)}` : inputMargin > 0 ? `开仓价值 $${positionValue.toFixed(2)}` : ''}
        />

        {/* 快捷百分比按钮（基于余额×杠杆计算） */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
          {pctAmounts.map(({ label, value }) => (
            <Button key={label} size="small"
              onClick={() => setAmount(value)}
              sx={{
                flex: 1, height: 26, fontSize: 10,
                color: amount === value ? 'var(--accent-blue)' : 'var(--text-secondary)',
                bgcolor: amount === value ? 'rgba(33,150,243,0.12)' : '#1A1D27',
                borderRadius: 1, minWidth: 0,
                '&:hover': { bgcolor: 'rgba(33,150,243,0.2)' },
              }}
            >
              {label}
            </Button>
          ))}
        </Box>

        {/* 快捷USDT保证金按钮 */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
          {QUICK_AMOUNTS.map(v => {
            const val = parseFloat(v);
            const withinLimit = val <= maxMargin;
            return (
              <Button key={v} size="small"
                onClick={() => withinLimit && setAmount(v)}
                disabled={!withinLimit}
                sx={{
                  minWidth: 40, height: 24, fontSize: 10,
                  color: amount === v ? 'var(--accent-blue)' : withinLimit ? 'var(--text-secondary)' : '#444',
                  bgcolor: amount === v ? 'rgba(33,150,243,0.12)' : '#1A1D27',
                  borderRadius: 1, px: 0.5, opacity: withinLimit ? 1 : 0.4,
                  '&:hover': withinLimit ? { bgcolor: 'rgba(33,150,243,0.2)' } : {},
                }}
              >
                ${v}
              </Button>
            );
          })}
        </Box>

        {/* 杠杆 */}
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography sx={{ color: 'var(--text-secondary)', fontSize: 11 }}>
              杠杆 {leverage}x
            </Typography>
            <IconButton size="small" onClick={() => setShowLeverage(!showLeverage)}
              sx={{ color: 'var(--text-secondary)' }}>
              <KeyboardArrowDownIcon fontSize="small" />
            </IconButton>
          </Box>
          <Collapse in={showLeverage}>
            <Slider value={leverage} min={1} max={125} step={1}
              onChange={(_, v) => onLeverageChange(v as number)}
              sx={{
                color: 'var(--accent-yellow)', height: 3,
                '& .MuiSlider-thumb': { width: 14, height: 14, bgcolor: '#FFD600' },
                '& .MuiSlider-track': { bgcolor: 'var(--accent-yellow)' },
                '& .MuiSlider-rail': { bgcolor: '#2A2D3A' },
              }} />
          </Collapse>
        </Box>

        {/* 策略选择 */}
        <Box sx={{ mb: 1, p: 1, bgcolor: '#1A1D27', borderRadius: '8px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <RouterIcon sx={{ color: '#2196F3', fontSize: 14 }} />
            <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>关联策略</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Box
              onClick={() => setSelectedStrategy('')}
              sx={{
                px: 1, py: 0.3, borderRadius: '10px', cursor: 'pointer', fontSize: 10,
                bgcolor: selectedStrategy === '' ? 'rgba(33,150,243,0.15)' : '#16181E',
                color: selectedStrategy === '' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                border: '1px solid', borderColor: selectedStrategy === '' ? 'var(--accent-blue)' : '#2A2D3A',
              }}
            >
              手动
            </Box>
            {activeStrats.map(s => (
              <Box key={s.id}
                onClick={() => setSelectedStrategy(s.id)}
                sx={{
                  px: 1, py: 0.3, borderRadius: '10px', cursor: 'pointer', fontSize: 10,
                  bgcolor: selectedStrategy === s.id ? 'rgba(33,150,243,0.15)' : '#16181E',
                  color: selectedStrategy === s.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  border: '1px solid', borderColor: selectedStrategy === s.id ? 'var(--accent-blue)' : '#2A2D3A',
                }}
              >
                {s.name}
              </Box>
            ))}
            {activeStrats.length === 0 && (
              <Typography sx={{ color: '#555', fontSize: 10 }}>未启用策略（设置→策略中开启）</Typography>
            )}
          </Box>
        </Box>

        {/* 止损止盈 */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <TextField fullWidth size="small" label="止盈" value={tp}
            onChange={e => setTp(e.target.value)} type="number"
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#1A1D27', color: '#00C853', fontSize: 12, '& fieldset': { borderColor: '#2A2D3A' } }, '& .MuiInputLabel-root': { color: '#8B8D97', fontSize: 11 } }} />
          <TextField fullWidth size="small" label="止损" value={sl}
            onChange={e => setSl(e.target.value)} type="number"
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#1A1D27', color: '#FF1744', fontSize: 12, '& fieldset': { borderColor: '#2A2D3A' } }, '& .MuiInputLabel-root': { color: '#8B8D97', fontSize: 11 } }} />
        </Box>

        {/* 做多/做空 — 余额不足时禁用 */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button fullWidth disabled={!canOpen || inputMargin <= 0}
            onClick={() => handleSubmit('long')}
            sx={{
              bgcolor: 'var(--accent-green)', color: '#000',
              fontWeight: 700, py: 1.2, fontSize: 14,
              borderRadius: '8px', opacity: canOpen && inputMargin > 0 ? 1 : 0.4,
              '&:hover': { bgcolor: '#00E676' },
              '&:active': { transform: 'scale(0.98)' },
            }}
          >
            做多 {inputMargin > 0 ? `$${positionValue.toFixed(0)}` : ''}
          </Button>
          <Button fullWidth disabled={!canOpen || inputMargin <= 0}
            onClick={() => handleSubmit('short')}
            sx={{
              bgcolor: 'var(--accent-red)', color: '#fff',
              fontWeight: 700, py: 1.2, fontSize: 14,
              borderRadius: '8px', opacity: canOpen && inputMargin > 0 ? 1 : 0.4,
              '&:hover': { bgcolor: '#FF5252' },
              '&:active': { transform: 'scale(0.98)' },
            }}
          >
            做空 {inputMargin > 0 ? `$${positionValue.toFixed(0)}` : ''}
          </Button>
        </Box>

        {/* 保证金详情 */}
        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid var(--border)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
            <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>保证金</Typography>
            <Typography sx={{ color: canOpen ? 'var(--text-primary)' : 'var(--accent-red)', fontSize: 10, fontWeight: 600 }}>
              ${inputMargin.toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
            <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>开仓价值 ({leverage}x)</Typography>
            <Typography sx={{ color: 'var(--text-primary)', fontSize: 10, fontWeight: 600 }}>
              ${positionValue.toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
            <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>保证金占比</Typography>
            <Typography sx={{ color: marginRatio > 80 ? 'var(--accent-red)' : marginRatio > 50 ? 'var(--accent-yellow)' : 'var(--text-primary)', fontSize: 10, fontWeight: 600 }}>
              {marginRatio.toFixed(1)}%
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>强平预估</Typography>
            <Typography sx={{ color: 'var(--accent-red)', fontSize: 10 }}>
              {side === 'long' ? '↓' : '↑'} ${(currentPriceNum * (1 - (side === 'long' ? 1 : -1) * 0.2 / leverage)).toFixed(digits)}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

const inputSx = {
  mb: 1,
  '& .MuiOutlinedInput-root': {
    bgcolor: '#1A1D27', color: '#fff',
    '& fieldset': { borderColor: '#2A2D3A' },
    '&:hover fieldset': { borderColor: '#2196F3' },
    '&.Mui-focused fieldset': { borderColor: '#2196F3' },
  },
  '& .MuiInputLabel-root': { color: '#8B8D97', fontSize: 12 },
  '& .MuiFormHelperText-root': { color: '#FF1744', fontSize: 10, m: 0, mt: 0.3 },
};

export default TradingPanel;
