import React from 'react';
import { Box, Typography, IconButton, TextField, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import type { Position } from '../../types/trading';
import PriceLabel from '../shared/PriceLabel';

interface PositionRowProps {
  position: Position;
  onClose: (id: string) => void;
  onEditSLTP: (id: string) => void;
}

const PositionRow: React.FC<PositionRowProps> = ({ position, onClose, onEditSLTP }) => {
  const isBuy = position.direction === 'buy';
  const pnlPositive = position.profit >= 0;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 2,
        py: 1.5,
        borderBottom: '1px solid var(--border)',
        '&:active': { bgcolor: 'var(--bg-tertiary)' },
      }}
    >
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>
            {position.symbol}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: isBuy ? 'var(--accent-green)' : 'var(--accent-red)',
              fontWeight: 600,
              fontSize: 10,
              px: 0.6,
              py: 0.1,
              borderRadius: '3px',
              bgcolor: isBuy ? 'rgba(0,200,83,0.15)' : 'rgba(255,23,68,0.15)',
            }}
          >
            {isBuy ? 'BUY' : 'SELL'}
          </Typography>
          {position.martingaleLayer > 0 && (
            <Typography variant="caption" sx={{ color: 'var(--accent-yellow)', fontSize: 9 }}>
              L{position.martingaleLayer}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mt: 0.3 }}>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
            手数: {position.volume.toFixed(2)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>
            开仓: {position.openPrice.toFixed(5)}
          </Typography>
        </Box>
        {position.sl && (
          <Typography variant="caption" sx={{ color: 'var(--accent-red)', fontSize: 9 }}>
            SL: {position.sl.toFixed(5)}
          </Typography>
        )}
        {position.tp && (
          <Typography variant="caption" sx={{ color: 'var(--accent-green)', fontSize: 9, ml: 1 }}>
            TP: {position.tp.toFixed(5)}
          </Typography>
        )}
      </Box>

      <Box sx={{ textAlign: 'right', mr: 1 }}>
        <PriceLabel value={position.profit} showSign variant="price" prefix="$" digits={2} />
        <Typography
          variant="caption"
          sx={{
            color: pnlPositive ? 'var(--accent-green)' : 'var(--accent-red)',
            fontSize: 10,
            display: 'block',
          }}
        >
          {pnlPositive ? '▲' : '▼'} {Math.abs(position.pips).toFixed(1)} pips
        </Typography>
      </Box>

      <IconButton size="small" onClick={() => onEditSLTP(position.id)} sx={{ color: 'var(--text-secondary)' }}>
        <EditIcon fontSize="small" />
      </IconButton>
      <IconButton size="small" onClick={() => onClose(position.id)} sx={{ color: 'var(--accent-red)' }}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};

export default PositionRow;
