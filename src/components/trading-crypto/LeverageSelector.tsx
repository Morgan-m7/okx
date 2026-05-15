import React from 'react';
import { Box, Typography, Slider, Button, ToggleButtonGroup, ToggleButton } from '@mui/material';
import type { MarginMode } from '../../types/trading';

interface LeverageSelectorProps {
  value: number;
  marginMode: MarginMode;
  onLeverageChange: (v: number) => void;
  onMarginModeChange: (v: MarginMode) => void;
}

const LeverageSelector: React.FC<LeverageSelectorProps> = ({
  value, marginMode, onLeverageChange, onMarginModeChange,
}) => {
  return (
    <Box sx={{ mb: 2, p: 1.5, bgcolor: 'var(--bg-secondary)', borderRadius: '10px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}>
          杠杆倍数
        </Typography>
        <Typography sx={{ color: 'var(--accent-yellow)', fontWeight: 700, fontSize: 18 }}>
          {value}x
        </Typography>
      </Box>

      <Slider
        value={value}
        min={1}
        max={125}
        step={1}
        onChange={(_, v) => onLeverageChange(v as number)}
        sx={{
          color: 'var(--accent-yellow)',
          height: 4,
          '& .MuiSlider-thumb': { width: 16, height: 16, bgcolor: '#FFD600' },
          '& .MuiSlider-track': { bgcolor: 'var(--accent-yellow)' },
          '& .MuiSlider-rail': { bgcolor: '#2A2D3A' },
        }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        {[1, 3, 5, 10, 20, 50, 100, 125].map(v => (
          <Button key={v} size="small"
            onClick={() => onLeverageChange(v)}
            sx={{
              minWidth: 30, height: 24, fontSize: 10,
              color: value === v ? '#FFD600' : 'var(--text-secondary)',
              bgcolor: value === v ? 'rgba(255,214,0,0.1)' : 'transparent',
              borderRadius: 1,
              '&:hover': { bgcolor: 'rgba(255,214,0,0.15)' },
            }}
          >
            {v}x
          </Button>
        ))}
      </Box>

      <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 11 }}>保证金模式</Typography>
        <ToggleButtonGroup
          value={marginMode}
          exclusive
          onChange={(_, v) => v && onMarginModeChange(v)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              color: 'var(--text-secondary)', borderColor: '#2A2D3A',
              fontSize: 11, px: 1.5, py: 0.3,
              textTransform: 'none',
              '&.Mui-selected': {
                bgcolor: 'rgba(33,150,243,0.15)',
                color: 'var(--accent-blue)',
                borderColor: 'var(--accent-blue)',
              },
            },
          }}
        >
          <ToggleButton value="cross">全仓</ToggleButton>
          <ToggleButton value="isolated">逐仓</ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Box>
  );
};

export default LeverageSelector;
