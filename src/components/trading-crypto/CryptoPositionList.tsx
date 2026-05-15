import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import type { ContractPosition } from '../../types/trading';
import { SYMBOL_DIGITS } from '../../constants/symbols';

interface CryptoPositionListProps {
  positions: ContractPosition[];
  onClose: (id: string) => void;
  onSetSLTP: (id: string) => void;
}

const PositionRow: React.FC<{
  position: ContractPosition;
  onClose: () => void;
  onSetSLTP: () => void;
}> = ({ position, onClose, onSetSLTP }) => {
  const digits = SYMBOL_DIGITS[position.symbol] || 2;
  const isLong = position.positionSide === 'long';
  const pnlColor = position.unrealizedPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

  return (
    <Box sx={{
      p: 1.5,
      mb: 0.5,
      bgcolor: '#1A1D27',
      borderRadius: '8px',
      borderLeft: `3px solid ${isLong ? 'var(--accent-green)' : 'var(--accent-red)'}`,
    }}>
      {/* 第一行: 交易对 + 方向 + PnL */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>
            {position.symbol}
          </Typography>
          <Box sx={{
            px: 1, py: 0.2, borderRadius: '4px', fontSize: 10,
            bgcolor: isLong ? 'rgba(0,200,83,0.15)' : 'rgba(255,23,68,0.15)',
            color: isLong ? 'var(--accent-green)' : 'var(--accent-red)',
            fontWeight: 600,
          }}>
            {isLong ? '多' : '空'} {position.leverage}x
          </Box>
        </Box>
        <Typography className="font-mono" sx={{ color: pnlColor, fontWeight: 700, fontSize: 13 }}>
          {position.unrealizedPnl >= 0 ? '+' : ''}{position.unrealizedPnl.toFixed(2)}
        </Typography>
      </Box>

      {/* 第二行: 数量 + 开仓价 + 标记价 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
          数量: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{position.size.toFixed(3)}</span>
        </Typography>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
          开仓: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{position.avgOpenPrice.toFixed(digits)}</span>
        </Typography>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
          标记: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{position.markPrice.toFixed(digits)}</span>
        </Typography>
      </Box>

      {/* 第三行: 强平价 + 保证金 + ROI */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
          强平: <span className="font-mono" style={{ color: 'var(--accent-red)' }}>{position.liqPrice > 0 ? position.liqPrice.toFixed(digits) : '--'}</span>
        </Typography>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
          保证金: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>${position.margin.toFixed(2)}</span>
        </Typography>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
          ROI: <span className="font-mono" style={{ color: pnlColor }}>{position.roi >= 0 ? '+' : ''}{position.roi.toFixed(2)}%</span>
        </Typography>
      </Box>

      {/* 操作按钮 */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" variant="outlined"
          onClick={onSetSLTP}
          sx={{
            flex: 1, fontSize: 11, py: 0.3,
            color: 'var(--accent-blue)', borderColor: 'var(--accent-blue)',
            textTransform: 'none',
            '&:hover': { borderColor: '#64B5F6', bgcolor: 'rgba(33,150,243,0.08)' },
          }}>
          止盈止损
        </Button>
        <Button size="small"
          onClick={onClose}
          sx={{
            flex: 1, fontSize: 11, py: 0.3,
            bgcolor: 'rgba(255,23,68,0.15)', color: 'var(--accent-red)',
            textTransform: 'none',
            '&:hover': { bgcolor: 'rgba(255,23,68,0.25)' },
          }}>
          平仓
        </Button>
      </Box>
    </Box>
  );
};

const CryptoPositionList: React.FC<CryptoPositionListProps> = ({ positions, onClose, onSetSLTP }) => {
  if (positions.length === 0) {
    return (
      <Box sx={{
        bgcolor: 'var(--bg-secondary)', borderRadius: '10px',
        p: 3, textAlign: 'center',
      }}>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          暂无持仓
        </Typography>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 11, mt: 0.5 }}>
          请在下方面板开仓
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography sx={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, mb: 1, px: 0.5 }}>
        持仓 ({positions.length})
      </Typography>
      {positions.map(pos => (
        <PositionRow
          key={pos.id}
          position={pos}
          onClose={() => onClose(pos.id)}
          onSetSLTP={() => onSetSLTP(pos.id)}
        />
      ))}
    </Box>
  );
};

export default CryptoPositionList;
