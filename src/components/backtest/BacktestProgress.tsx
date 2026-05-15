import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';

interface BacktestProgressProps {
  isRunning: boolean;
  progress: number;
  currentStep: number;
  totalSteps: number;
}

const BacktestProgress: React.FC<BacktestProgressProps> = ({
  isRunning,
  progress,
  currentStep,
  totalSteps,
}) => {
  if (!isRunning) return null;

  return (
    <Box sx={{ bgcolor: 'var(--bg-secondary)', borderRadius: '10px', p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontSize: 13 }}>
          回测进度
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--accent-blue)', fontSize: 12 }}>
          {progress}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: 'var(--bg-tertiary)',
          '& .MuiLinearProgress-bar': { bgcolor: 'var(--accent-blue)' },
        }}
      />
      <Typography variant="caption" sx={{ color: 'var(--text-secondary)', mt: 0.5, display: 'block' }}>
        处理中: {currentStep}/{totalSteps} K线
      </Typography>
    </Box>
  );
};

export default BacktestProgress;
