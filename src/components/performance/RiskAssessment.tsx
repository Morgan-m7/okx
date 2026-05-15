import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

interface RiskAssessmentProps {
  maxDrawdown: number;
  currentDrawdown: number;
  leverageUsed: number;
  volatility: number;
  varEstimate: number;
}

const RiskLevel: React.FC<{ label: string; value: string; level: 'low' | 'medium' | 'high' }> = ({ label, value, level }) => {
  const colors = { low: 'var(--accent-green)', medium: 'var(--accent-yellow)', high: 'var(--accent-red)' };
  const labels = { low: '低', medium: '中', high: '高' };

  return (
    <Paper sx={{ p: 1.5, bgcolor: 'var(--bg-tertiary)', borderRadius: '8px', flex: 1, minWidth: 'calc(50% - 8px)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: 10 }}>{label}</Typography>
        <Typography variant="caption" sx={{ color: colors[level], fontWeight: 600, fontSize: 10, px: 0.5, py: 0.1, borderRadius: '3px', bgcolor: `${colors[level]}22` }}>
          {labels[level]}
        </Typography>
      </Box>
      <Typography variant="body2" className="font-mono" sx={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 16, mt: 0.3 }}>{value}</Typography>
    </Paper>
  );
};

const RiskAssessment: React.FC<RiskAssessmentProps> = ({ maxDrawdown, currentDrawdown, leverageUsed, volatility, varEstimate }) => {
  const ddLevel = maxDrawdown > 20 ? 'high' : maxDrawdown > 10 ? 'medium' : 'low';
  const levLevel = leverageUsed > 50 ? 'high' : leverageUsed > 20 ? 'medium' : 'low';
  const volLevel = volatility > 30 ? 'high' : volatility > 15 ? 'medium' : 'low';

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontWeight: 600, mb: 1.5, fontSize: 14 }}>风险评估</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        <RiskLevel label="最大回撤" value={`${maxDrawdown.toFixed(1)}%`} level={ddLevel} />
        <RiskLevel label="杠杆使用率" value={`${leverageUsed.toFixed(0)}%`} level={levLevel} />
        <RiskLevel label="波动率" value={`${volatility.toFixed(1)}%`} level={volLevel} />
        <RiskLevel label="VaR (95%)" value={`$${varEstimate.toFixed(0)}`} level={volLevel} />
      </Box>
    </Box>
  );
};

export default RiskAssessment;
