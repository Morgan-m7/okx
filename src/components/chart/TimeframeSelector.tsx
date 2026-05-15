import React from 'react';
import { Box, Chip } from '@mui/material';
import { TIMEFRAMES, TIMEFRAME_NAMES } from '../../constants/timeframes';
import type { Timeframe } from '../../types/market';

interface TimeframeSelectorProps {
  selected: Timeframe;
  onChange: (tf: Timeframe) => void;
}

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({ selected, onChange }) => {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, overflow: 'auto', py: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}>
      {TIMEFRAMES.map((tf) => (
        <Chip
          key={tf}
          label={tf}
          size="small"
          onClick={() => onChange(tf)}
          sx={{
            bgcolor: selected === tf ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
            color: selected === tf ? '#fff' : 'var(--text-secondary)',
            fontWeight: selected === tf ? 600 : 400,
            fontSize: 11,
            height: 28,
            borderRadius: '6px',
            '&:hover': { bgcolor: selected === tf ? 'var(--accent-blue)' : 'var(--bg-tertiary)' },
            flexShrink: 0,
          }}
        />
      ))}
    </Box>
  );
};

export default TimeframeSelector;
