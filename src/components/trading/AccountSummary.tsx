import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTradingStore } from '../../stores/tradingStore';
import PriceLabel from '../shared/PriceLabel';

const AccountSummary: React.FC = () => {
  const account = useTradingStore((s) => s.account);
  const positions = useTradingStore((s) => s.positions);
  const totalProfit = positions.reduce((sum, p) => sum + p.profit, 0);

  return (
    <Box
      sx={{
        bgcolor: 'var(--bg-secondary)',
        borderRadius: '10px',
        p: 2,
        mb: 2,
      }}
    >
      {/* 账户名称和类型 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Box>
          <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>
            {account.name}
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
            {account.broker} · {account.type === 'demo' ? '模拟' : '实盘'}
          </Typography>
        </Box>
        <Box sx={{ px: 1.5, py: 0.3, borderRadius: '12px', bgcolor: account.type === 'demo' ? 'rgba(255,214,0,0.15)' : 'rgba(0,200,83,0.15)' }}>
          <Typography variant="caption" sx={{ color: account.type === 'demo' ? 'var(--accent-yellow)' : 'var(--accent-green)', fontWeight: 600, fontSize: 11 }}>
            {account.type === 'demo' ? '模拟' : '实盘'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: 11 }}>
          余额
        </Typography>
        <Typography variant="body1" className="font-mono" sx={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 20 }}>
          ${account.balance.toFixed(2)}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: 11 }}>
          净值
        </Typography>
        <Typography variant="body2" className="font-mono" sx={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          ${account.equity.toFixed(2)}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: 11 }}>
          浮动盈亏
        </Typography>
        <PriceLabel value={totalProfit} showSign variant="price" prefix="$" digits={2} />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: 11 }}>
          已用保证金
        </Typography>
        <Typography variant="body2" className="font-mono" sx={{ color: 'var(--text-primary)' }}>
          ${account.marginUsed.toFixed(2)}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: 11 }}>
          可用保证金
        </Typography>
        <Typography variant="body2" className="font-mono" sx={{ color: 'var(--accent-green)' }}>
          ${account.marginFree.toFixed(2)}
        </Typography>
      </Box>

      {account.marginLevel > 0 && (
        <Box
          sx={{
            mt: 1.5,
            pt: 1.5,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: 11 }}>
            保证金比例
          </Typography>
          <Typography
            variant="body2"
            className="font-mono"
            sx={{
              color: account.marginLevel > 200 ? 'var(--accent-green)' : account.marginLevel > 100 ? 'var(--accent-yellow)' : 'var(--accent-red)',
              fontWeight: 600,
            }}
          >
            {account.marginLevel.toFixed(0)}%
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AccountSummary;
