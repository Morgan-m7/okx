import React from 'react';
import { Box, Typography } from '@mui/material';
import type { TradeRecord } from '../../types/trading';
import { formatDateTime } from '../../utils/time';

interface TradeLogListProps {
  trades: TradeRecord[];
}

const TradeLogList: React.FC<TradeLogListProps> = ({ trades }) => {
  if (trades.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
          暂无交易记录
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'var(--bg-secondary)', borderRadius: '10px', p: 2, mb: 2 }}>
      <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontWeight: 600, mb: 1, fontSize: 14 }}>
        交易记录 ({trades.length})
      </Typography>

      {trades.slice(-50).reverse().map((trade) => {
        const isProfit = trade.profit >= 0;
        return (
          <Box
            key={trade.id}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid var(--border)',
              '&:last-child': { borderBottom: 'none' },
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'var(--text-primary)', fontSize: 11, fontWeight: 600 }}>
                  {trade.symbol}
                </Typography>
                <Typography variant="caption" sx={{
                  color: trade.direction === 'buy' ? 'var(--accent-green)' : 'var(--accent-red)',
                  fontSize: 9,
                  fontWeight: 600,
                }}>
                  {trade.direction === 'buy' ? 'BUY' : 'SELL'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: 9 }}>
                  {trade.volume.toFixed(2)}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: 9 }}>
                开: {trade.openPrice.toFixed(5)} → 闭: {trade.closePrice.toFixed(5)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: 9, display: 'block' }}>
                {formatDateTime(trade.openTime)}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" className="font-mono" sx={{ color: isProfit ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: 12, fontWeight: 600 }}>
                {isProfit ? '+' : ''}{trade.profit.toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: 9, display: 'block' }}>
                {trade.pips.toFixed(1)} pips | {trade.closeReason}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default TradeLogList;
