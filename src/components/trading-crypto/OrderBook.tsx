import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import type { OrderBook as OrderBookType } from '../../types/market';
import type { SymbolPair, Quote } from '../../types/market';
import { SYMBOL_DIGITS } from '../../constants/symbols';

interface OrderBookProps {
  symbol: SymbolPair;
  orderBook: OrderBookType | null;
  quote: Quote | undefined;
  onPriceClick?: (price: number) => void;
}

const OrderBookRow: React.FC<{
  price: number;
  size: number;
  total: number;
  maxTotal: number;
  side: 'bid' | 'ask';
  digits: number;
  onClick?: () => void;
}> = ({ price, size, total, maxTotal, side, digits, onClick }) => {
  const isBid = side === 'bid';
  const barWidth = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 0.35,
        px: 1.5,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
      }}
    >
      {/* 背景柱状图 */}
      <Box
        sx={{
          position: 'absolute',
          right: isBid ? 'auto' : 0,
          left: isBid ? 0 : 'auto',
          top: 0,
          bottom: 0,
          width: `${barWidth}%`,
          bgcolor: isBid ? 'rgba(0,200,83,0.08)' : 'rgba(255,23,68,0.08)',
          transition: 'width 0.3s',
        }}
      />
      {/* 价格 */}
      <Typography
        className="font-mono"
        sx={{
          color: isBid ? 'var(--accent-green)' : 'var(--accent-red)',
          fontSize: 11,
          fontWeight: 500,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {price.toFixed(digits)}
      </Typography>
      {/* 数量 */}
      <Typography className="font-mono" sx={{ color: 'var(--text-primary)', fontSize: 10, position: 'relative', zIndex: 1 }}>
        {size.toFixed(3)}
      </Typography>
      {/* 累计 */}
      <Typography className="font-mono" sx={{ color: 'var(--text-secondary)', fontSize: 10, position: 'relative', zIndex: 1 }}>
        {total.toFixed(3)}
      </Typography>
    </Box>
  );
};

const OrderBook: React.FC<OrderBookProps> = ({ symbol, orderBook, quote, onPriceClick }) => {
  const digits = SYMBOL_DIGITS[symbol] || 2;

  const { displayAsks, displayBids, maxTotal } = useMemo(() => {
    if (!orderBook) return { displayAsks: [], displayBids: [], maxTotal: 1 };

    const asks = (orderBook.asks || []).slice(0, 10).reverse();
    const bids = (orderBook.bids || []).slice(0, 10);

    // 如果没有数据，生成模拟数据
    const price = quote ? (quote.bid + quote.ask) / 2 : 50000;

    if (asks.length === 0) {
      for (let i = 10; i >= 1; i--) {
        const p = price * (1 + i * 0.001);
        const s = Math.random() * 10 + 1;
        asks.push({ price: p, size: s, total: 0 });
      }
    }
    if (bids.length === 0) {
      for (let i = 1; i <= 10; i++) {
        const p = price * (1 - i * 0.001);
        const s = Math.random() * 10 + 1;
        bids.push({ price: p, size: s, total: 0 });
      }
    }

    // 计算累计
    let askTotal = 0;
    asks.forEach(a => { askTotal += a.size; a.total = askTotal; });
    let bidTotal = 0;
    bids.forEach(b => { bidTotal += b.size; b.total = bidTotal; });

    const max = Math.max(askTotal, bidTotal, 1);

    return { displayAsks: asks, displayBids: bids, maxTotal: max };
  }, [orderBook, quote]);

  const spread = quote ? (quote.ask - quote.bid).toFixed(digits) : '0';
  const spreadPct = quote && quote.bid > 0 ? (((quote.ask - quote.bid) / quote.bid) * 100).toFixed(3) : '0';

  return (
    <Box sx={{ bgcolor: 'var(--bg-secondary)', borderRadius: '10px', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1.5, py: 0.8, borderBottom: '1px solid var(--border)' }}>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10, fontWeight: 600 }}>
          价格 ({symbol.includes('USDT') ? 'USDT' : 'USD'})
        </Typography>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10, fontWeight: 600 }}>
          数量
        </Typography>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10, fontWeight: 600 }}>
          累计
        </Typography>
      </Box>

      {/* Asks (卖盘) */}
      <Box sx={{ maxHeight: 180, overflow: 'hidden' }}>
        {displayAsks.map((row, i) => (
          <OrderBookRow key={`ask-${i}`} {...row} maxTotal={maxTotal} side="ask" digits={digits}
            onClick={() => onPriceClick?.(row.price)} />
        ))}
      </Box>

      {/* Spread (价差) */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        px: 1.5,
        py: 0.6,
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        bgcolor: '#1A1D27',
      }}>
        <Typography className="font-mono" sx={{ color: 'var(--accent-yellow)', fontSize: 12, fontWeight: 600 }}>
          {quote ? ((quote.bid + quote.ask) / 2).toFixed(digits) : '--'}
        </Typography>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
          价差 {spread} ({spreadPct}%)
        </Typography>
      </Box>

      {/* Bids (买盘) */}
      <Box sx={{ maxHeight: 180, overflow: 'hidden' }}>
        {displayBids.map((row, i) => (
          <OrderBookRow key={`bid-${i}`} {...row} maxTotal={maxTotal} side="bid" digits={digits}
            onClick={() => onPriceClick?.(row.price)} />
        ))}
      </Box>
    </Box>
  );
};

export default OrderBook;
