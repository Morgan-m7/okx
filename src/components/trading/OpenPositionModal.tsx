import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  TextField,
  Typography,
  Box,
  Slider,
  InputAdornment,
} from '@mui/material';
import { SYMBOL_DIGITS } from '../../constants/symbols';
import { useMarketStore } from '../../stores/marketStore';
import type { SymbolPair, Direction } from '../../types';

interface OpenPositionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (params: {
    symbol: SymbolPair;
    direction: Direction;
    volume: number;
    sl?: number;
    tp?: number;
    strategyId?: string;
  }) => void;
}

const OpenPositionModal: React.FC<OpenPositionModalProps> = ({ open, onClose, onConfirm }) => {
  const activeSymbols = useMarketStore((s) => s.activeSymbols);
  const symbols = activeSymbols.length > 0 ? activeSymbols : ['EUR/USD', 'GBP/USD', 'USD/JPY'];
  const [symbol, setSymbol] = useState<SymbolPair>('EUR/USD');
  const [direction, setDirection] = useState<Direction>('buy');
  const [volume, setVolume] = useState(0.01);
  const [sl, setSl] = useState<string>('');
  const [tp, setTp] = useState<string>('');

  const handleConfirm = () => {
    onConfirm({
      symbol,
      direction,
      volume,
      sl: sl ? parseFloat(sl) : undefined,
      tp: tp ? parseFloat(tp) : undefined,
    });
    handleReset();
  };

  const handleReset = () => {
    setSymbol('EUR/USD');
    setDirection('buy');
    setVolume(0.01);
    setSl('');
    setTp('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 600 }}>
        开仓
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', mb: 0.5, display: 'block' }}>
            品种
          </Typography>
          <Select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value as SymbolPair)}
            size="small"
            fullWidth
            sx={{ bgcolor: 'var(--bg-tertiary)', color: 'var(--text-primary)', mb: 2 }}
          >
            {symbols.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>

          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', mb: 0.5, display: 'block' }}>
            方向
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              variant={direction === 'buy' ? 'contained' : 'outlined'}
              color="success"
              onClick={() => setDirection('buy')}
              fullWidth
              size="small"
            >
              买入 ▲
            </Button>
            <Button
              variant={direction === 'sell' ? 'contained' : 'outlined'}
              color="error"
              onClick={() => setDirection('sell')}
              fullWidth
              size="small"
            >
              卖出 ▼
            </Button>
          </Box>

          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', mb: 0.5, display: 'block' }}>
            手数: {volume.toFixed(2)}
          </Typography>
          <Slider
            value={volume}
            onChange={(_, val) => setVolume(val as number)}
            min={0.01}
            max={10}
            step={0.01}
            size="small"
            sx={{ mb: 2 }}
          />

          <TextField
            label="止损 (SL)"
            value={sl}
            onChange={(e) => setSl(e.target.value)}
            size="small"
            fullWidth
            sx={{ mb: 1.5, input: { color: 'var(--text-primary)' }, label: { color: 'var(--text-secondary)' } }}
            placeholder="可选"
          />

          <TextField
            label="止盈 (TP)"
            value={tp}
            onChange={(e) => setTp(e.target.value)}
            size="small"
            fullWidth
            sx={{ input: { color: 'var(--text-primary)' }, label: { color: 'var(--text-secondary)' } }}
            placeholder="可选"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onClose} sx={{ color: 'var(--text-secondary)' }}>取消</Button>
        <Button onClick={handleConfirm} variant="contained" color="primary">
          确认开仓
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OpenPositionModal;
