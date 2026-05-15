import React from 'react';
import { Box, Typography } from '@mui/material';
import PositionRow from './PositionRow';
import EmptyState from '../shared/EmptyState';
import type { Position } from '../../types/trading';

interface PositionListProps {
  positions: Position[];
  onClose: (id: string) => void;
  onEditSLTP: (id: string) => void;
}

const PositionList: React.FC<PositionListProps> = ({ positions, onClose, onEditSLTP }) => {
  if (positions.length === 0) {
    return (
      <EmptyState
        icon="📭"
        title="暂无持仓"
        description="点击下方 [+开仓] 按钮开始交易"
      />
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1 }}>
        <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13 }}>
          持仓 ({positions.length})
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: 11 }}>
          浮动盈亏
        </Typography>
      </Box>
      {positions.map((pos) => (
        <PositionRow
          key={pos.id}
          position={pos}
          onClose={onClose}
          onEditSLTP={onEditSLTP}
        />
      ))}
    </Box>
  );
};

export default PositionList;
