import React, { useState } from 'react';
import { Box, Typography, Collapse, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { StrategyFamily, StrategyConfig } from '../../types/strategy';
import StrategyCard from './StrategyCard';

interface StrategyFamilyPanelProps {
  family: StrategyFamily;
  label: string;
  icon: string;
  strategies: StrategyConfig[];
  onConfigure: (strategy: StrategyConfig) => void;
  onToggle: (id: string) => void;
  defaultExpanded?: boolean;
  warning?: string;
}

const FAMILY_COLORS: Record<StrategyFamily, string> = {
  'trend-following': '#2196F3',
  'martingale': '#FFD600',
  'mean-reversion': '#E040FB',
};

const StrategyFamilyPanel: React.FC<StrategyFamilyPanelProps> = ({
  family,
  label,
  icon,
  strategies,
  onConfigure,
  onToggle,
  defaultExpanded = false,
  warning,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const color = FAMILY_COLORS[family];

  return (
    <Box sx={{ mb: 1, bgcolor: 'var(--bg-secondary)', borderRadius: '10px', overflow: 'hidden' }}>
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1.5,
          cursor: 'pointer',
          borderLeft: `3px solid ${color}`,
        }}
      >
        <Typography variant="body2" sx={{ mr: 1 }}>{icon}</Typography>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>
            {label}
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: 11 }}>
            {strategies.length} 个策略
          </Typography>
        </Box>
        {warning && (
          <Typography variant="caption" sx={{ color: 'var(--accent-yellow)', fontSize: 10, mr: 1 }}>
            {warning}
          </Typography>
        )}
        <IconButton size="small" sx={{ color: 'var(--text-secondary)' }}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        {strategies.map((strategy) => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            onConfigure={onConfigure}
            onToggle={onToggle}
          />
        ))}
      </Collapse>
    </Box>
  );
};

export default StrategyFamilyPanel;
