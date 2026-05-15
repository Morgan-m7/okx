import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import type { CryptoOrder } from '../../types/trading';
import { SYMBOL_DIGITS } from '../../constants/symbols';

interface OpenOrdersListProps {
  orders: CryptoOrder[];
  onCancel: (id: string) => void;
}

const orderTypeLabels: Record<string, string> = {
  market: '市价',
  limit: '限价',
  stop: '止损',
  stop_limit: '止损限价',
  take_profit: '止盈',
  take_profit_limit: '止盈限价',
};

const orderStatusLabels: Record<string, string> = {
  live: '进行中',
  partially_filled: '部分成交',
  filled: '已成交',
  cancelled: '已取消',
  expired: '已过期',
};

const orderStatusColors: Record<string, string> = {
  live: 'var(--accent-blue)',
  partially_filled: 'var(--accent-yellow)',
  filled: 'var(--accent-green)',
  cancelled: 'var(--text-secondary)',
  expired: 'var(--accent-red)',
};

const OpenOrdersList: React.FC<OpenOrdersListProps> = ({ orders, onCancel }) => {
  if (orders.length === 0) {
    return (
      <Box sx={{
        bgcolor: 'var(--bg-secondary)', borderRadius: '10px',
        p: 2, textAlign: 'center',
      }}>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 12 }}>
          暂无未成交订单
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography sx={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, mb: 1, px: 0.5 }}>
        未成交订单 ({orders.length})
      </Typography>
      {orders.map(order => {
        const digits = SYMBOL_DIGITS[order.symbol] || 2;
        return (
          <Box key={order.id} sx={{
            p: 1.5, mb: 0.5,
            bgcolor: '#1A1D27', borderRadius: '8px',
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 12 }}>
                  {order.symbol}
                </Typography>
                <Typography sx={{
                  fontSize: 10, px: 0.8, py: 0.1, borderRadius: '3px',
                  bgcolor: order.side === 'buy' ? 'rgba(0,200,83,0.15)' : 'rgba(255,23,68,0.15)',
                  color: order.side === 'buy' ? 'var(--accent-green)' : 'var(--accent-red)',
                }}>
                  {order.side === 'buy' ? '买入' : '卖出'}
                </Typography>
                <Typography sx={{
                  fontSize: 10, px: 0.8, py: 0.1, borderRadius: '3px',
                  bgcolor: 'rgba(33,150,243,0.12)',
                  color: 'var(--accent-blue)',
                }}>
                  {orderTypeLabels[order.orderType] || order.orderType}
                </Typography>
              </Box>
              <Typography sx={{
                fontSize: 10, px: 0.8, py: 0.1, borderRadius: '3px',
                bgcolor: `${orderStatusColors[order.status]}15`,
                color: orderStatusColors[order.status],
              }}>
                {orderStatusLabels[order.status] || order.status}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
              <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
                价格: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{order.price.toFixed(digits)}</span>
              </Typography>
              <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
                数量: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{order.size.toFixed(3)}</span>
              </Typography>
              <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
                已成交: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{order.filledSize.toFixed(3)}</span>
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
              <Typography sx={{ color: 'var(--text-secondary)', fontSize: 9 }}>
                {order.leverage}x {order.marginMode === 'cross' ? '全仓' : '逐仓'}
              </Typography>
              {order.status === 'live' && (
                <Button size="small"
                  onClick={() => onCancel(order.id)}
                  sx={{
                    fontSize: 10, py: 0.1, px: 1,
                    color: 'var(--accent-red)',
                    minWidth: 'auto',
                    textTransform: 'none',
                    '&:hover': { bgcolor: 'rgba(255,23,68,0.1)' },
                  }}>
                  撤单
                </Button>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default OpenOrdersList;
