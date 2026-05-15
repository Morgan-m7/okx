import React from 'react';
import { Box, Typography } from '@mui/material';
import type { FundingRate as FundingRateType } from '../../types/market';

interface FundingRateProps {
  rate: FundingRateType | null;
  isLoading?: boolean;
}

const FundingRate: React.FC<FundingRateProps> = ({ rate, isLoading }) => {
  if (isLoading) {
    return (
      <Box sx={{
        bgcolor: 'var(--bg-secondary)', borderRadius: '10px',
        p: 1.5, textAlign: 'center',
      }}>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 11 }}>
          加载资金费率...
        </Typography>
      </Box>
    );
  }

  if (!rate) {
    return (
      <Box sx={{
        bgcolor: 'var(--bg-secondary)', borderRadius: '10px',
        p: 1.5, textAlign: 'center',
      }}>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 11 }}>
          暂无资金费率数据
        </Typography>
      </Box>
    );
  }

  const ratePct = (rate.fundingRate * 100).toFixed(4);
  const isPositive = rate.fundingRate >= 0;
  const timeLeft = Math.max(0, rate.nextFundingTime - Date.now());
  const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
  const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

  return (
    <Box sx={{
      bgcolor: 'var(--bg-secondary)', borderRadius: '10px',
      p: 1.5,
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 11 }}>
          资金费率
        </Typography>
        <Typography className="font-mono" sx={{
          color: isPositive ? 'var(--accent-red)' : 'var(--accent-green)',
          fontWeight: 600, fontSize: 13,
        }}>
          {isPositive ? '+' : ''}{ratePct}%
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.3 }}>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
          下次结算
        </Typography>
        <Typography sx={{ color: 'var(--text-primary)', fontSize: 11, fontWeight: 500 }}>
          {hoursLeft}h {minutesLeft}m 后
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.3 }}>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
          结算周期
        </Typography>
        <Typography sx={{ color: 'var(--text-primary)', fontSize: 11 }}>
          每 {rate.interval} 小时
        </Typography>
      </Box>
    </Box>
  );
};

export default FundingRate;
