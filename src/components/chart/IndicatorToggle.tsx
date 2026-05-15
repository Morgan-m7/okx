import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';

interface IndicatorToggleProps {
  activeIndicators: string[];
  onToggle: (indicator: string) => void;
}

const INDICATORS = [
  { id: 'MA', label: 'MA', color: '#FFD600' },
  { id: 'MACD', label: 'MACD', color: '#2196F3' },
  { id: 'RSI', label: 'RSI', color: '#E040FB' },
  { id: 'BOLL', label: 'BOLL', color: '#4CAF50' },
];

const IndicatorToggle: React.FC<IndicatorToggleProps> = ({ activeIndicators, onToggle }) => {
  const handleChange = (_: React.MouseEvent, newVal: string[]) => {
    // handled via onToggle per button
  };

  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
      {INDICATORS.map((ind) => {
        const isActive = activeIndicators.includes(ind.id);
        return (
          <Box
            key={ind.id}
            onClick={() => onToggle(ind.id)}
            sx={{
              px: 1.2,
              py: 0.3,
              borderRadius: '6px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              bgcolor: isActive ? ind.color + '33' : 'var(--bg-tertiary)',
              color: isActive ? ind.color : 'var(--text-secondary)',
              border: isActive ? `1px solid ${ind.color}66` : '1px solid transparent',
              transition: 'all 0.2s',
              userSelect: 'none',
            }}
          >
            {ind.label}
          </Box>
        );
      })}
    </Box>
  );
};

export default IndicatorToggle;
